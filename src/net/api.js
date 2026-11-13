/*
 * The game's "server" interface. Right now it is a LOCAL STAND-IN: rooms live in this browser's
 * localStorage, so two tabs of the same browser can create, join and play each other. Every
 * function is async and returns plain data, so the Cloudflare Worker can replace this file later
 * without the screens changing.
 *
 * Differences from the real server, on purpose: no rule checking on the "server" side, nothing is
 * hidden from the other player's tab, and rooms are not deleted after seven idle days.
 */
import { createGame } from '../engine/engine.js';

const ROOM = (code) => `sd:room:${code}`;
const QUEUE = 'sd:queue';
const RESULT = (id) => `sd:qres:${id}`;
const SEAT = (code) => `sd:seat:${code}`; // sessionStorage: one seat per browser tab

const read = (k, store = localStorage) => {
  try { return JSON.parse(store.getItem(k)); } catch { return null; }
};
const write = (k, v, store = localStorage) => store.setItem(k, JSON.stringify(v));
const token = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];

function freeCode() {
  for (let i = 0; i < 200; i++) {
    const code = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    if (!read(ROOM(code))) return code;
  }
  throw new Error('no free game code');
}

/** What a browser tab needs to remember to come back to a game. */
export const mySeat = (code) => read(SEAT(code), sessionStorage);

function newRoom({ exp, source }) {
  const code = freeCode();
  const room = {
    code, exp, source, rev: 0, status: 'waiting', created: Date.now(),
    seats: [token(), null], active: [Date.now(), 0],
    S: createGame(exp, seed(), null),
  };
  write(ROOM(code), room);
  return room;
}

export const api = {
  /** Start an online game and take the first seat. */
  async createRoom({ exp, source }) {
    const room = newRoom({ exp, source });
    write(SEAT(room.code), { seat: 0, token: room.seats[0] }, sessionStorage);
    return { code: room.code, seat: 0 };
  },

  /** Join with a code. Fails with notfound or full. */
  async joinRoom(code) {
    const room = read(ROOM(code));
    if (!room) throw Object.assign(new Error('No game has that code.'), { reason: 'notfound' });
    if (room.seats[1]) throw Object.assign(new Error('That game is already full.'), { reason: 'full' });
    room.seats[1] = token();
    room.status = 'playing';
    room.active[1] = Date.now();
    write(ROOM(code), room);
    write(SEAT(code), { seat: 1, token: room.seats[1] }, sessionStorage);
    return { code, seat: 1 };
  },

  /** The current room. Also records that this seat is still here. */
  async getRoom(code, seat) {
    const room = read(ROOM(code));
    if (!room) return null;
    if (seat != null) {
      room.active[seat] = Date.now();
      write(ROOM(code), room);
    }
    return room;
  },

  /** Store a new game state. Fails when the other player moved first. */
  async pushState(code, seat, baseRev, S) {
    const room = read(ROOM(code));
    if (!room) throw Object.assign(new Error('That game no longer exists.'), { reason: 'notfound' });
    if (room.rev !== baseRev) return { ok: false, room };
    room.rev += 1;
    room.S = S;
    room.active[seat] = Date.now();
    write(ROOM(code), room);
    return { ok: true, room };
  },

  async deleteRoom(code) {
    localStorage.removeItem(ROOM(code));
    sessionStorage.removeItem(SEAT(code));
  },

  /** Quick match: join the waiting line. Returns a ticket to poll. */
  async quickJoin() {
    const now = Date.now();
    const queue = (read(QUEUE) || []).filter((t) => now - t.t < 70000);
    const id = token();
    const other = queue.shift();
    if (other) {
      const room = newRoom({ exp: false, source: 'random' });
      room.seats[1] = token();
      room.status = 'playing';
      room.active[1] = now;
      write(ROOM(room.code), room);
      write(RESULT(other.id), { code: room.code, seat: 0, token: room.seats[0] });
      write(RESULT(id), { code: room.code, seat: 1, token: room.seats[1] });
      write(QUEUE, queue);
    } else {
      write(QUEUE, [...queue, { id, t: now }]);
    }
    return id;
  },

  /** Has this ticket been paired yet? */
  async quickStatus(id) {
    const res = read(RESULT(id));
    if (!res) return null;
    localStorage.removeItem(RESULT(id));
    write(SEAT(res.code), { seat: res.seat, token: res.token }, sessionStorage);
    return { code: res.code, seat: res.seat };
  },

  async quickLeave(id) {
    write(QUEUE, (read(QUEUE) || []).filter((t) => t.id !== id));
  },
};

/** Called by other tabs: run fn when any room or queue changes. */
export function onRemoteChange(fn) {
  const handler = (e) => { if (e.key && e.key.startsWith('sd:')) fn(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
