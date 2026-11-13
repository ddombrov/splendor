/*
 * The engine's only source of randomness. A game keeps the generator state in `rng`,
 * so the same state and the same action always give the same result.
 */
export function nextRandom(holder) {
  holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const shuffle = (a, rand) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const randInt = (a, b, rand) => a + Math.floor(rand() * (b - a + 1));
