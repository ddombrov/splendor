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

// Whether each stack of cards in a hand shows how many cards it holds.
const COUNTERS = 'sd-counters';
let counters = (() => { try { return localStorage.getItem(COUNTERS) === '1'; } catch { return false; } })();
export const getCounters = () => counters;
export function setCounters(on) {
  counters = !!on;
  try { localStorage.setItem(COUNTERS, counters ? '1' : '0'); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}
export const useCounters = () => useSyncExternalStore(subscribe, getCounters);

/** The photo used for each token kind; pearl and glassware have none and keep the modern picture. */
export const CLASSIC_TOKEN = { blue: 'blue.jpg', white: 'white.jpg', green: 'green.jpg', black: 'black.jpg', red: 'red.jpg', gold: 'gold.jpg', glass: 'glass.png' };

/** The picture of each counterfeiter power, in the order the expansion prints them. */
export const CLASSIC_POWER = {
  red2: '01_glassware-reduce-cost-by-2', any1: '02_glassware-reduce-any-color-by-1', any3: '03_2-glassware-reduce-single-color-by-3', pearl1: '04_glassware-reduce-pearl-by-1',
  priv2: '05_privilege-take-2-tokens', xturn: '06_privilege-glassware-extra-turn', xsteal: '07_privilege-glassware-steal-token', royalbuy: '08_glassware-take-royal-card',
  nolimit: '09_ignore-glassware-token-limit', crowns2: '10_two-crowns', reserve5: '11_5-reserved-cards', peek: '12_2-glassware-pick-from-top-3', matchplus: '13_take-2-tokens-or-any-token',
};

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
  if (card.kind === 'royal') {
    if (EXP_ROYAL[card.ab]) return `royals/${EXP_ROYAL[card.ab]}.png`;
    if (card.ab && !ROYAL_ABILITY[card.ab]) return null;
    name = `royal-card_${card.pts}pts${card.ab ? `_${ROYAL_ABILITY[card.ab]}` : ''}.png`;
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
    name = `${parts.join('_')}.png`;
  }
  return name && CLASSIC_FILES.has(name) ? `cards/${name}` : null;
}
