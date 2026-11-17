import { createGame } from '../engine/engine.js';
import { JewelCard, CfCard, RoyalCard } from './Cards.jsx';
import { TokenArt } from './Art.jsx';
import { classicCardFile } from '../lib/look.js';
import { cardType } from '../lib/cardTypes.js';

// Temporary page (opened from Settings in its own tab): every original piece beside the modern one that stands in for it.
const S = createGame(true, 1, 0);
const JEWELS = [0, 1, 2].flatMap((l) => [...S.pyr[l], ...S.decks[l]]);
const CFS = [...S.crow, ...S.cdeck];
const ROYALS = [...S.royals, ...S.rdeck];
const TOKENS = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass', 'gold'];

const Pair = ({ label, children }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border border-white/15 p-2 text-center text-[11px] text-white/70" style={{ width: 'fit-content' }}>
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

const costText = (c) => Object.entries(c.cost).map(([k, n]) => `${n} ${k}`).join(', ');

export default function CardMapping() {
  return (
    <div className="min-h-screen space-y-6 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Card mapping</h1>
        <p className="text-sm text-white/70">Original picture on the left, the modern card or token that replaces it on the right. Temporary page: zoom the browser to see more or less.</p>
      </div>
      <Section title="Tokens">
        {TOKENS.map((k) => <Pair key={k} label={k}><TokenArt kind={k} size={56} look="classic" /><TokenArt kind={k} size={56} look="modern" /></Pair>)}
      </Section>
      <Section title={`Royal cards (${ROYALS.length})`}>
        {ROYALS.map((r) => <Pair key={r.id} label={`${r.pts} pt \u00b7 ${r.ab ?? 'no ability'}`}><Small><RoyalCard card={r} look="classic" /></Small><Small><RoyalCard card={r} look="modern" /></Small></Pair>)}
      </Section>
      <Section title={`Counterfeiter cards (${CFS.length})`}>
        {CFS.map((c) => <Pair key={c.id} label={`${c.ab}${c.rc ? ` ${c.rc}` : ''} \u00b7 ${costText(c)}`}><Sideways card={c} /><Small><CfCard card={c} look="modern" /></Small></Pair>)}
      </Section>
      <Section title={`Development cards (${JEWELS.length})`}>
        {JEWELS.map((c) => {
          const t = cardType(c);
          return <Pair key={c.id} label={`${t.name} \u2192 ${t.piece === 'neutral' ? t.neutral : t.piece} \u00b7 L${c.level} \u00b7 ${c.pts} pt${c.crowns ? ` \u00b7 ${c.crowns} crown` : ''} \u00b7 ${costText(c)}`}><Small><JewelCard card={c} look="classic" /></Small><Small><JewelCard card={c} look="modern" /></Small></Pair>;
        })}
      </Section>
    </div>
  );
}
