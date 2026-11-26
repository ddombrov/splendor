import { describe, expect, it } from 'vitest';
import { createGame, cur, reduce, validLine } from './engine.js';
import { botActions, chooseGoal } from './bot.js';

/** Both seats are played by the bot, so this checks it never gets stuck or breaks a rule. */
function botGame(exp, seed, difficulty, onMove) {
  let S = createGame(exp, seed, 0);
  const memory = [{}, {}];
  for (let turns = 0; turns < 6000 && !S.over; turns++) {
    const actions = botActions(S, { difficulty, memory: memory[S.cur] });
    expect(actions.length, `bot had no move at step ${turns}`).toBeGreaterThan(0);
    onMove?.(S, actions);
    for (const a of actions) S = reduce(S, a);
  }
  return S;
}

describe('the computer player', () => {
  it.each([
    ['easy', false, 10], ['easy', true, 10],
    ['medium', false, 4], ['medium', true, 4],
    ['hard', false, 1], ['hard', true, 1],
  ])('finishes whole games against itself (%s, expansion: %s)', (difficulty, exp, games) => {
    for (let seed = 1; seed <= games; seed++) {
      expect(botGame(exp, seed, difficulty).over, `seed ${seed} did not finish`).toBeTruthy();
    }
  }, 300_000);

  it('only ever acts for the player whose turn it is', () => {
    const S = createGame(false, 9, 1);
    expect(cur(S).name).toBe('Player 2');
    const after = botActions(S).reduce((s, a) => reduce(s, a), S);
    expect(after.players[0].tok).toEqual(S.players[0].tok);
  });

  it('on easy, always takes the longest line of tokens it can when it takes tokens', () => {
    const longest = (S) => {
      const cells = [...S.board.keys()];
      let best = 0;
      for (const a of cells) for (const b of cells) for (const c of cells) {
        for (const sel of [[a], [a, b], [a, b, c]]) {
          if (new Set(sel).size === sel.length && validLine(S, sel)) best = Math.max(best, sel.length);
        }
      }
      return best;
    };
    for (let seed = 1; seed <= 3; seed++) {
      botGame(false, seed, 'easy', (S, actions) => {
        if (!S.pending && actions.at(-1).type === 'take') expect(actions.length - 1).toBe(longest(S));
      });
    }
  }, 120_000);

  it('takes three tokens on its first turn instead of one', () => {
    for (const difficulty of ['medium', 'hard']) {
      const acts = botActions(createGame(false, 3, 0), { difficulty });
      expect(acts.filter((a) => a.type === 'tok').length, difficulty).toBe(3);
    }
  });

  it('picks a goal for the hard player and keeps it for the game', () => {
    const S = createGame(false, 4, 0);
    const memory = {};
    botActions(S, { difficulty: 'hard', memory });
    expect(memory.goal).toBe(chooseGoal(S, 0));
    expect(memory.goal).toMatch(/^(points|crowns|color:\w+)$/);
  });
});
