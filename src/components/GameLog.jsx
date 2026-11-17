import { useEffect, useRef } from 'react';
import { TokenArt } from './Art.jsx';
import { JewelCard, CfCard, RoyalCard } from './Cards.jsx';

const WORDS = { blue: 'blue', white: 'white', green: 'green', black: 'black', red: 'red', pearl: 'pearl', gold: 'gold', glassware: 'glass', glass: 'glass' };
const TOKEN_RE = /\b(blue|white|green|black|red|pearl|gold|glassware|glass)\b/g;

const findCard = (S, id) => [...S.players.flatMap((p) => [...p.cards, ...p.cf, ...p.royals, ...p.res]), ...S.royals, ...S.crow].find((c) => c?.id === id);

function Line({ S, text }) {
  const m = /\s*\{card:([^}]+)\}/.exec(text);
  const card = m && findCard(S, m[1]);
  const plain = text.replace(/\s*\{card:[^}]+\}/, '');
  const parts = plain.split(TOKEN_RE);
  const Card = card?.kind === 'cf' ? CfCard : card?.kind === 'royal' ? RoyalCard : JewelCard;
  return (
    <li className="flex items-center gap-1.5">
      <span>
        {parts.map((p, i) => (i % 2 ? <span key={i} className="mx-0.5 inline-block align-middle"><TokenArt kind={WORDS[p]} size={20} /></span> : p))}
      </span>
      {card && <span className="compact-cards shrink-0" style={{ zoom: 0.3 }}><Card card={card} /></span>}
    </li>
  );
}

/** The game log, oldest first, scrolled to the latest line. */
export default function GameLog({ S }) {
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [S.log.length]);
  return (
    <div className="h-[50vh] overflow-y-auto pr-3">
      <ul className="space-y-1.5 text-sm">
        {[...S.log].reverse().map((l, i) => <Line key={i} S={S} text={l} />)}
      </ul>
      <div ref={end} />
    </div>
  );
}
