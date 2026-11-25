import { createGame } from '../engine/engine.js';
import { JewelCard, CfCard, RoyalCard } from './Cards.jsx';
import { TokenArt } from './Art.jsx';
import { classicCardFile } from '../lib/look.js';
import { cardType } from '../lib/cardTypes.js';

// Every original piece beside the one that stands in for it. Opened from Settings: in its own tab for the modern
// look, or over the game for the Maaike version, which only a game with Maaike in it may show.
const S = createGame(true, 1, 0);
const JEWELS = [0, 1, 2].flatMap((l) => [...S.pyr[l], ...S.decks[l]]);
const CFS = [...S.crow, ...S.cdeck];
const ROYALS = [...S.royals, ...S.rdeck];
const TOKENS = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass', 'gold'];

const Pair = ({ label, children }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border border-white/15 bg-[#16202e] p-2 text-center text-[11px] text-white/70" style={{ width: 'fit-content' }}>
    <div className="flex items-center gap-2">{children}</div>
    <span className="max-w-[260px]">{label}</span>
  </div>
);
const Small = ({ children }) => <div className="compact-cards" style={{ zoom: 0.62 }}>{children}</div>;
// the printed counterfeiter cards are sideways, as the original game prints them
const Sideways = ({ card }) => (
  <div style={{ width: 189 * 0.62, height: 124 * 0.62, position: 'relative' }}>
    <img src={`/classic/${classicCardFile(card)}`} alt="" style={{ position: 'absolute', width: 124 * 0.62, height: 189 * 0.62, left: ((189 - 124) / 2) * 0.62, top: ((124 - 189) / 2) * 0.62, transform: 'rotate(-90deg)', borderRadius: 6 }} />
  </div>
);
const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

// Card backs: the original picture and the picture that replaces it in the look being compared.
const BACKS = [
  ['Level 1 (green)', '/classic/backs/level-1.jpg', '/modern/cards/backs/green.svg', '/maaike/backs/0.jpg'],
  ['Level 2 (yellow)', '/classic/backs/level-2.jpg', '/modern/cards/backs/yellow.svg', '/maaike/backs/1.jpg'],
  ['Level 3 (blue)', '/classic/backs/level-3.jpg', '/modern/cards/backs/blue.svg', '/maaike/backs/2.jpg'],
  ['Counterfeiter', '/classic/backs/counterfeiter.png', '/modern/cards/backs/purple.svg', '/maaike/backs/3.jpg'],
  ['Hidden reserved card', '/classic/backs/hidden.png', '/modern/cards/backs/rainbow.svg', '/maaike/backs/4.jpg'],
];
const Back = ({ src }) => (src
  ? <div style={{ width: 124 * 0.62, height: 189 * 0.62, borderRadius: 6, background: `url(${src}) center / 100% 100% no-repeat` }} />
  : <div style={{ width: 124 * 0.62, height: 189 * 0.62, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.3)' }} className="grid place-items-center text-[10px] text-white/50">none</div>);

const LEVEL_COLOUR = { 1: 'green', 2: 'yellow', 3: 'blue' };
const costText = (c) => Object.entries(c.cost).map(([k, n]) => `${n} ${k}`).join(', ');

export default function CardMapping({ right: RIGHT = 'modern', onClose }) {
  return (
    <div className={`fixed inset-0 space-y-6 overflow-auto p-6 text-white ${onClose ? 'z-[100] bg-[#0e1520]' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Card mapping</h1>
        {onClose && <button type="button" onClick={onClose} className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">Close</button>}
      </div>
      <Section title="Tokens">
        {TOKENS.map((k) => <Pair key={k} label={k}><TokenArt kind={k} size={56} look="classic" /><TokenArt kind={k} size={56} look={RIGHT} /></Pair>)}
      </Section>
      <Section title="Card backs">
        {BACKS.map(([label, classic, modern, maaike]) => <Pair key={label} label={label}><Back src={classic} /><Back src={RIGHT === 'maaike' ? (maaike ?? modern) : modern} /></Pair>)}
      </Section>
      <Section title={`Royal cards (${ROYALS.length})`}>
        {ROYALS.map((r) => <Pair key={r.id} label={`${r.pts} pt \u00b7 ${r.ab ?? 'no ability'}`}><Small><RoyalCard card={r} look="classic" /></Small><Small><RoyalCard card={r} look={RIGHT} /></Small></Pair>)}
      </Section>
      <Section title={`Counterfeiter cards (${CFS.length})`}>
        {CFS.map((c) => <Pair key={c.id} label={`${c.ab}${c.rc ? ` ${c.rc}` : ''} \u00b7 ${costText(c)}`}><Sideways card={c} /><Small><CfCard card={c} look={RIGHT} /></Small></Pair>)}
      </Section>
      {[1, 2, 3].map((level) => {
        const cards = JEWELS.filter((c) => c.level === level);
        const types = [...new Set(cards.map((c) => cardType(c).name))];
        return (
          <section key={level} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">{`Level ${level} cards, ${LEVEL_COLOUR[level]} back (${cards.length})`}</h2>
            {types.map((name) => {
              const group = cards.filter((c) => cardType(c).name === name);
              const t = cardType(group[0]);
              return (
                <div key={name} className="space-y-1">
                  <h3 className="text-xs font-semibold text-white/80">{`${name} → ${t.piece === 'neutral' ? t.neutral : t.piece} (${group.length})`}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.map((c) => <Pair key={c.id} label={`${c.bonus} · ${c.pts} pt${c.crowns ? ` · ${c.crowns} crown` : ''} · ${costText(c)}`}><Small><JewelCard card={c} look="classic" /></Small><Small><JewelCard card={c} look={RIGHT} /></Small></Pair>)}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
