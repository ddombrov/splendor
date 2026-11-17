import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { createGame } from '../engine/engine.js';
import { cardType, centrePicture } from './cardTypes.js';

describe('printed card types', () => {
  const S = createGame(false, 5, 0);
  const all = [0, 1, 2].flatMap((l) => [...S.pyr[l], ...S.decks[l]]);

  it('come five times each in the per-colour types, as printed', () => {
    const count = (level, name) => all.filter((c) => c.level === level && cardType(c).name === name).length;
    for (const n of ['Woman with earring', 'Loose gem on parchment', 'Necklace on a bust', 'Sword hilt', 'Gold circlet on cloth']) expect(count(1, n)).toBe(5);
    for (const n of ['Bare hand wearing rings', 'Gloved hand reaching for a ring', 'Signet ring on scrolls', 'Tiara in a jewel box']) expect(count(2, n)).toBe(5);
    for (const n of ['Woman wearing a necklace', 'Royal crown on a cushion']) expect(count(3, n)).toBe(5);
  });

  it('give every card a picture that exists, except the wild ones', () => {
    for (const c of all) {
      const pic = centrePicture(c);
      if (c.bonus === 'wild') expect(pic).toBeNull();
      else expect(existsSync(new URL(`../../public${pic}`, import.meta.url))).toBe(true);
    }
  });
});
