/*
 * The picture types of the printed development cards. Each deck has a few types that come once in every
 * colour, and a few one-offs. Every type gets one piece of jewellery, drawn from public/modern/jewelry/<piece>/<gem>.png.
 */
export const GEM_VARIANT = { blue: 'sapphire', white: 'diamond', green: 'emerald', black: 'obsidian', red: 'ruby' };
const NEUTRAL = ['chalice', 'lantern', 'lamp']; // the gold goblet, the seal and the ornament, by level

/** { name, piece } for a development card; piece is a jewellery type, 'neutral' or 'wild'. */
export function cardType(card) {
  const { level, bonus } = card;
  if (bonus === 'none') return { name: ['Gold goblet', 'Gold seal and stamp', 'Gold ornament'][level - 1], piece: 'neutral', neutral: NEUTRAL[level - 1] };
  if (bonus === 'wild') return { name: ['Jeweller’s hands at the bench', 'Ring in a wooden vise', card.crowns ? 'Crown being set' : 'Sceptre'][level - 1], piece: 'wild' };
  if (level === 1) {
    if (card.ability === 'match') return { name: 'Loose gem on parchment', piece: 'stone-tablet' };
    if (card.ability === 'extra') return { name: 'Necklace on a bust', piece: 'teardrop-necklace' };
    if (card.crowns) return { name: 'Gold circlet on cloth', piece: 'three-stone-band' };
    if (card.pts === 1) return { name: 'Sword hilt', piece: 'shadow-amulet' };
    return { name: 'Woman with earring', piece: 'stud-earring' };
  }
  if (level === 2) {
    if (card.n === 2) return { name: 'Bare hand wearing rings', piece: 'round-gem-ring' };
    if (card.ability === 'steal') return { name: 'Gloved hand reaching for a ring', piece: 'cushion-ring' };
    if (card.ability === 'privilege') return { name: 'Signet ring on scrolls', piece: 'signet-ring' };
    return { name: 'Tiara in a jewel box', piece: 'silver-ring' };
  }
  return card.pts === 4 ? { name: 'Woman wearing a necklace', piece: 'heart-necklace' } : { name: 'Royal crown on a cushion', piece: 'teardrop-pendant' };
}

/** The modern middle picture of a development card, or null for the rainbow-bug wild cards. */
export function centrePicture(card) {
  const t = cardType(card);
  if (t.piece === 'wild') return null;
  if (t.piece === 'neutral') return `/modern/jewelry/neutral/${t.neutral}.png`;
  return `/modern/jewelry/${t.piece}/${GEM_VARIANT[card.bonus]}.png`;
}

const CF_PIECES = ['solitaire-ring', 'bezel-stud-earrings', 'prong-stud-earrings', 'cushion-ring', 'round-gem-ring', 'three-stone-band'];
/** Counterfeiter cards wear amethyst jewellery, one piece per power. */
export const cfPicture = (card) => `/modern/jewelry/${CF_PIECES[Number(String(card.id).replace(/\D/g, '')) % CF_PIECES.length]}/amethyst.png`;

// A piece is drawn the same size on every card that shows it. Its size is the biggest one that clears the cost
// rows of every printed card with that piece (the cost rows run up the left side, starting at costTop).
import { jewelCards } from '../engine/cards.js';
const costTop = (card) => 182 - Object.keys(card.cost).length * 19 - (Object.keys(card.cost).length - 1) * 3;
const keyOf = (card) => { const t = cardType(card); return t.piece === 'neutral' ? t.neutral : t.piece; };
const SIZE = {};
for (const level of [1, 2, 3]) {
  for (const card of jewelCards(level)) {
    const k = keyOf(card);
    SIZE[k] = Math.min(SIZE[k] ?? 104, costTop(card) - 34);
  }
}
/** The size in pixels for the picture on this card (104 means full size). */
export const pieceSize = (card) => SIZE[keyOf(card)] ?? Math.min(104, costTop(card) - 34);
