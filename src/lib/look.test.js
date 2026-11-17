import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { createGame } from '../engine/engine.js';
import { baseRoyals, expRoyals } from '../engine/data.js';
import { CLASSIC_COUNTERFEITERS, CLASSIC_TOKEN, classicCardFile } from './look.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const cardPath = (file) => new URL(`../../public/classic/${file}`, import.meta.url);

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
  });

  it('has a picture for every expansion royal and counterfeiter power', () => {
    for (const r of expRoyals()) expect(existsSync(cardPath(classicCardFile(r)))).toBe(true);
    for (const f of CLASSIC_COUNTERFEITERS) expect(existsSync(cardPath(f))).toBe(true);
    const S = createGame(true, 5, 0);
    for (const c of [...S.crow, ...S.cdeck]) expect(classicCardFile(c)).not.toBeNull();
    for (const f of Object.values(CLASSIC_TOKEN)) expect(existsSync(new URL(`../../public/classic/tokens/${f}`, import.meta.url))).toBe(true);
  });
});
