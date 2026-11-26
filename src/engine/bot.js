import { COLORS } from './data.js';
import { bonuses, canPass, canReplenish, colorPts, crowns, cur, endOptions, limitCount, opp, plan, pts, reduce, resCap, roomLeft } from './engine.js';
import { shuffle } from './rng.js';

/*
 * The computer player. botActions returns the actions to apply, in order, for the current moment.
 *   easy   picks at random between buying, reserving and taking tokens, but always takes as many tokens as it can.
 *   medium tries every move and keeps the one that leaves it best placed (looks one move ahead), thinking only
 *          about its own position.
 *   hard   picks a goal (20 points, 10 crowns or 10 points of one colour) from the cards on display at the start,
 *          aims every choice at it, weighs the opponent's position too, and looks at the opponent's best reply
 *          (two moves ahead).
 * `memory` is kept by the caller for one game, so the hard player keeps the goal it chose.
 */
const LEVELS = { easy: { depth: 0 }, medium: { depth: 1, selfish: true }, hard: { depth: 2, goal: true } };
const WIN = 100000;
const r = (n) => Math.floor(Math.random() * n);
const choose = (list) => list[r(list.length)];
const held = (player, gold) => Object.keys(player.tok).filter((k) => player.tok[k] > 0 && (gold || k !== 'gold'));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const goldOnBoard = (S) => S.board.indexOf('gold');

/* ---------- moves ---------- */
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
/** Every straight line of 1 to 3 gem or pearl tokens on the board. */
function tokenLines(S) {
  const out = [];
  const ok = (row, col) => row >= 0 && row < 5 && col >= 0 && col < 5 && S.board[row * 5 + col] && S.board[row * 5 + col] !== 'gold';
  for (let i = 0; i < 25; i++) {
    const row = Math.floor(i / 5), col = i % 5;
    if (!ok(row, col)) continue;
    out.push([i]);
    for (const [dr, dc] of DIRS) {
      const line = [i];
      for (let k = 1; k < 3; k++) {
        if (!ok(row + dr * k, col + dc * k)) break;
        line.push((row + dr * k) * 5 + col + dc * k);
        out.push([...line]);
      }
    }
  }
  return out;
}
const takeMove = (line) => [...line.map((i) => ({ type: 'tok', i })), { type: 'take' }];

function buyMoves(S) {
  const p = cur(S), out = [];
  S.pyr.forEach((row, l) => row.forEach((c, i) => plan(S, p, c) && out.push([{ type: 'card', src: 'pyr', l, i }, { type: 'buy' }])));
  p.res.forEach((c, i) => plan(S, p, c) && out.push([{ type: 'card', src: 'res', i }, { type: 'buy' }]));
  S.crow.forEach((c, i) => plan(S, p, c) && out.push([{ type: 'card', src: 'cf', i }, { type: 'buy' }]));
  return out;
}

function reserveMoves(S, decks) {
  const p = cur(S), g = goldOnBoard(S);
  if (g < 0 || p.res.length >= resCap(p)) return [];
  const out = [];
  S.pyr.forEach((row, l) => row.forEach((_, i) => out.push([{ type: 'tok', i: g }, { type: 'card', src: 'pyr', l, i }, { type: 'reserve' }])));
  if (decks) [0, 1, 2].forEach((l) => S.decks[l].length && out.push([{ type: 'tok', i: g }, { type: 'card', src: 'deck', l }, { type: 'reserve' }]));
  return out;
}

