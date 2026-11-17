import { canReplenish, cur, endOptions, limitCount, opp, plan, resCap, roomLeft, validLine } from './engine.js';

/*
 * A basic computer player: it plays a random legal move for whoever's turn it is. It is deliberately
 * simple. Difficulty and depth are accepted by the screens but not used yet.
 * botActions returns the actions to apply, in order, for the current moment.
 */
const r = (n) => Math.floor(Math.random() * n);
const choose = (list) => list[r(list.length)];
const held = (player, gold) => Object.keys(player.tok).filter((k) => player.tok[k] > 0 && (gold || k !== 'gold'));

function answerPrompt(S, pd) {
  const p = cur(S);
  const cells = S.board.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  switch (pd.type) {
    case 'pick': return [{ type: 'tok', i: choose(cells) }];
    case 'multi': {
      const open = cells.filter((i) => S.board[i] !== 'gold' && !pd.sel.includes(i));
      return [!open.length || (pd.sel.length && r(2)) ? { type: 'confirmMulti' } : { type: 'tok', i: choose(open) }];
    }
    case 'steal': return [{ type: 'steal', c: choose(held(opp(S), false)) }];
    case 'royal': return [{ type: 'royal', i: 0 }];
    case 'discard': return [{ type: 'disc', c: choose(held(p, true)) }];
    case 'wild': return [{ type: 'wild', c: pd.colors[0] }];
    case 'freeReserve': return [r(2) ? { type: 'skip' } : { type: 'card', src: 'deck', l: 1 }];
    case 'freeCf': return [{ type: 'card', src: 'cf', i: 0 }];
    case 'peek': return [{ type: 'peekPick', i: 0 }];
    case 'endabil': {
      const options = endOptions(S);
      return [options.length && r(10) < 7 ? { type: 'endabil', k: choose(options).k } : { type: 'endDone' }];
    }
    default: return [];
  }
}

export function botActions(S) {
  if (S.over) return [];
  if (S.awaitingFirst) return [{ type: 'chooseFirst', player: r(2) }];
  if (S.pending) return answerPrompt(S, S.pending);
  const p = cur(S);

  const buyable = [];
  S.pyr.forEach((row, l) => row.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'pyr', l, i })));
  p.res.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'res', i }));
  S.crow.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'cf', i }));
  if (buyable.length && r(10) < 6) return [{ type: 'card', ...choose(buyable) }, { type: 'buy' }];

  const gold = S.board.indexOf('gold');
  if (gold >= 0 && roomLeft(p) > 0 && p.res.length < resCap(p) && r(10) < 2) {
    return [{ type: 'tok', i: gold }, { type: 'card', src: 'deck', l: r(3) }, { type: 'reserve' }];
  }

  const free = S.board.map((c, i) => (c && c !== 'gold' ? i : -1)).filter((i) => i >= 0);
  if (roomLeft(p) > 0 && free.length) {
    const sel = [choose(free)];
    const want = Math.min(roomLeft(p), 1 + r(3));
    while (sel.length < want) {
      const next = free.filter((c) => !sel.includes(c) && validLine(S, [...sel, c]));
      if (!next.length) break;
      sel.push(choose(next));
    }
    return [...sel.map((i) => ({ type: 'tok', i })), { type: 'take' }];
  }
  if (limitCount(p) >= 10) return [{ type: 'giveBack', c: choose(held(p, true)) }];
  if (canReplenish(S)) return [{ type: 'repl' }];
  return [];
}
