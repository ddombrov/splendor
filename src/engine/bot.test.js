import { describe, expect, it } from 'vitest';
import { createGame, cur, reduce } from './engine.js';
import { botActions } from './bot.js';

/** Both seats are played by the bot, so this checks it never gets stuck or breaks a rule. */
function botGame(exp, seed) {
  let S = createGame(exp, seed, 0);
  for (let turns = 0; turns < 6000 && !S.over; turns++) {
    const actions = botActions(S);
    expect(actions.length, `bot had no move at step ${turns}`).toBeGreaterThan(0);
    for (const a of actions) S = reduce(S, a);
  }
  return S;
}

describe('the computer player', () => {
  it.each([false, true])('finishes whole games against itself (expansion: %s)', (exp) => {
    for (let seed = 1; seed <= 15; seed++) {
      expect(botGame(exp, seed).over, `seed ${seed} did not finish`).toBeTruthy();
    }
  }, 120_000);

  it('only ever acts for the player whose turn it is', () => {
    const S = createGame(false, 9, 1);
    expect(cur(S).name).toBe('Player 2');
    const after = botActions(S).reduce((s, a) => reduce(s, a), S);
    expect(after.players[0].tok).toEqual(S.players[0].tok);
  });
});