/** Buys that only become possible by first spending privileges on the missing tokens. */
function privilegeBuys(S) {
  const p = cur(S), out = [];
  if (p.priv < 1 || S.mode) return out;
  const cards = [];
  S.pyr.forEach((row, l) => row.forEach((c, i) => cards.push([c, { src: 'pyr', l, i }])));
  p.res.forEach((c, i) => cards.push([c, { src: 'res', i }]));
  for (const [c, where] of cards) {
    if (!c.cost || plan(S, p, c)) continue;
    const short = shortfall(S, p, c);
    const missing = Object.entries(short.by).flatMap(([k, n]) => Array(n).fill(k));
    if (!missing.length || missing.length - p.tok.gold > p.priv) continue;
    let T = S;
    const acts = [];
    const step = (a) => { acts.push(a); T = reduce(T, a); };
    for (const k of missing.slice(0, Math.max(0, missing.length - p.tok.gold))) {
      const i = T.board.indexOf(k);
      if (i < 0) break;
      if (T.mode !== 'priv2') step({ type: 'priv' });
      step({ type: 'tok', i });
    }
    if (T.mode) step({ type: 'priv' }); // a second free token that was not needed is left
    if (!plan(T, cur(T), c)) continue;
    out.push([...acts, { type: 'card', ...where }, { type: 'buy' }]);
  }
  return out;
}

/* ---------- judging a position ---------- */
function shortfall(S, p, c) {
  const b = bonuses(p), by = {};
  let n = 0;
  for (const [k, v] of Object.entries(c.cost)) {
    if (k === 'gold') continue;
    const miss = Math.max(0, v - (COLORS.includes(k) ? b[k] : 0) - p.tok[k]);
    if (miss) { by[k] = miss; n += miss; }
  }
  return { by, n: Math.max(0, n - p.tok.gold + (c.cost.gold || 0)) };
}

const hasRoyal = (p, ab) => p.royals.some((x) => x.ab === ab);
const crownGoal = (p) => (hasRoyal(p, 'w9k') ? 9 : 10);
const colorGoal = (p) => (hasRoyal(p, 'w9c') ? 9 : 10);
function progress(p) {
  const color = Math.max(...COLORS.map((k) => colorPts(p, k)));
  return { points: pts(p) / 20, crowns: crowns(p) / crownGoal(p), color: color / colorGoal(p) };
}
function goalProgress(p, goal) {
  if (goal === 'points') return pts(p) / 20;
  if (goal === 'crowns') return crowns(p) / crownGoal(p);
  if (goal?.startsWith('color:')) return colorPts(p, goal.slice(6)) / colorGoal(p);
  return 0;
}
/** Medium has no fixed goal: it leans towards whichever win it is already closest to. */
function leadingGoal(p) {
  const pr = progress(p);
  const color = COLORS.reduce((m, k) => (colorPts(p, k) > colorPts(p, m) ? k : m), COLORS[0]);
  const best = [['points', pr.points], ['crowns', pr.crowns], [`color:${color}`, pr.color]].sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 0.15 ? best[0] : null;
}
const bestColor = (p) => COLORS.filter((k) => bonuses(p)[k] > 0).sort((a, b) => colorPts(p, b) - colorPts(p, a) || bonuses(p)[b] - bonuses(p)[a])[0];

const ABILITY = { extra: 7, steal: 3, privilege: 3, match: 3 };
/** How much a card is worth to a player chasing `goal`. */
function worth(c, p, goal) {
  if (c.kind === 'cf') return 4 + (c.crowns || 0) * (goal === 'crowns' ? 8 : 3);
  const color = c.bonus === 'wild' ? (goal?.startsWith('color:') ? goal.slice(6) : bestColor(p)) : c.bonus;
  let v = c.pts * 3 + c.crowns * 3 + c.n * 4 + (ABILITY[c.ability] || 0);
  if (goal === 'points') v += c.pts * 4;
  if (goal === 'crowns') v += c.crowns * 8;
  if (goal?.startsWith('color:') && color === goal.slice(6)) v += c.pts * 6 + 3;
  return v;
}

/** The cards a player could work towards: the display, the counterfeiters and their own reserved cards. */
const targets = (S, p) => [...S.pyr.flat(), ...S.crow, ...p.res].filter((c) => c?.cost);

