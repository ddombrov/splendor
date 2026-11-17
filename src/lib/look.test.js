import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { createGame } from '../engine/engine.js';
import { baseRoyals, expRoyals } from '../engine/data.js';
import { classicCardFile } from './look.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const cardPath = (file) => new URL(`../../public/classic/cards/${file}`, import.meta.url);

describe('the original look', () => {
  it('has a printed picture for every one of the 67 cards and the 4 base royals', () => {
    const S = createGame(false, 5, 0);
    const cards = [...S.pyr.flat(), ...S.decks.flat(), ...baseRoyals().filter((r) => r.id !== 'b5')];
    expect(cards).toHaveLength(71);
    const files = cards.map((c) => classicCardFile(c));
    expect(files.filter((f) => !f)).toEqual([]);
    expect(new Set(files).size).toBe(71);
    for (const f of files) expect(existsSync(cardPath(f))).toBe(true);
  });

  it('has no picture for cards that were never printed', () => {
    const made = createGame(false, 5, 0, { randomCards: true }).decks.flat();
    expect(made.some((c) => !classicCardFile(c))).toBe(true);
    expect(classicCardFile(baseRoyals(true)[0])).toBeNull();
    expect(expRoyals().every((r) => classicCardFile(r) === null)).toBe(true);
  });
});
