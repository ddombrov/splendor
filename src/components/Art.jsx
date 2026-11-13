import { ArrowLeftRight, Crosshair, Crown as CrownIcon, RotateCw, ScrollText } from 'lucide-react';

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

const FACETS = [
  '16,8 32,8 24,24 4,24',
  '32,8 48,8 40,24 24,24',
  '48,8 60,24 40,24',
  '4,24 24,24 32,58',
  '24,24 40,24 32,58',
  '40,24 60,24 32,58',
];
const tones = (kind) => {
  if (kind === 'wild') return ['#ff7f8b', '#fff6b8', '#6fe0a0', '#7db4ff', '#c78bff', '#2f6fe0'];
  const p = PAL[kind];
  return [p.l, p.h, p.b, p.b, p.l, p.d];
};

export function GemShape({ kind }) {
  const t = tones(kind);
  return (
    <g strokeLinejoin="round">
      {FACETS.map((pts, i) => (
        <polygon key={i} points={pts} fill={t[i]} stroke="rgba(255,255,255,.55)" strokeWidth=".9" />
      ))}
      <path d="M19 12l3 5M35 11l-2 8" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M44 15l3 4" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** One of the supplied gem pictures. A wild gem has no picture, so it stays a drawn rainbow gem. */
export function Gem({ kind, size = 28, className = '' }) {
  if (kind === 'wild') {
    return (
      <svg className={`gem-svg ${className}`} width={size} height={size} viewBox="0 0 64 64">
        <GemShape kind="wild" />
      </svg>
    );
  }
  return <img src={`/gems/${kind}.png`} width={size} height={size} alt="" draggable={false} className={`gem-img ${className}`} />;
}

export function TokenArt({ kind, size = 52 }) {
  const p = PAL[kind];
  return (
    <svg className="tokart" width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`ring-${kind}`} cx=".32" cy=".28" r=".95">
          <stop offset="0" stopColor={p.l} />
          <stop offset=".55" stopColor={p.b} />
          <stop offset="1" stopColor={p.d} />
        </radialGradient>
        <clipPath id="tokclip"><circle cx="50" cy="50" r="37" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#ring-${kind})`} stroke="rgba(0,0,0,.6)" strokeWidth="2" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" strokeDasharray="2 4" />
      <circle cx="50" cy="50" r="38.5" fill="rgba(0,0,0,.35)" />
      <circle cx="50" cy="50" r="37" fill="#10131a" />
      <image href={`/gems/${kind}.png`} x="11" y="11" width="78" height="78" clipPath="url(#tokclip)" preserveAspectRatio="xMidYMid slice" />
      <path d="M17 32a37 37 0 0 1 28-19" stroke="rgba(255,255,255,.55)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Scroll({ size = 20 }) {
  return <ScrollText size={size} strokeWidth={1.75} className="shrink-0 text-primary" />;
}

/** The picture is only legible when it is big; tiny crowns keep a clean outline. */
export function Crown({ size = 16 }) {
  if (size >= 28) return <img src="/gems/crown.png" width={size} height={size} alt="" draggable={false} className="gem-img shrink-0" />;
  return <CrownIcon size={size} strokeWidth={1.5} fill="currentColor" className="shrink-0 text-amber-400" />;
}

/** The small icon used in cost pills and chips: the same pictures as the gems. */
export function Mini({ kind, size = 16 }) {
  return <Gem kind={kind} size={size} />;
}

export function AbilityIcon({ ab, size = 24 }) {
  const props = { size, strokeWidth: 2 };
  if (ab === 'extra') return <RotateCw {...props} />;
  if (ab === 'privilege') return <ScrollText {...props} />;
  if (ab === 'match') return <Crosshair {...props} />;
  if (ab === 'steal') return <ArrowLeftRight {...props} />;
  if (ab === 'wild') return <Gem kind="wild" size={size} />;
  return null;
}
