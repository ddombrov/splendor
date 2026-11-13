import { createGame, cur, endOptions, plan, reduce, validLine } from './engine.js';
import { nextRandom } from './rng.js';

/** An independent generator, so the player's choices never depend on the game's own random state. */
function chooser(seed) {
  const holder = { rng: seed >>> 0 };
  return (n) => Math.floor(nextRandom(holder) * n);
}

export const MAX_ACTIONS = 3000;

/** The token kinds a player actually holds, excluding gold, which cannot be stolen. */
const held = (player, { gold = false } = {}) => Object.keys(player.tok).filter((k) => player.tok[k] > 0 && (gold || k !== 'gold'));

/** Plays one game to the end with random but legal choices and returns the final state. */
export function playRandomGame(exp, seed) {
  const pick = chooser(seed * 7919);
  const choose = (list) => list[pick(list.length)];
  let S = createGame(exp, seed);

  for (let step = 0; step < MAX_ACTIONS && !S.over; step++) {
    const p = cur(S);
    const pd = S.pending;
    const cells = S.board.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    let action;

    if (pd) {
      switch (pd.type) {
        case 'pick': action = { type: 'tok', i: choose(cells) }; break;
        case 'multi': {
          const open = cells.filter((i) => S.board[i] !== 'gold' && !pd.sel.includes(i));
          action = !open.length || (pd.sel.length && pick(2)) ? { type: 'confirmMulti' } : { type: 'tok', i: choose(open) };
          break;
        }
        case 'steal': action = { type: 'steal', c: choose(held(S.players[1 - S.cur])) }; break;
        case 'royal': action = { type: 'royal', i: 0 }; break;
        case 'discard': action = { type: 'disc', c: choose(held(p, { gold: true })) }; break;
        case 'wild': action = { type: 'wild', c: pd.colors[0] }; break;
        case 'freeReserve': action = pick(2) ? { type: 'skip' } : { type: 'card', src: 'deck', l: 1 }; break;
        case 'freeCf': action = { type: 'card', src: 'cf', i: 0 }; break;
        case 'endabil': {
          const options = endOptions(S);
          action = options.length && pick(10) < 7 ? { type: 'endabil', k: choose(options).k } : { type: 'endDone' };
          break;
        }
        case 'peek': action = { type: 'peekPick', i: 0 }; break;
        default: throw new Error(`unexpected prompt ${pd.type}`);
      }
    } else {
      const buyable = [];
      S.pyr.forEach((row, l) => row.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'pyr', l, i })));
      p.res.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'res', i }));
      S.crow.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'cf', i }));
      const free = cells.filter((i) => S.board[i] !== 'gold');
      const roll = pick(10);

      if (buyable.length && roll < 6) {
        S = reduce(S, { type: 'card', ...choose(buyable) });
        action = { type: 'buy' };
      } else if (roll < 7 && S.board.includes('gold') && p.res.length < 3) {
        S = reduce(S, { type: 'tok', i: S.board.indexOf('gold') });
        S = reduce(S, { type: 'card', src: 'deck', l: 0 });
        action = { type: 'reserve' };
      } else if (!free.length) {
        action = { type: 'repl' };
      } else {
        S = reduce(S, { type: 'tok', i: choose(free) });
        const rest = free.filter((i) => !S.sel.includes(i));
        if (rest.length && pick(2)) S = reduce(S, { type: 'tok', i: choose(rest) });
        action = validLine(S, S.sel) ? { type: 'take' } : { type: 'repl' };
      }
    }
    S = reduce(S, action);
  }
  return S;
}
