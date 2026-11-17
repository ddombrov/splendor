import { useSyncExternalStore } from 'react';
import { CLASSIC_FILES } from './classicFiles.js';

/*
 * The "original look" option: photographed tokens, card backs and printed card faces instead of the
 * modern artwork. It is a preference of this browser, changed from the home page settings.
 */
const KEY = 'sd-look';
const listeners = new Set();

const read = () => { try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'modern'; } catch { return 'modern'; } };
let look = read();
const apply = () => { if (typeof document !== 'undefined') document.documentElement.dataset.look = look; };
apply();

export const getLook = () => look;
export function setLook(next) {
  look = next === 'classic' ? 'classic' : 'modern';
  try { localStorage.setItem(KEY, look); } catch { /* ignore */ }
  apply();
  listeners.forEach((fn) => fn());
}
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const useLook = () => useSyncExternalStore(subscribe, getLook);

/** A true/false option remembered in this browser, readable anywhere and as a hook. */
function makePref(key) {
  let value = (() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } })();
  const get = () => value;
  const set = (on) => {
    value = !!on;
    try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* ignore */ }
    listeners.forEach((fn) => fn());
  };
  return { get, set, use: () => useSyncExternalStore(subscribe, get) };
}

// Whether each stack of cards in a hand shows how many cards it holds, and the options for the next game.
export const countersPref = makePref('sd-counters');
export const expPref = makePref('sd-exp');
export const cardsPref = makePref('sd-random-cards');
export const useCounters = countersPref.use;

/** The picture used for each token kind. */
export const CLASSIC_TOKEN = { blue: 'blue.png', white: 'white.png', green: 'green.png', black: 'black.png', red: 'red.png', gold: 'gold.png', pearl: 'pearl.png', glass: 'glass.png' };

/** The printed counterfeiter cards (they are printed sideways; the pictures are already turned upright). */
const CF_FILE = {
  'red2:green': '01_reduce-green-by-2', 'red2:red': '02_reduce-red-by-2', 'red2:blue': '03_reduce-blue-by-2', 'red2:white': '04_reduce-white-by-2', 'red2:black': '05_reduce-black-by-2',
  any3: '06_2-glassware-reduce-one-color-by-3', pearl1: '07_reduce-pearl-by-1', any1: '08_reduce-any-color-by-1', royalbuy: '09_take-royal-card', xturn: '10_privilege-extra-turn',
  xsteal: '11_privilege-steal-token', nolimit: '12_ignore-glassware-token-limit', priv2: '13_privilege-take-2-tokens', crowns2: '14_two-crowns', reserve5: '15_5-reserved-cards',
  matchplus: '16_take-2-tokens-or-any-token', peek: '17_pick-from-top-3',
};
export const CLASSIC_COUNTERFEITERS = Object.values(CF_FILE).map((n) => `counterfeiters/counterfeiter_${n}.png`);

const EXP_ROYAL = {
  rreserve: 'royal_01_reserve-any-card', rgold: 'royal_02_take-gold-token', w9c: 'royal_03_9-points-one-color-wins', w9k: 'royal_04_9-crowns-wins',
  rcounter: 'royal_05_take-counterfeiter-card', rtake4: 'royal_06_take-4-same-tokens', rbag2: 'royal_07_take-2-from-bag', rtake3: 'royal_08_take-3-tokens',
};

const ORDER = ['white', 'blue', 'green', 'red', 'black', 'pearl'];
const LEVEL = ['green', 'yellow', 'blue'];
const ABILITY = { extra: 'extra-turn', match: 'take-gem', privilege: 'privilege', steal: 'steal-gem' };
const ROYAL_ABILITY = { extra: 'extra-turn', privilege: 'privilege', steal: 'steal-gem' };

/** The printed picture of a card, as a path under /classic/, or null when there is none (made-up cards, counterfeiters). */
export function classicCardFile(card) {
  let name = null;
  if (card.kind === 'cf') {
    const f = CF_FILE[card.ab === 'red2' ? `red2:${card.rc}` : card.ab];
    return f ? `counterfeiters/counterfeiter_${f}.png` : null;
  }
  if (card.kind === 'royal') {
    if (EXP_ROYAL[card.ab]) return `royals/${EXP_ROYAL[card.ab]}.png`;
    if (card.ab && !ROYAL_ABILITY[card.ab]) return null;
    name = `royal-card_${card.pts}pts${card.ab ? `_${ROYAL_ABILITY[card.ab]}` : ''}.jpg`;
  } else if (card.kind === 'jewel') {
    const gem = card.bonus === 'wild' ? 'wild-gem' : card.bonus === 'none' ? 'no-gem' : card.n === 2 ? `2-${card.bonus}-gem` : `${card.bonus}-gem`;
    const parts = [
      `${LEVEL[card.level - 1]}-card`,
      gem,
      card.pts === 1 ? '1pt' : `${card.pts}pts`,
      ...(card.crowns ? [`${card.crowns}crown${card.crowns > 1 ? 's' : ''}`] : []),
      ...(card.ability ? [ABILITY[card.ability]] : []),
      `cost-${ORDER.filter((k) => card.cost[k]).map((k) => `${card.cost[k]}${k}`).join('-')}`,
    ];
    name = `${parts.join('_')}.jpg`;
  }
  if (!name || !CLASSIC_FILES.has(name)) return null;
  return card.kind === 'royal' ? `royals/${name}` : `cards/level-${card.level}/${name}`;
}
