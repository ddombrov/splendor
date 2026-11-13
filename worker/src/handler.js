/*
 * The game server. It owns every game: browsers send ACTIONS, this runs the same rules engine the
 * browser uses, and only legal results are stored. Each player is sent a view with the other
 * player's hidden information removed.
 *
 * It uses only standard web APIs plus a D1-style database (prepare, bind, run, first, all), so it
 * runs on Cloudflare and in tests.
 */
import { createGame, reduce } from '../../src/engine/engine.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const QUEUE_WAIT = 70 * 1000; // a waiting ticket older than this is dropped

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const fail = (status, reason, message) => json({ error: { reason, message } }, status);
const hex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const nulls = (list) => list.map(() => null);
const sameGame = (a, b) => JSON.stringify({ ...a, toast: null }) === JSON.stringify({ ...b, toast: null });

/** The game as one player may see it: no opponent reserve, no deck or bag contents, no random state. */
export function viewFor(S, seat) {
  const V = JSON.parse(JSON.stringify(S));
  V.rng = 0;
  V.bag = nulls(V.bag);
  V.decks = V.decks.map(nulls);
  V.cdeck = nulls(V.cdeck);
  V.rdeck = nulls(V.rdeck);
  V.players[1 - seat].res = V.players[1 - seat].res.map((c, i) => ({ id: `hidden-${i}`, level: c.level, hidden: true }));
  if (V.pending?.type === 'peek' && V.cur !== seat) V.pending.cards = nulls(V.pending.cards);
  return V;
}

const roomView = (row, seat) => ({
  code: row.code,
  rev: row.rev,
  exp: !!row.exp,
  source: row.source,
  S: viewFor(JSON.parse(row.state), seat),
  active: [row.active0, row.active1],
  seated: !!row.seat1,
});

const getRoom = (db, code) => db.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first();

const seatOf = (row, token) => (token && row.seat0 === token ? 0 : token && row.seat1 && row.seat1 === token ? 1 : null);

/** Makes a game under a fresh 5-digit code. */
async function createRoom(db, { exp, source, paired }) {
  for (let tries = 0; tries < 60; tries++) {
    const code = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    const now = Date.now();
    const tokens = [hex(16), paired ? hex(16) : null];
    try {
      await db.prepare('INSERT INTO rooms (code, exp, source, rev, state, seat0, seat1, active0, active1, created, last_move) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)')
        .bind(code, exp ? 1 : 0, source, JSON.stringify(createGame(!!exp, newSeed(), null)), tokens[0], tokens[1], now, paired ? now : 0, now, now).run();
      return { code, tokens };
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e?.message ?? e))) throw e;
    }
  }
  throw new Error('no free game code');
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

