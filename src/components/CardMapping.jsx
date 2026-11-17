import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createGame } from '../engine/engine.js';
import { JewelCard, CfCard, RoyalCard } from './Cards.jsx';
import { TokenArt } from './Art.jsx';

// Temporary: shows every original (classic) piece beside the modern piece that stands in for it.
const S = createGame(true, 1, 0);
const JEWELS = [0, 1, 2].flatMap((l) => [...S.pyr[l], ...S.decks[l]]);
const CFS = [...S.crow, ...S.cdeck];
const ROYALS = [...S.royals, ...S.rdeck];
const TOKENS = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass', 'gold'];

const Pair = ({ label, children }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-[11px] text-muted-foreground">
    <div className="flex items-center gap-2">{children}</div>
    <span>{label}</span>
  </div>
);
const Small = ({ children }) => <div className="compact-cards" style={{ '--z': 0.62, zoom: 0.62 }}>{children}</div>;

const costText = (c) => Object.entries(c.cost).map(([k, n]) => `${n} ${k}`).join(', ');
const jewelLabel = (c) => `L${c.level} · ${c.pts} pt${c.crowns ? ` · ${c.crowns} crown` : ''} · ${c.bonus}${c.ability ? ` · ${c.ability}` : ''} · ${costText(c)}`;

export default function CardMapping({ onClose }) {
  const Section = ({ title, children }) => (
    <section className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-[95vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Card mapping</DialogTitle>
          <DialogDescription>Each pair is the original picture on the left and the modern card or token that replaces it on the right. Temporary.</DialogDescription>
        </DialogHeader>
        <Section title="Tokens">
          {TOKENS.map((k) => <Pair key={k} label={k}><TokenArt kind={k} size={56} look="classic" /><TokenArt kind={k} size={56} look="modern" /></Pair>)}
        </Section>
        <Section title={`Royal cards (${ROYALS.length})`}>
          {ROYALS.map((r) => <Pair key={r.id} label={`${r.pts} pt · ${r.ab ?? 'no ability'}`}><Small><RoyalCard card={r} look="classic" /></Small><Small><RoyalCard card={r} look="modern" /></Small></Pair>)}
        </Section>
        <Section title={`Counterfeiter cards (${CFS.length})`}>
          {CFS.map((c) => <Pair key={c.id} label={`${c.ab}${c.rc ? ` ${c.rc}` : ''} · ${costText(c)}`}><Small><CfCard card={c} look="classic" /></Small><Small><CfCard card={c} look="modern" /></Small></Pair>)}
        </Section>
        <Section title={`Development cards (${JEWELS.length})`}>
          {JEWELS.map((c) => <Pair key={c.id} label={jewelLabel(c)}><Small><JewelCard card={c} look="classic" /></Small><Small><JewelCard card={c} look="modern" /></Small></Pair>)}
        </Section>
      </DialogContent>
    </Dialog>
  );
}