function standing(S, idx, goal) {
  const p = S.players[idx];
  const pr = progress(p);
  let v = 100 * Math.max(pr.points, pr.crowns, pr.color) + 15 * (pr.points + pr.crowns + pr.color) + 70 * goalProgress(p, goal);
  v += 8 * sum(bonuses(p)) + 1.5 * (limitCount(p) - p.tok.gold) + 3 * p.tok.gold + 3 * p.priv + 2 * p.cf.length;
  const near = targets(S, p).map((c) => worth(c, p, goal) * 0.6 / (1 + shortfall(S, p, c).n)).sort((a, b) => b - a);
  return v + (near[0] || 0) + (near[1] || 0) * 0.5;
}

function evaluate(S, me, goals, selfish = false) {
  if (S.over) return S.over === S.players[me].name ? WIN : -WIN;
  return standing(S, me, goals(me)) - (selfish ? 0 : standing(S, 1 - me, goals(1 - me))) + (S.cur === me ? 8 : 0);
}

/** How badly a player wants each kind of token, from the cards they are closest to buying. */
function needs(S, p, goal) {
  const want = Object.fromEntries([...Object.keys(p.tok)].map((k) => [k, 1]));
  want.gold = 4;
  const ranked = targets(S, p).map((c) => ({ c, sf: shortfall(S, p, c) })).map((x) => ({ ...x, s: worth(x.c, p, goal) / (1 + x.sf.n) })).sort((a, b) => b.s - a.s);
  ranked.slice(0, 3).forEach(({ sf, s }, n) => Object.entries(sf.by).forEach(([k, m]) => (want[k] += (s / 10) * (3 - n) * Math.min(m, 3))));
  return want;
}

/* ---------- answering prompts ---------- */
function answer(S, goal, random) {
  const pd = S.pending, p = cur(S);
  const cells = S.board.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  if (random) return randomAnswer(S, pd, p, cells);
  const want = needs(S, p, goal);
  const best = (list, score) => list.reduce((m, x) => (score(x) > score(m) ? x : m), list[0]);
  switch (pd.type) {
    case 'pick': {
      const match = cells.find((i) => S.board[i] === pd.color);
      if (match != null) return { type: 'tok', i: match };
      return { type: 'tok', i: best(cells.filter((i) => S.board[i] !== 'gold'), (i) => want[S.board[i]]) };
    }
    case 'multi': {
      const open = cells.filter((i) => S.board[i] !== 'gold' && !pd.sel.includes(i));
      const fits = pd.sel.length < Math.min(pd.max, roomLeft(p));
      const allowed = pd.rule === 'any' || !pd.sel.length ? open : open.filter((i) => S.board[i] === S.board[pd.sel[0]]);
      if (!fits || !allowed.length) return { type: 'confirmMulti' };
      if (pd.rule === 'same' && !pd.sel.length) {
        const count = (k) => open.filter((i) => S.board[i] === k).length;
        return { type: 'tok', i: best(allowed, (i) => want[S.board[i]] * Math.min(count(S.board[i]), pd.max)) };
      }
      return { type: 'tok', i: best(allowed, (i) => want[S.board[i]]) };
    }
    case 'steal': {
      const theirs = needs(S, opp(S), null);
      return { type: 'steal', c: best(held(opp(S), false), (k) => want[k] + theirs[k] / 2) };
    }
    case 'royal': return { type: 'royal', i: S.royals.indexOf(best(S.royals, (x) => x.pts * (goal === 'points' ? 6 : 3) + (x.ab ? 3 : 0))) };
    case 'discard': return { type: 'disc', c: best(held(p, true), (k) => -want[k]) };
    case 'wild': return { type: 'wild', c: goal?.startsWith('color:') && pd.colors.includes(goal.slice(6)) ? goal.slice(6) : best(pd.colors, (k) => colorPts(p, k) * 2 + bonuses(p)[k]) };
    case 'freeReserve': {
      const spots = S.pyr.flatMap((row, l) => row.map((c, i) => ({ c, l, i })));
      if (!spots.length) return { type: 'skip' };
      const s = best(spots, (x) => worth(x.c, p, goal) / (1 + shortfall(S, p, x.c).n));
      return { type: 'card', src: 'pyr', l: s.l, i: s.i };
    }
    case 'freeCf': return S.crow.length ? { type: 'card', src: 'cf', i: S.crow.indexOf(best(S.crow, (c) => worth(c, p, goal))) } : { type: 'card', src: 'cdeck' };
    case 'peek': return { type: 'peekPick', i: pd.cards.indexOf(best(pd.cards, (c) => worth(c, p, goal) / (1 + shortfall(S, p, c).n))) };
    case 'endabil': {
      const options = endOptions(S).map((o) => o.k);
      const k = ['xturn', 'royalbuy', 'xsteal'].find((x) => options.includes(x));
      return k ? { type: 'endabil', k } : { type: 'endDone' };
    }
    default: return null;
  }
}

