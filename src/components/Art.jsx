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

export function Gem({ kind, size = 28, className = '' }) {
  return (
    <svg className={`gem-svg ${className}`} width={size} height={size} viewBox="0 0 64 64">
      <GemShape kind={kind} />
    </svg>
  );
}

function Flask() {
  return (
    <g>
      <path d="M42 22h16v14l14 26a8 8 0 0 1-7 12H35a8 8 0 0 1-7-12l14-26z" transform="translate(-6 -10) scale(.9)" fill="rgba(180,140,230,.25)" stroke="#6b3aa8" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 54h28l8 14a6 6 0 0 1-5 9H33a6 6 0 0 1-5-9z" transform="translate(-6 -10) scale(.9)" fill="url(#liquid)" />
      <circle cx="46" cy="64" r="3" fill="#fff" opacity=".6" />
      <circle cx="56" cy="58" r="2" fill="#fff" opacity=".5" />
      <path d="M36 30l-8 18" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" transform="translate(-2 -4)" />
    </g>
  );
}

export function TokenArt({ kind, size = 52 }) {
  const p = PAL[kind];
  let inner;
  if (kind === 'pearl') {
    inner = (
      <g>
        <ellipse cx="50" cy="73" rx="17" ry="3" fill="rgba(0,0,0,.22)" />
        <circle cx="50" cy="50" r="21" fill="url(#pearlg)" stroke="rgba(150,100,180,.5)" strokeWidth="1" />
        <ellipse cx="42" cy="41" rx="7" ry="4.5" fill="#fff" opacity=".85" transform="rotate(-30 42 41)" />
      </g>
    );
  } else if (kind === 'gold') {
    inner = (
      <g>
        <ellipse cx="50" cy="73" rx="18" ry="3" fill="rgba(0,0,0,.25)" />
        <path d="M27 60L25 47l9-13 14-6 15 4 10 12-2 15-12 10H40z" fill="url(#goldg)" stroke="#8a5a00" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M34 34l14 10 15-12M48 44l-4 24M48 44l20 8M25 47l19-3" stroke="#fff6b8" strokeOpacity=".7" strokeWidth="1.4" fill="none" />
      </g>
    );
  } else if (kind === 'glass') {
    inner = (
      <svg x="24" y="22" width="52" height="56" viewBox="0 0 80 90" overflow="visible">
        <Flask />
      </svg>
    );
  } else {
    inner = (
      <g>
        <ellipse cx="50" cy="75" rx="15" ry="3" fill="rgba(0,0,0,.25)" />
        <svg x="22" y="20" width="56" height="56" viewBox="0 0 64 64" overflow="visible">
          <GemShape kind={kind} />
        </svg>
      </g>
    );
  }
  return (
    <svg className="tokart" width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`ring-${kind}`} cx=".32" cy=".28" r=".95">
          <stop offset="0" stopColor={p.l} />
          <stop offset=".55" stopColor={p.b} />
          <stop offset="1" stopColor={p.d} />
        </radialGradient>
        <radialGradient id="cream" cx=".4" cy=".3" r=".9">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#d6c7a8" />
        </radialGradient>
        <radialGradient id="pearlg" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#f6e3f8" />
          <stop offset="1" stopColor="#c59ad8" />
        </radialGradient>
        <linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0a0" />
          <stop offset=".5" stopColor="#f2b705" />
          <stop offset="1" stopColor="#a56d00" />
        </linearGradient>
        <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a8ff" />
          <stop offset="1" stopColor="#7a2fd0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#ring-${kind})`} stroke="rgba(0,0,0,.6)" strokeWidth="2" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" strokeDasharray="2 4" />
      <circle cx="50" cy="50" r="38.5" fill="rgba(0,0,0,.3)" />
      <circle cx="50" cy="50" r="36" fill="url(#cream)" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="1.5" />
      {inner}
      <path d="M17 32a37 37 0 0 1 28-19" stroke="rgba(255,255,255,.7)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Scroll({ size = 20 }) {
  return <ScrollText size={size} strokeWidth={1.75} className="shrink-0 text-primary" />;
}

export function Crown({ size = 16 }) {
  return <CrownIcon size={size} strokeWidth={1.5} fill="currentColor" className="shrink-0 text-amber-400" />;
}

/* Small flat icon used in cost pills and chips. */
export function Mini({ kind, size = 16 }) {
  if (kind === 'pearl') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <defs>
          <radialGradient id="miniPearl" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#c59ad8" />
          </radialGradient>
        </defs>
        <circle cx="8" cy="8" r="6.5" fill="url(#miniPearl)" />
      </svg>
    );
  }
  if (kind === 'glass') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <path d="M6 1.5h4V6l3.3 7a1.3 1.3 0 0 1-1.2 1.8H3.9A1.3 1.3 0 0 1 2.7 13L6 6z" fill="#a855f7" />
        <path d="M4.6 10h6.8l1.9 3.8H2.7z" fill="#d9a8ff" />
      </svg>
    );
  }
  if (kind === 'gold') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16">
        <path d="M2.5 10 2 6.5 5 3.5l4-1 4 2 1.5 3.5-1 3.5-3.5 2h-5z" fill="#f2b705" stroke="#a56d00" strokeWidth=".8" strokeLinejoin="round" />
      </svg>
    );
  }
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
