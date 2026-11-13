import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, handle } from '../src/handler.js';

let sqliteAvailable = true;
let createDb;
try { ({ createDb } = await import('./d1shim.js')); } catch { sqliteAvailable = false; }

/** Calls the server the way a browser would. */
const call = (env) => async (method, path, body) => {
  const res = await handle(new Request(`http://test${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }), env);
  return { status: res.status, body: await res.json() };
};

describe.skipIf(!sqliteAvailable)('the game server', () => {
  let env;
  let api;
  beforeEach(() => { env = { DB: createDb() }; api = call(env); });

  const startGame = async (exp = false) => {
    const host = (await api('POST', '/api/rooms', { exp })).body;
    const guest = (await api('POST', `/api/rooms/${host.code}/join`)).body;
    const view = (who) => api('GET', `/api/rooms/${host.code}?token=${who.token}`).then((r) => r.body);
    const act = (who, action, baseRev) => api('POST', `/api/rooms/${host.code}/action`, { token: who.token, baseRev, action }).then((r) => r.body);
    return { host, guest, view, act, code: host.code };
  };
  const editState = (code, fn) => {
    const row = env.DB.sqlite.prepare('SELECT state FROM rooms WHERE code = ?').get(code);
    const S = JSON.parse(row.state);
    fn(S);
    env.DB.sqlite.prepare('UPDATE rooms SET state = ? WHERE code = ?').run(JSON.stringify(S), code);
  };

  describe('creating and joining', () => {
    it('creates a game under a 5-digit code and seats the host first', async () => {
      const { status, body } = await api('POST', '/api/rooms', { exp: false });
      expect(status).toBe(200);
      expect(body.code).toMatch(/^\d{5}$/);
      expect(body.seat).toBe(0);
      expect(body.token.length).toBeGreaterThan(10);
    });

    it('lets a second player join, and nobody else', async () => {
      const { code } = await startGame();
      const third = await api('POST', `/api/rooms/${code}/join`);
      expect(third.status).toBe(409);
      expect(third.body.error.reason).toBe('full');
    });

    it('says when a code does not exist', async () => {
      const res = await api('POST', '/api/rooms/12345/join');
      expect(res.status).toBe(404);
      expect(res.body.error.reason).toBe('notfound');
    });

    it('shows the host whether anyone has joined yet', async () => {
      const host = (await api('POST', '/api/rooms', {})).body;
      const before = (await api('GET', `/api/rooms/${host.code}?token=${host.token}`)).body;
      expect(before.seated).toBe(false);
      await api('POST', `/api/rooms/${host.code}/join`);
      const after = (await api('GET', `/api/rooms/${host.code}?token=${host.token}`)).body;
      expect(after.seated).toBe(true);
    });

    it('refuses to show a game to someone who is not in it', async () => {
      const { code } = await startGame();
      expect((await api('GET', `/api/rooms/${code}`)).status).toBe(403);
      expect((await api('GET', `/api/rooms/${code}?token=wrong`)).status).toBe(403);
    });

    it('lets the host cancel a game nobody has joined, and no one else', async () => {
      const host = (await api('POST', '/api/rooms', {})).body;
      expect((await api('DELETE', `/api/rooms/${host.code}`, { token: 'nope' })).status).toBe(403);
      expect((await api('DELETE', `/api/rooms/${host.code}`, { token: host.token })).status).toBe(200);
      expect((await api('POST', `/api/rooms/${host.code}/join`)).status).toBe(404);
    });

    it('refuses to cancel once someone has joined', async () => {
      const { host, code } = await startGame();
      expect((await api('DELETE', `/api/rooms/${code}`, { token: host.token })).body.error.reason).toBe('started');
    });
  });

  describe('taking turns', () => {
    it('lets only the host choose who goes first', async () => {
      const { host, guest, act } = await startGame();
      const refused = await act(guest, { type: 'chooseFirst', player: 1 }, 0);
      expect(refused.ok).toBe(false);
      expect(refused.reason).toBe('not-your-turn');
      const ok = await act(host, { type: 'chooseFirst', player: 1 }, 0);
      expect(ok.ok).toBe(true);
      expect(ok.rev).toBe(1);
      expect(ok.S.cur).toBe(1);
      expect(ok.S.players[0].priv).toBe(1);
    });

    it('lets only the player whose turn it is act', async () => {
      const { host, guest, act } = await startGame();
      await act(host, { type: 'chooseFirst', player: 0 }, 0);
      const picked = await act(host, { type: 'tok', i: 12 }, 1);
      expect(picked.ok).toBe(true);
      const wrong = await act(guest, { type: 'tok', i: 7 }, picked.rev);
      expect(wrong.ok).toBe(false);
      expect(wrong.reason).toBe('not-your-turn');
    });

    it('refuses an action that changes nothing', async () => {
      const { host, act } = await startGame();
      const a = await act(host, { type: 'chooseFirst', player: 0 }, 0);
      const nothing = await act(host, { type: 'take' }, a.rev);
      expect(nothing.ok).toBe(false);
      expect(nothing.reason).toBe('illegal');
      expect((await act(host, { type: 'buy' }, a.rev)).reason).toBe('illegal');
    });

    it('refuses a move that breaks a rule even if the browser sent it', async () => {
      const { host, act, code } = await startGame();
      const a = await act(host, { type: 'chooseFirst', player: 0 }, 0);
      editState(code, (S) => { S.board[12] = 'gold'; S.board[7] = 'red'; });
      // gold is never taken as an ordinary token, so picking it for a take is refused
      const goldTake = await act(host, { type: 'tok', i: 12 }, a.rev);
      expect(goldTake.ok).toBe(true); // choosing a gold token starts a reserve, it is not a take
      const take = await act(host, { type: 'take' }, goldTake.rev);
      expect(take.ok).toBe(false);
      expect(take.S.players[0].tok.gold).toBe(0);
    });

    it('refuses a move built on an old version of the game', async () => {
      const { host, act } = await startGame();
      await act(host, { type: 'chooseFirst', player: 0 }, 0);
      const stale = await act(host, { type: 'tok', i: 12 }, 0);
      expect(stale.ok).toBe(false);
      expect(stale.reason).toBe('stale');
      expect(stale.rev).toBe(1);
    });

    it('refuses nonsense and the new-game action', async () => {
      const { host, act } = await startGame();
      expect((await api('POST', `/api/rooms/${host.code}/action`, { token: host.token, baseRev: 0, action: { type: 'new', exp: true, seed: 1 } })).status).toBe(400);
      expect((await api('POST', `/api/rooms/${host.code}/action`, { token: host.token, baseRev: 0, action: 'x' })).status).toBe(400);
      expect((await act(host, { type: 'tok', i: 9999 }, 0)).ok).toBe(false);
    });

    it('keeps a log of every stored action', async () => {
      const { host, act, code } = await startGame();
      const a = await act(host, { type: 'chooseFirst', player: 0 }, 0);
      await act(host, { type: 'tok', i: 12 }, a.rev);
      const log = env.DB.sqlite.prepare('SELECT rev, seat FROM moves WHERE room = ? ORDER BY rev').all(code);
      expect(log.map((m) => [m.rev, m.seat])).toEqual([[1, 0], [2, 0]]);
    });

    it('ends the game when a player resigns, on their own turn or not', async () => {
      const { host, guest, act } = await startGame();
      const a = await act(host, { type: 'chooseFirst', player: 0 }, 0);
      const res = await act(guest, { type: 'resign', player: 0 }, a.rev); // the guest cannot resign the host
      expect(res.ok).toBe(true);
      expect(res.S.over).toBe('Player 1');
      expect(res.S.resigned).toBe(1);
      expect((await act(host, { type: 'tok', i: 12 }, res.rev)).reason).toBe('over');
    });
  });

  describe('hidden information', () => {
    it("never sends a player the other player's reserved cards", async () => {
      const { host, guest, view, code } = await startGame();
      editState(code, (S) => { S.players[0].res = [{ id: 'secret-1', level: 2, cost: { red: 3 }, pts: 4, crowns: 1, bonus: 'blue' }]; });
      const mine = await view(host);
      expect(mine.S.players[0].res[0].id).toBe('secret-1');
      const theirs = await view(guest);
      expect(theirs.S.players[0].res).toHaveLength(1);
      expect(theirs.S.players[0].res[0]).toEqual({ id: 'hidden-0', level: 2, hidden: true });
      expect(JSON.stringify(theirs)).not.toContain('secret-1');
    });

    it('never sends deck order, bag contents or the random state to anyone', async () => {
      const { host, view } = await startGame(true);
      const v = await view(host);
      expect(v.S.decks.flat().every((c) => c === null)).toBe(true);
      expect(v.S.cdeck.every((c) => c === null)).toBe(true);
      expect(v.S.rdeck.every((c) => c === null)).toBe(true);
      expect(v.S.bag.every((c) => c === null)).toBe(true);
      expect(v.S.rng).toBe(0);
      expect(v.S.decks[0].length).toBeGreaterThan(0);
    });

    it('hides the cards a player is looking at from the other player', async () => {
      const { host, guest, view, code } = await startGame();
      editState(code, (S) => { S.cur = 0; S.pending = { type: 'peek', l: 0, cards: [{ id: 'p1', level: 1 }, { id: 'p2', level: 1 }] }; });
      expect((await view(host)).S.pending.cards[0].id).toBe('p1');
      expect((await view(guest)).S.pending.cards).toEqual([null, null]);
    });

    it('shows the face-up cards and the board to both players', async () => {
      const { host, guest, view } = await startGame();
      const [a, b] = [await view(host), await view(guest)];
      expect(a.S.pyr).toEqual(b.S.pyr);
      expect(a.S.board).toEqual(b.S.board);
    });
  });

  describe('quick match', () => {
    it('keeps the first player waiting, then pairs them with the second', async () => {
      const a = (await api('POST', '/api/quick')).body.ticket;
      expect((await api('GET', `/api/quick/${a}`)).body.waiting).toBe(true);
      const b = (await api('POST', '/api/quick')).body.ticket;
      const ra = (await api('GET', `/api/quick/${a}`)).body;
      const rb = (await api('GET', `/api/quick/${b}`)).body;
      expect(ra.code).toBe(rb.code);
      expect([ra.seat, rb.seat]).toEqual([0, 1]);
      expect(ra.token).not.toBe(rb.token);
      const view = (await api('GET', `/api/rooms/${ra.code}?token=${rb.token}`)).body;
      expect(view.exp).toBe(false);
      expect(view.seated).toBe(true);
    });

    it('uses each ticket once', async () => {
      const a = (await api('POST', '/api/quick')).body.ticket;
      await api('POST', '/api/quick');
      expect((await api('GET', `/api/quick/${a}`)).body.code).toBeTruthy();
      expect((await api('GET', `/api/quick/${a}`)).body.gone).toBe(true);
    });

    it('does not pair someone who cancelled', async () => {
      const a = (await api('POST', '/api/quick')).body.ticket;
      await api('DELETE', `/api/quick/${a}`);
      const b = (await api('POST', '/api/quick')).body.ticket;
      expect((await api('GET', `/api/quick/${b}`)).body.waiting).toBe(true);
    });

    it('does not pair someone who has been waiting too long', async () => {
      const a = (await api('POST', '/api/quick')).body.ticket;
      env.DB.sqlite.prepare('UPDATE queue SET at = ? WHERE ticket = ?').run(Date.now() - 80_000, a);
      const b = (await api('POST', '/api/quick')).body.ticket;
      expect((await api('GET', `/api/quick/${b}`)).body.waiting).toBe(true);
    });
  });

  describe('the weekly cleanup', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const age = (code, days) => env.DB.sqlite.prepare('UPDATE rooms SET last_move = ? WHERE code = ?').run(Date.now() - days * DAY, code);

    it('deletes games idle for more than seven days, with their moves, and keeps the rest', async () => {
      const old = await startGame();
      const fresh = await startGame();
      await old.act(old.host, { type: 'chooseFirst', player: 0 }, 0);
      age(old.code, 7.1);
      age(fresh.code, 6.9);
      const result = await cleanup(env);
      expect(result.rooms).toBe(1);
      expect((await api('GET', `/api/rooms/${old.code}?token=${old.host.token}`)).status).toBe(404);
      expect((await api('GET', `/api/rooms/${fresh.code}?token=${fresh.host.token}`)).status).toBe(200);
      expect(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM moves WHERE room = ?').get(old.code).n).toBe(0);
    });

    it('frees the code so a new game can use it', async () => {
      const old = await startGame();
      age(old.code, 8);
      await cleanup(env);
      expect(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM rooms WHERE code = ?').get(old.code).n).toBe(0);
    });

    it('also clears quick match tickets nobody collected', async () => {
      const a = (await api('POST', '/api/quick')).body.ticket;
      env.DB.sqlite.prepare('UPDATE queue SET at = ? WHERE ticket = ?').run(Date.now() - 20 * 60 * 1000, a);
      expect((await cleanup(env)).tickets).toBe(1);
    });
  });
});