function randomAnswer(S, pd, p, cells) {
  switch (pd.type) {
    case 'pick': return { type: 'tok', i: choose(cells.filter((i) => S.board[i] === pd.color).concat(pd.plus ? cells.filter((i) => S.board[i] !== 'gold') : [])) };
    case 'multi': {
      const open = cells.filter((i) => S.board[i] !== 'gold' && !pd.sel.includes(i) && (pd.rule === 'any' || !pd.sel.length || S.board[i] === S.board[pd.sel[0]]));
      return !open.length || pd.sel.length >= pd.max ? { type: 'confirmMulti' } : { type: 'tok', i: choose(open) };
    }
    case 'steal': return { type: 'steal', c: choose(held(opp(S), false)) };
    case 'royal': return { type: 'royal', i: r(S.royals.length) };
    case 'discard': return { type: 'disc', c: choose(held(p, true)) };
    case 'wild': return { type: 'wild', c: choose(pd.colors) };
    case 'freeReserve': return r(2) ? { type: 'skip' } : { type: 'card', src: 'deck', l: r(3) };
    case 'freeCf': return S.crow.length ? { type: 'card', src: 'cf', i: r(S.crow.length) } : { type: 'card', src: 'cdeck' };
    case 'peek': return { type: 'peekPick', i: r(pd.cards.length) };
    case 'endabil': {
      const options = endOptions(S);
      return options.length && r(10) < 7 ? { type: 'endabil', k: choose(options).k } : { type: 'endDone' };
    }
    default: return null;
  }
}

/* ---------- looking ahead ---------- */
/** Plays a move and any prompts it raises; returns null if the move did nothing. */
function play(S, acts, goals) {
  const before = S.log[0], n = S.log.length, who = S.cur;
  for (const a of acts) S = reduce(S, a);
  for (let guard = 0; S.pending && !S.over && guard < 30; guard++) {
    const a = answer(S, goals(S.cur), false);
    if (!a) break;
    S = reduce(S, a);
  }
  if (S.cur === who && !S.over && S.log[0] === before && S.log.length === n) return null;
  return S;
}

