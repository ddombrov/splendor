import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout.js';

const SIZES = [[2560, 1440], [3440, 1440], [1920, 1080], [1920, 800], [1600, 900], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [1100, 1000], [820, 1180], [768, 1024], [412, 915], [390, 844], [360, 640]];

describe('screen layout', () => {
  it('fits the three columns inside the stage on every wide window', () => {
    for (const exp of [false, true]) {
      for (const [vw, vh] of SIZES) {
        const L = computeLayout({ vw, vh, exp });
        if (L.mode !== 'wide') continue;
        if (L.players === 'bottom') expect(2 * L.padX + L.boardColW + L.cardsW + 3 * 12 + 20).toBeLessThanOrEqual(L.w + 1);
        else expect(L.sideW + L.cardsW + L.boardColW + 2 * 12 + 20).toBeCloseTo(L.w, 0);
        expect(L.cell * 5.9615).toBeLessThanOrEqual(L.boardColW + 1);
        expect(L.cell * 6.692 + 32 + (L.stripH ?? 0)).toBeLessThanOrEqual(L.h + 60); // the board and its buttons fit the height
        expect(L.w * L.k).toBeCloseTo(vw, 0);
        expect(L.h * L.k).toBeCloseTo(vh, 0);
      }
    }
  });

  it('stacks on tall windows, scaled only when narrower than the smallest stage', () => {
    for (const [vw, vh] of SIZES) {
      const L = computeLayout({ vw, vh });
      if (L.mode !== 'tall') continue;
      expect(L.w).toBeGreaterThanOrEqual(520);
      expect(L.w).toBeLessThanOrEqual(900);
      expect(L.w * L.k).toBeCloseTo(vw, 0);
      expect(L.cell * 5.9615).toBeLessThanOrEqual(L.w);
    }
    expect(computeLayout({ vw: 390, vh: 844 }).k).toBeCloseTo(0.75, 2);
    expect(computeLayout({ vw: 768, vh: 1024 }).k).toBe(1);
  });

  it('keeps the established look on a 1920 by 1080 screen', () => {
    const L = computeLayout({ vw: 1920, vh: 1080 });
    expect(L.mode).toBe('wide');
    expect(L.k).toBeCloseTo(1.2, 2);
    expect(L.cell).toBeGreaterThanOrEqual(90);
    expect(L.cardZoom).toBeGreaterThanOrEqual(0.8);
  });

  it('puts the players in a strip across the top when that makes the board and cards clearly bigger', () => {
    const L = computeLayout({ vw: 1207, vh: 887 });
    expect(L.players).toBe('bottom');
    const side = computeLayout({ vw: 1920, vh: 1080 });
    expect(side.players).toBe('side');
  });

  it('never makes a card column too narrow for its cards', () => {
    for (const exp of [false, true]) {
      for (const [vw, vh] of SIZES) {
        const L = computeLayout({ vw, vh, exp });
        expect(L.cardsW).toBeGreaterThanOrEqual(Math.floor(744 * L.cardZoom) + 36);
      }
    }
  });

  it('lets the board use the room the height allows when the width is plentiful', () => {
    const L = computeLayout({ vw: 3440, vh: 1440 });
    expect(L.cell).toBeGreaterThanOrEqual(105);
  });

  it('switches between the layouts at one aspect ratio', () => {
    expect(computeLayout({ vw: 1300, vh: 1000 }).mode).toBe('wide');
    expect(computeLayout({ vw: 1290, vh: 1000 }).mode).toBe('tall');
  });

  it('uses a bigger scale on small windows than a fixed 1560 stage would', () => {
    expect(computeLayout({ vw: 1366, vh: 768 }).k).toBeGreaterThan(1366 / 1560);
  });
});
