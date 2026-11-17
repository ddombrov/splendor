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

/** The photo used for each token kind; pearl and glassware have none and keep the modern picture. */
export const CLASSIC_TOKEN = { blue: 'blue', white: 'white', green: 'green', black: 'black', red: 'red', gold: 'gold' };

const ORDER = ['white', 'blue', 'green', 'red', 'black', 'pearl'];
const LEVEL = ['green', 'yellow', 'blue'];
const ABILITY = { extra: 'extra-turn', match: 'take-gem', privilege: 'privilege', steal: 'steal-gem' };
const ROYAL_ABILITY = { extra: 'extra-turn', privilege: 'privilege', steal: 'steal-gem' };

/** The printed picture of a card, or null when there is none (made-up cards, counterfeiters, expansion royals). */
export function classicCardFile(card) {
  let name = null;
  if (card.kind === 'royal') {
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
  return name && CLASSIC_FILES.has(name) ? name : null;
}
