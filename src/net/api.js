/*
 * The browser's connection to the game server (the Worker in /worker). Every function returns plain
 * data and throws an Error with a `reason` when the server refuses. A tab remembers its seat in each
 * game in sessionStorage, so two tabs of one browser can be two different players.
 */
const SEAT = (code) => `sd:seat:${code}`;

const readSeat = (code) => {
  try { return JSON.parse(sessionStorage.getItem(SEAT(code))); } catch { return null; }
};
const saveSeat = (code, seat, token) => {
  try { sessionStorage.setItem(SEAT(code), JSON.stringify({ seat, token })); } catch { /* ignore */ }
};

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.ok === false) throw Object.assign(new Error(data.error?.message || 'The server could not be reached.'), { reason: data.error?.reason || 'network' });
  if (data.error) throw Object.assign(new Error(data.error.message), { reason: data.error.reason, names: data.error.names });
  return data;
}

const NAME = 'sd:name';
/** The name this browser last played under, so it does not have to be typed again. */
export const savedName = () => { try { return localStorage.getItem(NAME) || ''; } catch { return ''; } };
export const rememberName = (n) => { try { if (n) localStorage.setItem(NAME, n); } catch { /* ignore */ } };

export const api = {
  /** Start an online game and take the first seat. */
  async createRoom({ exp, source, name }) {
    rememberName(name);
    const { code, seat, token } = await request('POST', '/rooms', { exp, source, name });
    saveSeat(code, seat, token);
    return { code, seat };
  },

  /** Join with a code. Fails with notfound, taken (name in use) or full; a full error carries the two names. */
  async joinRoom(code, name) {
    const { seat, token } = await request('POST', `/rooms/${code}/join`, { name });
    rememberName(name);
    saveSeat(code, seat, token);
    return { code, seat };
  },

  /** Take over one of the two seats of a full game, for a player who lost theirs. */
  async claimSeat(code, seat) {
    const res = await request('POST', `/rooms/${code}/claim`, { seat });
    saveSeat(code, res.seat, res.token);
    return { code, seat: res.seat };
  },

  /** The game as this tab's player may see it, null when it no longer exists, or { replaced } when someone else took the seat. */
  async getRoom(code) {
    const mine = readSeat(code);
    if (!mine) return null;
    try { return await request('GET', `/rooms/${code}?token=${mine.token}`); } catch (e) {
      if (e.reason === 'notfound') return null;
      if (e.reason === 'forbidden') return { replaced: true };
      throw e;
    }
  },

  /** Send an action. Returns the server's answer, which always carries the latest game. */
  async sendAction(code, baseRev, action) {
    const mine = readSeat(code);
    return request('POST', `/rooms/${code}/action`, { token: mine?.token, baseRev, action });
  },

  async deleteRoom(code) {
    const mine = readSeat(code);
    try { await request('DELETE', `/rooms/${code}`, { token: mine?.token }); } catch { /* it may already be gone */ }
    try { sessionStorage.removeItem(SEAT(code)); } catch { /* ignore */ }
  },

  /** Quick match: join the waiting line. Returns a ticket to poll. */
  async quickJoin(name) {
    rememberName(name);
    return (await request('POST', '/quick', { name })).ticket;
  },

  /** Has this ticket been paired yet? */
  async quickStatus(ticket) {
    const res = await request('GET', `/quick/${ticket}`);
    if (!res.code) return null;
    saveSeat(res.code, res.seat, res.token);
    return { code: res.code, seat: res.seat };
  },

  async quickLeave(ticket) {
    try { await request('DELETE', `/quick/${ticket}`); } catch { /* ignore */ }
  },
};
