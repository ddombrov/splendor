/*
 * The picture types of the printed development cards. Each deck has a few types that come once in every
 * colour, and a few one-offs. Every type gets one piece of jewellery, drawn from public/modern/jewelry/<piece>/<gem>.png;
 * wild cards wear the rainbow version.
 */
export const GEM_VARIANT = { blue: 'sapphire', white: 'diamond', green: 'emerald', black: 'obsidian', red: 'ruby' };
const NEUTRAL = ['chalice', 'lantern', 'lamp']; // the gold goblet, the seal and the ornament, by level

/** { name, piece } for a development card; piece is a jewellery type or 'neutral'. */
export function cardType(card) {
  const { level, bonus } = card;
  if (bonus === 'none') return { name: ['Gold goblet', 'Gold seal and stamp', 'Gold ornament'][level - 1], piece: 'neutral', neutral: NEUTRAL[level - 1] };
  if (bonus === 'wild') {
    return level === 1 ? { name: 'Jeweller’s hands at the bench', piece: 'bezel-stud-earrings' }
      : level === 2 ? { name: 'Ring in a wooden vise', piece: 'solitaire-ring' }
        : card.crowns ? { name: 'Crown being set', piece: 'teardrop-pendant' } : { name: 'Sceptre', piece: 'gold-heart-locket' };
  }
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

/** The modern middle picture of a development card. */
export function centrePicture(card) {
  const t = cardType(card);
  if (t.piece === 'neutral') return `/modern/jewelry/neutral/${t.neutral}.png`;
  return `/modern/jewelry/${t.piece}/${card.bonus === 'wild' ? 'rainbow' : GEM_VARIANT[card.bonus]}.png`;
}

const CF_PIECES = ['solitaire-ring', 'bezel-stud-earrings', 'prong-stud-earrings', 'cushion-ring', 'round-gem-ring', 'three-stone-band'];
/** Counterfeiter cards wear amethyst jewellery, one piece per power. */
export const cfPicture = (card) => `/modern/jewelry/${CF_PIECES[Number(String(card.id).replace(/\D/g, '')) % CF_PIECES.length]}/amethyst.png`;