/** One move per distinct set of tokens: where on the board they came from matters little. */
function candidates(S, deckReserves) {
  const p = cur(S);
  const seen = new Set();
  const takes = tokenLines(S).filter((line) => {
    const key = line.map((i) => S.board[i]).sort().join();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...buyMoves(S), ...privilegeBuys(S), ...reserveMoves(S, deckReserves), ...takes.map(takeMove)];
}

/** The bot cannot see the order of the bag or the decks, so it searches a copy with them shuffled. */
function hideUnknowns(S) {
  const T = structuredClone(S);
  [T.bag, T.cdeck, T.rdeck, ...T.decks].forEach((a) => a && shuffle(a, Math.random));
  return T;
}

function searchMove(S, depth, goals, selfish) {
  const me = S.cur;
  const root = hideUnknowns(S);
  const scored = [];
  for (const acts of candidates(root, false)) {
    const T = play(root, acts, goals);
    if (T) scored.push({ acts, T, v: evaluate(T, me, goals, selfish) + Math.random() * 0.01 });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.v - a.v);
  if (depth < 2) return scored[0].acts;
  // The most promising moves are judged again after the opponent's best reply, as the opponent sees it.
  const top = scored.slice(0, 8);
  for (const m of top) {
    if (m.T.over || m.T.cur === me || m.T.pending) continue;
    let best = null;
    for (const reply of candidates(m.T, false)) {
      const U = play(m.T, reply, goals);
      if (!U) continue;
      const theirs = evaluate(U, 1 - me, goals);
      if (!best || theirs > best.theirs) best = { theirs, U };
    }
    if (best) m.v = evaluate(best.U, me, goals);
  }
  return top.sort((a, b) => b.v - a.v)[0].acts;
}

/* ---------- the easy player ---------- */
function easyMove(S) {
  const p = cur(S);
  const lines = tokenLines(S);
  const longest = Math.max(0, ...lines.map((l) => l.length));
  const pool = [];
  const buys = buyMoves(S);
  const reserves = reserveMoves(S, true);
  if (buys.length) pool.push(...Array(2).fill(() => choose(buys)));
  if (longest) pool.push(...Array(2).fill(() => takeMove(choose(lines.filter((l) => l.length === longest)))));
  if (reserves.length) pool.push(() => choose(reserves));
  return pool.length ? choose(pool)() : null;
}

/* ---------- hard: choosing a goal ---------- */
/** Scores each way to win by the cards on display (cheap, valuable cards count most) and what is already owned. */
export function chooseGoal(S, idx) {
  const p = S.players[idx];
  const score = { points: pts(p) / 20 * 4, crowns: crowns(p) / 10 * 4 };
  COLORS.forEach((k) => (score[`color:${k}`] = colorPts(p, k) / 10 * 4 + bonuses(p)[k] * 0.05));
  for (const c of [...S.pyr.flat(), ...p.res].filter((x) => x?.cost)) {
    const effort = 1 + Object.values(c.cost).reduce((a, b) => a + b, 0) / 3;
    score.points += c.pts / 20 / effort;
    score.crowns += c.crowns / 10 / effort;
    if (COLORS.includes(c.bonus)) score[`color:${c.bonus}`] += c.pts / 10 / effort;
    if (c.bonus === 'wild') COLORS.forEach((k) => (score[`color:${k}`] += (c.pts / 10 / effort) * 0.6));
  }
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
}

export function botActions(S, { difficulty = 'medium', memory = {} } = {}) {
  if (S.over) return [];
  if (S.awaitingFirst) return [{ type: 'chooseFirst', player: r(2) }];
  const { depth, goal: fixed, selfish } = LEVELS[difficulty] ?? LEVELS.medium;
  const me = S.cur;
  if (fixed && !memory.goal) memory.goal = chooseGoal(S, me);
  const goals = (idx) => (idx === me && fixed ? memory.goal : leadingGoal(S.players[idx]));
  if (S.pending) {
    const a = answer(S, goals(me), depth === 0);
    return a ? [a] : [];
  }
  if (canPass(S)) return [{ type: 'pass' }];

  // A board with nothing worth taking is refilled, unless there is a card to buy.
  const longest = Math.max(0, ...tokenLines(S).map((l) => l.length));
  if (canReplenish(S) && !buyMoves(S).length && (longest === 0 || (depth && longest < 2))) return [{ type: 'repl' }];

  const acts = depth === 0 ? easyMove(S) : searchMove(S, depth, goals, selfish);
  if (acts) return acts;
  return canReplenish(S) ? [{ type: 'repl' }] : [];
}
