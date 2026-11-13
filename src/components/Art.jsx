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
};

/** A gem picture, cut out so it keeps its own shape. The wild bonus uses the rainbow gem icon. */
export function Gem({ kind, size = 28, className = '' }) {
  const src = kind === 'wild' ? '/icons/any-color-gem.png' : `/gems/${kind}.png`;
  return <img src={src} width={size} height={size} alt="" draggable={false} className={`gem-img ${className}`} />;
}

/** A flat token: a coloured rim, a dark centre, and the gem picture. No gloss and no shadow. */
export function TokenArt({ kind, size = 52 }) {
  const p = PAL[kind];
  return (
    <svg className="tokart" width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={p.b} stroke={p.d} strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="#10131a" />
      <image href={`/gems/${kind}.png`} x="17" y="17" width="66" height="66" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/** The privilege scroll. */
export function Scroll({ size = 20 }) {
  return <img src="/icons/scroll.png" height={size} alt="" draggable={false} className="shrink-0" style={{ width: 'auto', height: size }} />;
}

/** The crown picture, the same one the royal cards use, at any size. */
export function Crown({ size = 16 }) {
  return <img src="/gems/crown.png" width={size} height={size} alt="" draggable={false} className="gem-img shrink-0" />;
}

/** The small icon used in cost pills and chips: the same pictures as the gems. */
export function Mini({ kind, size = 16 }) {
  return <Gem kind={kind} size={size} />;
}

const ABILITY_ICON = { extra: 'go-again', privilege: 'scroll', match: 'take-from-board', steal: 'steal', wild: 'any-color-gem', bag: 'bag', takecard: 'take-card' };

/** The picture for a card ability: go again, privilege scroll, take from the board, steal, any colour. */
export function AbilityIcon({ ab, size = 24 }) {
  if (ab === 'crown') return <Crown size={size} />;
  if (ab === 'gold') return <Gem kind="gold" size={size} />;
  const name = ABILITY_ICON[ab];
  if (!name) return null;
  return <img src={`/icons/${name}.png`} alt="" draggable={false} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

/** The green tick, used wherever something is done or complete. */
export function CompleteIcon({ size = 16 }) {
  return <img src="/icons/complete.png" alt="" draggable={false} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}