export async function handle(request, env) {
  const db = env.DB;
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  if (parts[0] !== 'api') return fail(404, 'notfound', 'Not found.');
  const method = request.method;

  // ---------- rooms ----------
  if (parts[1] === 'rooms') {
    if (method === 'POST' && parts.length === 2) {
      const body = await readJson(request);
      const source = body.source === 'official' ? 'official' : 'random';
      const { code, tokens } = await createRoom(db, { exp: !!body.exp, source, paired: false });
      return json({ code, seat: 0, token: tokens[0] });
    }

    const code = parts[2];
    if (!/^\d{5}$/.test(code || '')) return fail(404, 'notfound', 'No game has that code.');

    if (method === 'POST' && parts[3] === 'join') {
      const row = await getRoom(db, code);
      if (!row) return fail(404, 'notfound', 'No game has that code.');
      const token = hex(16);
      const res = await db.prepare('UPDATE rooms SET seat1 = ?, active1 = ? WHERE code = ? AND seat1 IS NULL').bind(token, Date.now(), code).run();
      if (res.meta.changes !== 1) return fail(409, 'full', 'That game is already full.');
      return json({ code, seat: 1, token });
    }

    if (method === 'GET' && parts.length === 3) {
      const row = await getRoom(db, code);
      if (!row) return fail(404, 'notfound', 'That game no longer exists.');
      const seat = seatOf(row, url.searchParams.get('token'));
      if (seat == null) return fail(403, 'forbidden', 'You are not in that game.');
      await db.prepare(`UPDATE rooms SET active${seat} = ? WHERE code = ?`).bind(Date.now(), code).run();
      return json(roomView({ ...row, [`active${seat}`]: Date.now() }, seat));
    }

    if (method === 'POST' && parts[3] === 'action') {
      const body = await readJson(request);
      const row = await getRoom(db, code);
      if (!row) return fail(404, 'notfound', 'That game no longer exists.');
      const seat = seatOf(row, body.token);
      if (seat == null) return fail(403, 'forbidden', 'You are not in that game.');
      const S = JSON.parse(row.state);
      const action = body.action;
      const stale = () => json({ ok: false, reason: 'stale', ...roomView(row, seat) });

      if (typeof action?.type !== 'string' || action.type === 'new') return fail(400, 'bad', 'That is not an action.');
      if (body.baseRev !== row.rev) return stale();
      if (S.over) return json({ ok: false, reason: 'over', ...roomView(row, seat) });

      const mine = S.awaitingFirst ? seat === 0 && action.type === 'chooseFirst' : S.cur === seat;
      const resign = action.type === 'resign';
      if (!mine && !resign) return json({ ok: false, reason: 'not-your-turn', ...roomView(row, seat) });
      const safe = resign ? { type: 'resign', player: seat } : action;

      let next;
      try { next = reduce(S, safe); } catch { return json({ ok: false, reason: 'illegal', ...roomView(row, seat) }); }
      // The engine answers a refused move with a copy that only carries a message, so compare the games
      // without the message: if nothing else changed, the move was not allowed.
      if (sameGame(S, next)) return json({ ok: false, reason: 'illegal', message: next.toast || undefined, ...roomView(row, seat) });

      const now = Date.now();
      const res = await db.prepare(`UPDATE rooms SET state = ?, rev = rev + 1, last_move = ?, active${seat} = ? WHERE code = ? AND rev = ?`)
        .bind(JSON.stringify(next), now, now, code, row.rev).run();
      if (res.meta.changes !== 1) return stale();
      await db.prepare('INSERT INTO moves (room, rev, seat, action, at) VALUES (?, ?, ?, ?, ?)').bind(code, row.rev + 1, seat, JSON.stringify(safe), now).run();
      return json({ ok: true, ...roomView({ ...row, state: JSON.stringify(next), rev: row.rev + 1, [`active${seat}`]: now }, seat) });
    }

    if (method === 'DELETE' && parts.length === 3) {
      const body = await readJson(request);
      const row = await getRoom(db, code);
      if (!row) return json({ ok: true });
      if (seatOf(row, body.token) !== 0) return fail(403, 'forbidden', 'Only the host can cancel a game.');
      if (row.seat1) return fail(409, 'started', 'Someone has already joined.');
      await db.prepare('DELETE FROM rooms WHERE code = ?').bind(code).run();
      return json({ ok: true });
    }
  }

  // ---------- quick match ----------
  if (parts[1] === 'quick') {
    if (method === 'POST' && parts.length === 2) {
      const now = Date.now();
      await db.prepare('DELETE FROM queue WHERE code IS NULL AND at < ?').bind(now - QUEUE_WAIT).run();
      await db.prepare('DELETE FROM queue WHERE code IS NOT NULL AND at < ?').bind(now - 10 * 60 * 1000).run();
      const ticket = hex(8);
      const waiting = await db.prepare('SELECT ticket FROM queue WHERE code IS NULL ORDER BY at LIMIT 1').first();
      // claim the waiting ticket so two newcomers cannot both pair with it
      const claimed = waiting && (await db.prepare("UPDATE queue SET code = 'pending' WHERE ticket = ? AND code IS NULL").bind(waiting.ticket).run()).meta.changes === 1;
      if (claimed) {
        const { code, tokens } = await createRoom(db, { exp: false, source: 'random', paired: true });
        await db.prepare('UPDATE queue SET code = ?, seat = 0, token = ? WHERE ticket = ?').bind(code, tokens[0], waiting.ticket).run();
        await db.prepare('INSERT INTO queue (ticket, at, code, seat, token) VALUES (?, ?, ?, 1, ?)').bind(ticket, now, code, tokens[1]).run();
      } else {
        await db.prepare('INSERT INTO queue (ticket, at) VALUES (?, ?)').bind(ticket, now).run();
      }
      return json({ ticket });
    }
    const ticket = parts[2];
    if (method === 'GET' && ticket) {
      const row = await db.prepare('SELECT * FROM queue WHERE ticket = ?').bind(ticket).first();
      if (!row) return json({ gone: true });
      if (!row.code || row.code === 'pending') return json({ waiting: true });
      await db.prepare('DELETE FROM queue WHERE ticket = ?').bind(ticket).run();
      return json({ code: row.code, seat: row.seat, token: row.token });
    }
    if (method === 'DELETE' && ticket) {
      await db.prepare('DELETE FROM queue WHERE ticket = ? AND code IS NULL').bind(ticket).run();
      return json({ ok: true });
    }
  }

  return fail(404, 'notfound', 'Not found.');
}

/** The weekly job: delete games with no action for seven days, and old quick match tickets. */
export async function cleanup(env, now = Date.now()) {
  const db = env.DB;
  const cutoff = now - WEEK;
  await db.prepare('DELETE FROM moves WHERE room IN (SELECT code FROM rooms WHERE last_move < ?)').bind(cutoff).run();
  const rooms = await db.prepare('DELETE FROM rooms WHERE last_move < ?').bind(cutoff).run();
  const queue = await db.prepare('DELETE FROM queue WHERE at < ?').bind(now - 10 * 60 * 1000).run();
  return { rooms: rooms.meta.changes, tickets: queue.meta.changes };
}
