import { COLORS, genJewels, genCounterfeiters, baseRoyals, expRoyals } from './data.js';
import { nextRandom, shuffle } from './rng.js';

/*
 * The order tokens are laid out and replenished in: the centre, then up, right, down, left and
 * outward, exactly as the arrows on the wooden board picture show. Numbers are board spaces, 0 to
 * 24 reading left to right, top to bottom.
 */
export const SPIRAL = [12, 7, 8, 13, 18, 17, 16, 11, 6, 1, 2, 3, 4, 9, 14, 19, 24, 23, 22, 21, 20, 15, 10, 5, 0];

/* ---------- selectors ---------- */
export const cur = (S) => S.players[S.cur];
export const opp = (S) => S.players[1 - S.cur];
export const kinds = (S) => (S.exp ? [...COLORS, 'pearl', 'glass'] : [...COLORS, 'pearl']);
export const total = (p) => Object.values(p.tok).reduce((a, b) => a + b, 0);
export const hasAb = (p, ab) => p.cf.some((c) => c.ab === ab);
export const resCap = (p) => (hasAb(p, 'reserve5') ? 5 : 3);
export const limitCount = (p) => total(p) - (hasAb(p, 'nolimit') ? p.tok.glass : 0);
export const roomLeft = (p) => Math.max(0, 10 - limitCount(p));
export const bonuses = (p) => {
  const b = Object.fromEntries(COLORS.map((c) => [c, 0]));
  p.cards.forEach((c) => c.color && (b[c.color] += c.n));
  return b;
};
export const ownedColors = (p) => COLORS.filter((c) => bonuses(p)[c] > 0);
export const pts = (p) => p.cards.reduce((a, c) => a + c.pts, 0) + p.royals.reduce((a, c) => a + c.pts, 0);
export const crowns = (p) => p.cards.reduce((a, c) => a + c.crowns, 0) + p.cf.reduce((a, c) => a + c.crowns, 0);
export const colorPts = (p, c) => p.cards.filter((x) => x.color === c).reduce((a, x) => a + x.pts, 0);
export const selectedCard = (S) => {
  const s = S.selCard;
  if (!s) return null;
  if (s.src === 'pyr') return S.pyr[s.l][s.i];
  if (s.src === 'res') return cur(S).res[s.i];
  if (s.src === 'cf') return S.crow[s.i];
  return null;
};

