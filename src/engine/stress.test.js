import { describe, expect, it } from 'vitest';
import { playRandomGame } from './randomPlay.js';

describe('whole games played with random legal choices', () => {
  it.each([false, true])('every seeded game finishes with a winner (expansion: %s)', (exp) => {
    for (let seed = 1; seed <= 25; seed++) {
      const final = playRandomGame(exp, seed);
      expect(final.over, `seed ${seed} did not finish`).toBeTruthy();
    }
  }, 120_000);

  it('plays the same game again from the same seed', () => {
    expect(playRandomGame(false, 5)).toEqual(playRandomGame(false, 5));
  });
});
