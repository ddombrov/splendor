import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout.js';

const SIZES = [[2560, 1440], [3440, 1440], [1920, 1080], [1920, 800], [1600, 900], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [1100, 1000], [820, 1180], [768, 1024], [412, 915], [390, 844], [360, 640]];

describe('screen layout', () => {
  it('fits the three columns inside the stage on every wide window', () => {
    for (const exp of [false, true]) {
      for (const [vw, vh] of SIZES) {
        const L = computeLayout({ vw, vh, exp });
        if (L.mode !== 'wide') continue;
        expect(L.sideW + L.cardsW + L.boardColW + 2 * 12 + 20).toBeCloseTo(L.w, 0);
        expect(L.cell * 5.9615).toBeLessThanOrEqual(L.boardColW + 1);
        expect(L.cell * 6.692 + 32).toBeLessThanOrEqual(L.h + 60); // the board and its buttons fit the height
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
  });

  it('switches between the layouts at one aspect ratio', () => {
    expect(computeLayout({ vw: 1300, vh: 1000 }).mode).toBe('wide');
    expect(computeLayout({ vw: 1290, vh: 1000 }).mode).toBe('tall');
  });

  it('uses a bigger scale on small windows than a fixed 1560 stage would', () => {
    expect(computeLayout({ vw: 1366, vh: 768 }).k).toBeGreaterThan(1366 / 1560);
  });
});
