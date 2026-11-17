import { CLASSIC_TOKEN, useLook } from '../lib/look.js';
export const PAL = {
  blue: { h: '#cfe6ff', l: '#7db4ff', b: '#2f6fe0', d: '#14409a', glow: '59,130,246' },
  white: { h: '#ffffff', l: '#eef3f9', b: '#c3d0e0', d: '#8b9bb3', glow: '226,232,240' },
  green: { h: '#c9f7dc', l: '#6fe0a0', b: '#1fa65a', d: '#0d6a38', glow: '34,197,94' },
  black: { h: '#a9b2c8', l: '#606a82', b: '#2c313e', d: '#0f1118', glow: '120,136,170' },
  red: { h: '#ffd0d5', l: '#ff7f8b', b: '#d8283a', d: '#8a1020', glow: '239,68,68' },
  pearl: { h: '#ffffff', l: '#f7e8fb', b: '#dcc0ea', d: '#a77fc0', glow: '196,161,232' },
  glass: { h: '#f1dcff', l: '#c78bff', b: '#9b4ee0', d: '#53208f', glow: '168,85,247' },
  gold: { h: '#fff6b8', l: '#ffd84a', b: '#f2b705', d: '#a56d00', glow: '250,204,21' },
  wild: { h: '#fff', l: '#fff', b: '#fff', d: '#999', glow: '255,255,255' },
  none: { h: '#fff', l: '#ddd', b: '#bbb', d: '#777', glow: '200,200,200' },
};

/** A gem picture, cut out so it keeps its own shape. The wild bonus uses the rainbow gem icon. */
export function Gem({ kind, size = 28, className = '' }) {
  const src = kind === 'wild' ? '/shared/icons/any-color-gem.png' : `/modern/tokens/${kind}.png`;
  return <img src={src} width={size} height={size} alt="" draggable={false} className={`gem-img ${className}`} />;
}

// A token is a vibrant rim around a dimmer disc of the same colour, so the gem stands out.
const RIM = { blue: '#3b82f6', white: '#e4ebf5', green: '#22c55e', black: '#7b8499', red: '#ef4444', pearl: '#d9b8ec', glass: '#a855f7', gold: '#facc15' };
const DISC = { blue: '#173a82', white: '#6c7d96', green: '#0f5a31', black: '#2b313d', red: '#7d1622', pearl: '#7a5a92', glass: '#4a1d82', gold: '#8a6205' };

/** A flat token: a vibrant rim, a dimmed disc of the same colour, and the gem on top. No gloss and no shadow. */
export function TokenArt({ kind, size = 52 }) {
  const look = useLook();
  if (look === 'classic' && CLASSIC_TOKEN[kind]) {
    return <img className="tokart classic" src={`/classic/tokens/${CLASSIC_TOKEN[kind]}`} width={size} height={size} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return (
    <svg className="tokart" width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={RIM[kind]} />
      <circle cx="50" cy="50" r="39" fill={DISC[kind]} />
      <image href={`/modern/tokens/${kind}.png`} x="14" y="14" width="72" height="72" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/** The privilege scroll. */
export function Scroll({ size = 20 }) {
  const look = useLook();
  return <img src={look === 'classic' ? '/classic/icons/privilege.png' : '/shared/icons/scroll.png'} height={size} alt="" draggable={false} className="shrink-0" style={{ width: 'auto', height: size }} />;
}

/** The crown picture, the same one the royal cards use, at any size. */
export function Crown({ size = 16 }) {
  return <img src="/shared/icons/crown.png" width={size} height={size} alt="" draggable={false} className="gem-img shrink-0" />;
}

/** The small icon used in cost pills and chips: the same pictures as the gems. */
export function Mini({ kind, size = 16 }) {
  return <Gem kind={kind} size={size} />;
}

const ABILITY_ICON = { extra: 'go-again', privilege: 'scroll', match: 'take-from-board', steal: 'steal', wild: 'any-color-gem', bag: 'bag', takecard: 'take-card', xmark: 'x-mark', eye: 'eyeball' };

/** The picture for a card ability: go again, privilege scroll, take from the board, steal, any colour. */
export function AbilityIcon({ ab, size = 24 }) {
  if (ab === 'crown') return <Crown size={size} />;
  if (ab === 'gold') return <Gem kind="gold" size={size} />;
  if (ab.startsWith('gem:')) return <Gem kind={ab.slice(4)} size={size} />;
  const name = ABILITY_ICON[ab];
  if (!name) return null;
  return <img src={`/shared/icons/${name}.png`} alt="" draggable={false} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

/** The green tick, used wherever something is done or complete. */
export function CompleteIcon({ size = 16 }) {
  return <img src="/shared/icons/complete.png" alt="" draggable={false} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

/** One of the picture icons in /icons, drawn at any size. */
export function Pic({ name, size = 24, className = '' }) {
  return <img src={`/shared/icons/${name}.png`} width={size} height={size} alt="" draggable={false} className={`shrink-0 ${className}`} />;
}
