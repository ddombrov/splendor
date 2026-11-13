import { randInt, shuffle as shuffleWith } from './rng.js';

export const COLORS = ['blue', 'white', 'green', 'black', 'red'];

export const ABILITY_TEXT = {
  extra: 'Take another turn',
  privilege: 'Take a privilege',
  match: 'Take a token of this colour',
  steal: 'Steal a token',
  wild: 'Wild bonus',
};

export function genJewels(level, rand) {
  const rnd = (a, b) => randInt(a, b, rand);
  const shuffle = (a) => shuffleWith(a, rand);
  const count = [30, 24, 13][level - 1];
  const cards = [];
  for (let i = 0; i < count; i++) {
    const total = level === 1 ? rnd(2, 5) : level === 2 ? rnd(5, 8) : rnd(8, 11);
    const k = Math.min(total, level === 1 ? rnd(1, 3) : rnd(2, 3));
    const pool = shuffle([...COLORS, ...(rand() < (level === 1 ? 0.25 : 0.5) ? ['pearl'] : [])]).slice(0, k);
    const cost = {};
    pool.forEach((g) => (cost[g] = 1));
    for (let t = total - k; t > 0; t--) {
      const g = pool[rnd(0, pool.length - 1)];
      if (cost[g] < 6) cost[g]++;
      else t++;
    }
    const pts = level === 1 ? (rand() < 0.35 ? 1 : 0) : level === 2 ? rnd(1, 3) : rnd(3, 6);
    const crowns = level === 1 ? (rand() < 0.1 ? 1 : 0) : level === 2 ? (rand() < 0.4 ? 1 : 0) : rnd(1, 2);
    const ability = rand() < [0.35, 0.4, 0.45][level - 1] ? ['extra', 'privilege', 'match', 'steal'][rnd(0, 3)] : null;
    const wild = level >= 2 && rand() < 0.12;
    const n = level === 3 && rand() < 0.3 ? 2 : level === 2 && rand() < 0.1 ? 2 : 1;
    cards.push({ id: `j${level}-${i}`, kind: 'jewel', level, cost, pts, crowns, ability, n, bonus: wild ? 'wild' : COLORS[i % 5], color: null });
  }
  return shuffle(cards);
}

export const CF_TEXT = {
  red2: (c) => `Spend up to 2 glassware: each cuts ${c.rc} cost by 2`,
  any1: () => 'Spend up to 2 glassware: each cuts any colour cost by 1',
  any3: () => 'Spend 2 glassware: cut one colour cost by 3',
  pearl1: () => 'Spend 1 glassware: cut pearl cost by 1',
  priv2: () => 'Privilege: take 2 tokens instead of 1 (once per turn)',
  xturn: () => 'End of turn: glassware + privilege for an extra turn',
  xsteal: () => 'End of turn: glassware + privilege to steal a token',
  royalbuy: () => 'End of turn: glassware (1 + your royals) to take a royal card',
  nolimit: () => 'Glassware does not count toward the 10 token limit',
  crowns2: () => 'Counts as 2 crowns',
  reserve5: () => 'Reserve up to 5 cards; reserve 2 at a time',
  peek: () => 'End of turn: 2 glassware, look at top 3 of a deck, reserve 1',
  matchplus: () => 'Match ability: take 2 matching tokens, or any 1 token',
};

export function genCounterfeiters(rand) {
  const rnd = (a, b) => randInt(a, b, rand);
  const shuffle = (a) => shuffleWith(a, rand);
  const abs = ['red2', 'red2', 'red2', 'any1', 'any1', 'any3', 'any3', 'pearl1', 'priv2', 'xturn', 'xsteal', 'royalbuy', 'nolimit', 'crowns2', 'reserve5', 'peek', 'matchplus'];
  return shuffle(
    abs.map((ab, i) => {
      const cost = { glass: rnd(1, 2) };
      const others = shuffle([...COLORS, 'pearl']).slice(0, rnd(1, 2));
      others.forEach((g) => (cost[g] = rnd(1, 2)));
      return { id: `cf${i}`, kind: 'cf', ab, rc: COLORS[rnd(0, 4)], cost, pts: 0, crowns: ab === 'crowns2' ? 2 : 0 };
    }),
  );
}

export const ROYAL_TEXT = {
  privilege: 'Take a privilege',
  extra: 'Take another turn',
  steal: 'Steal a token',
  take1: 'Take 1 token from the board',
  rreserve: 'Reserve any card',
  rgold: 'Take gold',
  w9c: '9 points of one colour wins',
  w9k: '9 crowns wins',
  rcounter: 'Free counterfeiter card',
  rtake4: 'Take up to 4 of one token type',
  rbag2: 'Take 2 from the bag',
  rtake3: 'Take up to 3 tokens from the board',
};

export const baseRoyals = () => [
  { id: 'b1', kind: 'royal', pts: 2, ab: 'privilege' },
  { id: 'b2', kind: 'royal', pts: 2, ab: 'extra' },
  { id: 'b3', kind: 'royal', pts: 2, ab: 'steal' },
  { id: 'b4', kind: 'royal', pts: 2, ab: 'take1' },
];
export const expRoyals = () => [
  { id: 'e1', kind: 'royal', pts: 2, ab: 'rreserve' },
  { id: 'e2', kind: 'royal', pts: 1, ab: 'rgold' },
  { id: 'e3', kind: 'royal', pts: 1, ab: 'w9c' },
  { id: 'e4', kind: 'royal', pts: 1, ab: 'w9k' },
  { id: 'e5', kind: 'royal', pts: 1, ab: 'rcounter' },
  { id: 'e6', kind: 'royal', pts: 1, ab: 'rtake4' },
  { id: 'e7', kind: 'royal', pts: 1, ab: 'rbag2' },
  { id: 'e8', kind: 'royal', pts: 1, ab: 'rtake3' },
];