export function validLine(S, sel) {
  if (sel.length < 1 || sel.length > 3) return false;
  if (sel.some((i) => S.board[i] == null || S.board[i] === 'gold')) return false;
  if (sel.length === 1) return true;
  const ps = sel.map((i) => [Math.floor(i / 5), i % 5]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const d1 = [ps[1][0] - ps[0][0], ps[1][1] - ps[0][1]];
  if (Math.max(Math.abs(d1[0]), Math.abs(d1[1])) !== 1) return false;
  if (sel.length === 3) {
    const d2 = [ps[2][0] - ps[1][0], ps[2][1] - ps[1][1]];
    if (d2[0] !== d1[0] || d2[1] !== d1[1]) return false;
  }
  return true;
}

/**
 * Two picks with exactly one square between them in a line are kept: the player may still be
 * about to pick the token in the middle to make a line of three.
 */
export function gapPair(S, sel) {
  if (sel.length !== 2) return false;
  const [a, b] = sel.map((i) => [Math.floor(i / 5), i % 5]);
  const dr = b[0] - a[0], dc = b[1] - a[1];
  if (Math.max(Math.abs(dr), Math.abs(dc)) !== 2 || ![0, 2].includes(Math.abs(dr)) || ![0, 2].includes(Math.abs(dc))) return false;
  const mid = (a[0] + dr / 2) * 5 + a[1] + dc / 2;
  return S.board[mid] != null && S.board[mid] !== 'gold' && sel.every((i) => S.board[i] != null && S.board[i] !== 'gold');
}

/* Cheapest way for the current player to pay for a card, including counterfeiter discounts. */
export function plan(S, p, card) {
  if (card.bonus === 'wild' && !ownedColors(p).length) return null;
  const b = bonuses(p);
  const K = kinds(S);
  const base = {};
  K.forEach((k) => (base[k] = Math.max(0, (card.cost[k] || 0) - (COLORS.includes(k) ? b[k] : 0))));
  const abs = p.cf.filter((c) => !S.used[c.id] && ['red2', 'any1', 'any3', 'pearl1'].includes(c.ab));
  const lists = abs.map((c) => (c.ab === 'red2' || c.ab === 'any1' ? [0, 1, 2] : c.ab === 'any3' ? [0, 2] : [0, 1]));
  const combos = lists.reduce((acc, l) => acc.flatMap((x) => l.map((n) => [...x, n])), [[]]);
  const biggest = (need) => COLORS.reduce((m, k) => (need[k] > need[m] ? k : m), COLORS[0]);
  let best = null;
  for (const combo of combos) {
    const need = { ...base };
    let g = 0;
    const ids = [];
    abs.forEach((c, i) => {
      const n = combo[i];
      if (!n) return;
      g += n;
      ids.push(c.id);
      if (c.ab === 'red2') need[c.rc] = Math.max(0, need[c.rc] - 2 * n);
      if (c.ab === 'pearl1') need.pearl = Math.max(0, need.pearl - 1);
    });
    abs.forEach((c, i) => {
      const n = combo[i];
      if (!n) return;
      if (c.ab === 'any3') {
        const k = biggest(need);
        need[k] = Math.max(0, need[k] - 3);
      }
      if (c.ab === 'any1') {
        for (let t = 0; t < n; t++) {
          const k = biggest(need);
          if (need[k] > 0) need[k]--;
        }
      }
    });
    const glassAvail = p.tok.glass - g;
    if (glassAvail < 0) continue;
    const pay = {};
    let gold = 0;
    for (const k of K) {
      const have = k === 'glass' ? glassAvail : p.tok[k];
      const use = Math.min(have, need[k]);
      pay[k] = use;
      gold += need[k] - use;
    }
    if (gold > p.tok.gold) continue;
    pay.gold = gold;
    const spent = Object.values(pay).reduce((a, v) => a + v, 0) + g;
    const score = [spent, gold, g];
    if (!best || score < best.score) best = { pay, g, ids, score };
  }
  return best;
}

export function endOptions(S) {
  const p = cur(S), o = opp(S), out = [];
  if (!S.exp) return out;
  const un = (ab) => p.cf.find((c) => c.ab === ab && !S.used[c.id]);
  if (un('xturn') && p.tok.glass >= 1 && p.priv >= 1 && !S.extra) out.push({ k: 'xturn', t: 'Extra turn (1 glassware + 1 privilege)' });
  if (un('xsteal') && p.tok.glass >= 1 && p.priv >= 1 && roomLeft(p) > 0 && kinds(S).some((k) => o.tok[k] > 0)) out.push({ k: 'xsteal', t: 'Steal a token (1 glassware + 1 privilege)' });
  const rc = 1 + p.royals.length;
  if (un('royalbuy') && p.tok.glass >= rc && S.royals.length) out.push({ k: 'royalbuy', t: `Take a royal card (${rc} glassware)` });
  if (un('peek') && p.tok.glass >= 2 && p.res.length < resCap(p)) {
    [0, 1, 2].forEach((l) => S.decks[l].length && out.push({ k: `peek${l}`, t: `Peek level ${l + 1} deck (2 glassware)` }));
  }
  return out;
}

/* ---------- state setup ---------- */
/** Replenishing needs tokens in the bag and an empty square to put them on. */
export const canReplenish = (S) => S.bag.length > 0 && S.board.some((c) => c == null);
function fillBoard(S) {
  for (const i of SPIRAL) if (S.board[i] == null && S.bag.length) S.board[i] = S.bag.pop();
}
const log = (S, m) => {
  S.log.unshift(m);
  if (S.log.length > 50) S.log.pop();
};
const mkPlayer = (name) => ({
  name,
  tok: { blue: 0, white: 0, green: 0, black: 0, red: 0, pearl: 0, glass: 0, gold: 0 },
  cards: [], cf: [], res: [], priv: 0, royals: [], r3: false, r6: false,
});

// `first` is 0 or 1 to start with that player, or null to wait until someone is chosen.
export function createGame(exp = false, seed, first = 0) {
  if (!Number.isInteger(seed)) throw new Error('createGame needs an integer seed');
  const gen = { rng: seed >>> 0 };
  const rand = () => nextRandom(gen);
  const bag = shuffle([
    ...COLORS.flatMap((c) => Array(4).fill(c)),
    'pearl', 'pearl', 'gold', 'gold', 'gold',
    ...(exp ? Array(4).fill('glass') : []),
  ], rand);
  const royalPool = shuffle(exp ? [...baseRoyals(), ...expRoyals()] : baseRoyals(), rand);
  const S = {
    exp, rng: 0, board: Array(25).fill(null), bag,
    players: [mkPlayer('Player 1'), mkPlayer('Player 2')], cur: 0,
    decks: [genJewels(1, rand), genJewels(2, rand), genJewels(3, rand)], pyr: [[], [], []],
    cdeck: exp ? genCounterfeiters(rand) : [], crow: [],
    royals: royalPool.splice(0, 4), rdeck: royalPool,
    privBoard: 3, awaitingFirst: false, sel: [], goldSel: null, selCard: null, mode: null, main: false, pending: null,
    queue: [], extra: false, over: null, log: [], used: {}, toast: null,
  };
  fillBoard(S);
  // Level 1 shows 5 cards, level 2 shows 4, level 3 shows 3.
  [5, 4, 3].forEach((n, l) => { for (let i = 0; i < n; i++) S.pyr[l].push(S.decks[l].pop()); });
  if (exp) for (let i = 0; i < 3; i++) S.crow.push(S.cdeck.pop());
  S.rng = gen.rng;
  log(S, `Game started${exp ? ' with the Counterfeiters expansion' : ''}.`);
  if (first === null) { S.awaitingFirst = true; log(S, 'Choose who goes first.'); } else startWith(S, first);
  return S;
}

/* ---------- helpers that mutate a cloned state ---------- */
/** Whoever goes first starts the game, and the other player takes a scroll. */
function startWith(S, player) {
  S.cur = player;
  S.awaitingFirst = false;
  givePriv(S, 1 - player);
  log(S, `${S.players[player].name} goes first. ${S.players[1 - player].name} takes a scroll.`);
}

function givePriv(S, to) {
  if (S.privBoard > 0) { S.privBoard--; S.players[to].priv++; return true; }
  if (S.players[1 - to].priv > 0) { S.players[1 - to].priv--; S.players[to].priv++; return true; }
  return false;
}
function refillPyr(S, l, i) {
  if (S.decks[l].length) S.pyr[l][i] = S.decks[l].pop();
  else S.pyr[l].splice(i, 1);
}
function toBag(S, k, n) { for (let i = 0; i < n; i++) S.bag.push(k); }

function finishMain(S, steps = []) {
  S.main = true; S.mode = null; S.sel = []; S.goldSel = null; S.selCard = null;
  // A player who has already won does not get to use card abilities or claim royals: the game ends at once.
  S.queue = ['win', ...steps, 'royal', 'endabil', 'discard', 'win', 'switch'];
  runQueue(S);
}
function runQueue(S) {
  while (S.queue.length && !S.over) if (!doStep(S, S.queue.shift())) return;
}

function doStep(S, step) {
  const [name, arg] = step.split(':');
  const p = cur(S);
  const wait = (pd) => { S.pending = pd; return false; };
  switch (name) {
    case 'privilege':
      log(S, givePriv(S, S.cur) ? `${p.name} gains a privilege.` : `${p.name} already holds every privilege.`);
      return true;
    case 'extra': S.extra = true; log(S, `${p.name} takes another turn.`); return true;
    case 'match':
      if (hasAb(p, 'matchplus') && S.board.some((c) => c && c !== 'gold')) return wait({ type: 'pick', color: arg, plus: true, left: 2 });
      if (S.board.includes(arg)) return wait({ type: 'pick', color: arg, left: 1 });
      log(S, `No ${arg} token left to match.`);
      return true;
    case 'steal':
      if (roomLeft(p) < 1) { log(S, `${p.name} holds 10 tokens, so the steal is skipped.`); return true; }
      if (kinds(S).some((k) => opp(S).tok[k] > 0)) return wait({ type: 'steal' });
      log(S, 'Opponent has nothing to steal.');
      return true;
    case 'take1': return wait({ type: 'multi', max: 1, rule: 'any', sel: [] });
    case 'rtake3': return wait({ type: 'multi', max: 3, rule: 'any', sel: [] });
    case 'rtake4': return wait({ type: 'multi', max: 4, rule: 'same', sel: [] });
    case 'rgold': {
      const gi = S.board.indexOf('gold');
      if (gi >= 0) { S.board[gi] = null; p.tok.gold++; log(S, `${p.name} takes a gold token.`); }
      return true;
    }
    case 'rbag2':
      for (let i = 0; i < 2 && S.bag.length; i++) {
        const k = S.bag.splice(Math.floor(nextRandom(S) * S.bag.length), 1)[0];
        p.tok[k]++;
        log(S, `${p.name} draws a ${k} token from the bag.`);
      }
      return true;
    case 'rreserve':
    case 'freeReserve':
      if (p.res.length >= resCap(p)) return true;
      return wait({ type: 'freeReserve' });
    case 'rcounter':
      if (S.exp && (S.crow.length || S.cdeck.length)) return wait({ type: 'freeCf' });
      return true;
    case 'royal': {
      const c = crowns(p);
      if (S.royals.length && ((c >= 3 && !p.r3) || (c >= 6 && !p.r6))) {
        if (c >= 3 && !p.r3) p.r3 = true; else p.r6 = true;
        return wait({ type: 'royal' });
      }
      return true;
    }
    case 'endabil':
      if (endOptions(S).length) return wait({ type: 'endabil' });
      return true;
    case 'discard':
      if (limitCount(p) > 10) return wait({ type: 'discard' });
      return true;
    case 'win': {
      const hasR = (ab) => p.royals.some((r) => r.ab === ab);
      if (pts(p) >= 20 || crowns(p) >= 10 || COLORS.some((c) => colorPts(p, c) >= 10) ||
          (hasR('w9c') && COLORS.some((c) => colorPts(p, c) >= 9)) || (hasR('w9k') && crowns(p) >= 9)) {
        S.over = p.name;
      }
      return true;
    }
    case 'switch':
      if (S.extra) S.extra = false; else S.cur = 1 - S.cur;
      S.main = false; S.pending = null; S.used = {}; S.goldSel = null;
      return true;
    default: return true;
  }
}

function takeFromBoard(S, i) {
  const c = S.board[i];
  S.board[i] = null;
  cur(S).tok[c]++;
  return c;
}

function reserveCard(S, s) {
  if (s.src === 'pyr') { const c = S.pyr[s.l][s.i]; refillPyr(S, s.l, s.i); return c; }
  if (s.src === 'deck' && S.decks[s.l].length) return S.decks[s.l].pop();
  return null;
}

function doBuy(S, color) {
  const p = cur(S), s = S.selCard;
  if (S.main || !s) return;
  const card = selectedCard(S);
  if (!card) return;
  const pl = plan(S, p, card);
  if (!pl) return;
  if (card.bonus === 'wild' && !color) {
    const cs = ownedColors(p);
    if (cs.length > 1) { S.pending = { type: 'wild', colors: cs }; return; }
    color = cs[0];
  }
  for (const k of kinds(S)) { p.tok[k] -= pl.pay[k]; toBag(S, k, pl.pay[k]); }
  p.tok.gold -= pl.pay.gold; toBag(S, 'gold', pl.pay.gold);
  p.tok.glass -= pl.g; toBag(S, 'glass', pl.g);
  pl.ids.forEach((id) => (S.used[id] = true));
  if (s.src === 'pyr') refillPyr(S, s.l, s.i);
  else if (s.src === 'res') p.res.splice(s.i, 1);
  else if (S.cdeck.length) S.crow[s.i] = S.cdeck.pop();
  else S.crow.splice(s.i, 1);
  if (card.kind === 'cf') {
    p.cf.push(card);
    log(S, `${p.name} buys a counterfeiter card.`);
    finishMain(S);
    return;
  }
  card.color = card.bonus === 'wild' ? color : card.bonus;
  p.cards.push(card);
  log(S, `${p.name} buys a level ${card.level} card (${card.pts} pts${card.crowns ? `, ${card.crowns} crown` : ''}).`);
  const steps = [];
  if (card.ability === 'match') steps.push(`match:${card.color}`);
  else if (card.ability) steps.push(card.ability);
  finishMain(S, steps);
}

/* ---------- action handlers ---------- */
const handlers = {
  resign(S, { player }) {
    if (player !== 0 && player !== 1) return;
    S.resigned = player;
    S.over = S.players[1 - player].name;
    log(S, `${S.players[player].name} resigned.`);
  },
  // Drops whatever the player has half chosen: tokens, a gold token, a card, or privilege mode.
  cancelAction(S) {
    if (S.main || S.pending) return;
    S.sel = []; S.goldSel = null; S.selCard = null; S.mode = null;
  },
  // Before the main action, a player stuck at ten tokens may return one to the bag.
  giveBack(S, { c }) {
    const p = cur(S);
    if (S.main || S.pending || roomLeft(p) > 0 || !(p.tok[c] > 0)) return;
    p.tok[c]--; S.bag.push(c);
    log(S, `${p.name} returns a ${c} token to the bag.`);
  },
  chooseFirst(S, { player }) {
    if (S.awaitingFirst && (player === 0 || player === 1)) startWith(S, player);
  },
  tok(S, { i }) {
    const p = cur(S), c = S.board[i], pd = S.pending;
    if (c == null) return;
    if (pd) {
      if (pd.type === 'pick' && c !== 'gold') {
        const take = () => { takeFromBoard(S, i); log(S, `${p.name} takes a ${c} token.`); };
        if (pd.plus) {
          if (c === pd.color) {
            take(); pd.left--;
            if (pd.left <= 0 || !S.board.includes(pd.color)) { S.pending = null; runQueue(S); }
          } else if (pd.left === 2) { take(); S.pending = null; runQueue(S); }
        } else if (c === pd.color) { take(); S.pending = null; runQueue(S); }
      } else if (pd.type === 'multi' && c !== 'gold') {
        const k = pd.sel.indexOf(i);
        if (k >= 0) pd.sel.splice(k, 1);
        else if (pd.sel.length < pd.max && (pd.rule === 'any' || !pd.sel.length || S.board[pd.sel[0]] === c)) pd.sel.push(i);
      }
      return;
    }
    if (S.main) return;
    if (S.mode === 'priv2') {
      if (c === 'gold') return;
      if (roomLeft(p) < 1) { S.toast = 'You already hold 10 tokens.'; return; }
      takeFromBoard(S, i); S.mode = null;
      log(S, `${p.name} takes a second token with the privilege bonus.`);
      return;
    }
    if (S.mode === 'priv') {
      if (c === 'gold' || p.priv < 1) return;
      if (roomLeft(p) < 1) { S.toast = 'You already hold 10 tokens.'; return; }
      p.priv--; S.privBoard++;
      takeFromBoard(S, i);
      log(S, `${p.name} spends a privilege to take a ${c} token.`);
      const bonus = S.exp && p.cf.find((x) => x.ab === 'priv2' && !S.used[x.id]);
      if (bonus) { S.used[bonus.id] = true; S.mode = 'priv2'; } else S.mode = null;
      return;
    }
    if (c === 'gold') {
      if (p.res.length >= resCap(p)) { S.toast = `You already hold ${resCap(p)} reserved cards.`; return; }
      if (S.goldSel !== i && roomLeft(p) < 1) { S.toast = 'You already hold 10 tokens.'; return; }
      S.goldSel = S.goldSel === i ? null : i;
      S.sel = [];
      return;
    }
    S.goldSel = null;
    const k = S.sel.indexOf(i);
    if (k >= 0) S.sel.splice(k, 1);
    else {
      if (roomLeft(p) < 1) { S.toast = 'You already hold 10 tokens.'; return; }
      const next = [...S.sel, i];
      if (next.length > roomLeft(p) && validLine(S, next)) { S.toast = `You can only take ${roomLeft(p)} more token${roomLeft(p) === 1 ? '' : 's'} (10 token limit).`; return; }
      // If the new pick does not fit, let go of the oldest picks until what is left still can: an L shape keeps its last two.
      const fits = (c) => validLine(S, c) || (roomLeft(p) >= 3 && gapPair(S, c));
      while (next.length > 1 && !fits(next)) next.shift();
      S.sel = next;
    }
  },
  take(S) {
    if (S.main || S.pending || !validLine(S, S.sel) || S.sel.length > roomLeft(cur(S))) return;
    const p = cur(S), cols = S.sel.map((i) => S.board[i]);
    S.sel.forEach((i) => (S.board[i] = null));
    cols.forEach((c) => p.tok[c]++);
    log(S, `${p.name} takes ${cols.join(', ')}.`);
    const same = cols.length === 3 && cols.every((c) => c === cols[0]);
    if (cols.filter((c) => c === 'pearl').length === 2 || same) {
      givePriv(S, 1 - S.cur);
      log(S, `${opp(S).name} receives a privilege as a penalty.`);
    }
    finishMain(S);
  },
  confirmMulti(S) {
    const pd = S.pending;
    if (!pd || pd.type !== 'multi') return;
    const p = cur(S);
    const got = pd.sel.map((i) => takeFromBoard(S, i));
    if (got.length) log(S, `${p.name} takes ${got.join(', ')}.`);
    S.pending = null;
    runQueue(S);
  },
  priv(S) {
    const p = cur(S);
    if (S.main || S.pending || (p.priv < 1 && S.mode !== 'priv2')) return;
    S.mode = S.mode ? null : 'priv';
    S.sel = [];
  },
  repl(S) {
    if (S.main || S.pending || !canReplenish(S)) return;
    shuffle(S.bag, () => nextRandom(S)); fillBoard(S);
    givePriv(S, 1 - S.cur);
    log(S, `${cur(S).name} replenishes the board; ${opp(S).name} gains a privilege.`);
  },
  card(S, { src, l, i }) {
    const pd = S.pending, p = cur(S);
    if (pd?.type === 'freeReserve') {
      if (src !== 'pyr' && src !== 'deck') return;
      const c = reserveCard(S, { src, l, i });
      if (!c) return;
      p.res.push(c);
      log(S, `${p.name} reserves a card.`);
      S.pending = null; runQueue(S);
      return;
    }
    if (pd?.type === 'freeCf') {
      let c = null;
      if (src === 'cf') { c = S.crow[i]; if (S.cdeck.length) S.crow[i] = S.cdeck.pop(); else S.crow.splice(i, 1); }
      else if (src === 'cdeck' && S.cdeck.length) c = S.cdeck.pop();
      if (!c) return;
      p.cf.push(c);
      log(S, `${p.name} takes a free counterfeiter card.`);
      S.pending = null; runQueue(S);
      return;
    }
    if (pd) return;
    if (src === 'cdeck') return;
    S.selCard = { src, l, i };
  },
  buy(S) { doBuy(S); },
  wild(S, { c }) {
    if (S.pending?.type !== 'wild') return;
    S.pending = null;
    doBuy(S, c);
  },
  reserve(S) {
    const p = cur(S), s = S.selCard;
    if (S.main || S.pending) return;
    if (S.goldSel == null || S.board[S.goldSel] !== 'gold') { S.toast = 'Choose a gold token on the board to reserve.'; return; }
    if (!s || (s.src !== 'pyr' && s.src !== 'deck')) { S.toast = 'Choose a card or a deck to reserve.'; return; }
    if (p.res.length >= resCap(p)) { S.toast = `You already hold ${resCap(p)} reserved cards.`; return; }
    const c = reserveCard(S, s);
    if (!c) { S.toast = 'That deck is empty.'; return; }
    S.board[S.goldSel] = null; p.tok.gold++; p.res.push(c);
    log(S, `${p.name} reserves a level ${c.level} card and takes a gold token.`);
    finishMain(S, S.exp && hasAb(p, 'reserve5') && p.res.length < resCap(p) ? ['freeReserve'] : []);
  },
  cancelReserve(S) {
    if (S.main || S.pending) return;
    S.goldSel = null;
    if (S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck')) S.selCard = null;
  },
  skip(S) {
    if (!S.pending) return;
    S.pending = null;
    runQueue(S);
  },
  royal(S, { i }) {
    const pd = S.pending, p = cur(S);
    if (pd?.type !== 'royal') return;
    const r = S.royals.splice(i, 1)[0];
    if (pd.replace && S.rdeck.length) S.royals.push(S.rdeck.pop());
    p.royals.push(r);
    log(S, `${p.name} claims a royal card (${r.pts} pts).`);
    S.pending = null;
    S.queue.unshift(...(r.ab && !r.ab.startsWith('w9') ? [r.ab] : []), 'royal');
    runQueue(S);
  },
  steal(S, { c }) {
    if (S.pending?.type !== 'steal') return;
    if (opp(S).tok[c] < 1 || c === 'gold') return;
    opp(S).tok[c]--; cur(S).tok[c]++;
    log(S, `${cur(S).name} steals a ${c} token.`);
    S.pending = null; runQueue(S);
  },
  disc(S, { c }) {
    if (S.pending?.type !== 'discard' || cur(S).tok[c] < 1) return;
    cur(S).tok[c]--; S.bag.push(c);
    log(S, `${cur(S).name} discards a ${c} token.`);
    if (limitCount(cur(S)) <= 10) S.pending = null;
    runQueue(S);
  },
  endabil(S, { k }) {
    if (S.pending?.type !== 'endabil') return;
    const p = cur(S);
    const mark = (ab) => (S.used[p.cf.find((c) => c.ab === ab && !S.used[c.id]).id] = true);
    S.pending = null;
    if (k === 'xturn') {
      mark('xturn'); p.tok.glass--; S.bag.push('glass'); p.priv--; S.privBoard++; S.extra = true;
      log(S, `${p.name} uses a counterfeiter card for an extra turn.`);
      S.queue.unshift('endabil');
    } else if (k === 'xsteal') {
      mark('xsteal'); p.tok.glass--; S.bag.push('glass'); p.priv--; S.privBoard++;
      S.queue.unshift('steal', 'endabil');
    } else if (k === 'royalbuy') {
      mark('royalbuy');
      const cost = 1 + p.royals.length;
      p.tok.glass -= cost; toBag(S, 'glass', cost);
      S.queue.unshift('endabil');
      S.pending = { type: 'royal', replace: true };
      return;
    } else if (k.startsWith('peek')) {
      const l = +k.slice(4);
      mark('peek'); p.tok.glass -= 2; toBag(S, 'glass', 2);
      S.queue.unshift('endabil');
      S.pending = { type: 'peek', l, cards: S.decks[l].splice(-3) };
      return;
    }
    runQueue(S);
  },
  endDone(S) {
    if (S.pending?.type !== 'endabil') return;
    S.pending = null;
    S.queue = S.queue.filter((s) => s !== 'endabil');
    runQueue(S);
  },
  peekPick(S, { i }) {
    const pd = S.pending;
    if (pd?.type !== 'peek') return;
    const rest = pd.cards.filter((_, k) => k !== i);
    cur(S).res.push(pd.cards[i]);
    S.decks[pd.l].unshift(...rest);
    log(S, `${cur(S).name} reserves a card from the level ${pd.l + 1} deck.`);
    S.pending = null; runQueue(S);
  },
};

export function reduce(state, a) {
  if (a.type === 'new') return createGame(a.exp, a.seed, a.first);
  const S = structuredClone(state);
  S.toast = null;
  if (S.over) return state;
  if (S.awaitingFirst && a.type !== 'chooseFirst' && a.type !== 'resign') return state;
  handlers[a.type]?.(S, a);
  return S;
}
