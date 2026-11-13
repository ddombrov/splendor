import { CF_TEXT, ROYAL_TEXT } from '../data.js';
import { PAL, Gem, Crown, AbilityIcon, Mini } from './Art.jsx';

const COST_ORDER = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass'];
const AB_LABEL = { extra: 'Extra turn', privilege: 'Privilege', match: 'Match', steal: 'Steal', wild: 'Wild' };

export function Costs({ cost }) {
  return (
    <div className="costs">
      {COST_ORDER.filter((k) => cost[k]).map((k) => (
        <span key={k} className="costpill">
          <Mini kind={k} size={15} />
          <b>{cost[k]}</b>
        </span>
      ))}
    </div>
  );
}

export function JewelCard({ card, onClick, selected, afford }) {
  const wild = card.bonus === 'wild';
  const kind = wild ? 'wild' : card.bonus;
  const abil = card.ability || (wild ? 'wild' : null);
  const title = [wild && 'Wild bonus: copies one of your colours', card.ability && AB_LABEL[card.ability]].filter(Boolean).join(' + ');
  return (
    <div
      className={`card jewel l${card.level} k-${kind} ${selected ? 'sel' : ''} ${afford ? 'afford' : ''}`}
      style={{ '--tint': PAL[kind].glow }}
      onClick={onClick}
      title={title}
    >
      <div className="art"><Gem kind={kind} size={62} /></div>
      <div className="pts">{card.pts || ''}</div>
      <div className="crownrow">{Array.from({ length: card.crowns }, (_, i) => <Crown key={i} size={15} />)}</div>
      <div className="bonus">
        <Gem kind={kind} size={26} />
        {card.n > 1 && <b>×{card.n}</b>}
      </div>
      {abil && (
        <div className="abil">
          <AbilityIcon ab={abil} size={16} />
          <small>{card.ability && wild ? 'Wild+' : AB_LABEL[abil]}</small>
        </div>
      )}
      <Costs cost={card.cost} />
    </div>
  );
}

export function CfCard({ card, onClick, selected, afford }) {
  return (
    <div className={`card cfcard k-cf ${selected ? 'sel' : ''} ${afford ? 'afford' : ''}`} onClick={onClick}>
      <div className="cfhead">
        <Mini kind="glass" size={16} />
        <span>Counterfeiter</span>
      </div>
      {card.crowns > 0 && <div className="crownrow cfcrowns"><Crown size={15} /><Crown size={15} /></div>}
      <div className="note">{CF_TEXT[card.ab](card)}</div>
      <Costs cost={card.cost} />
    </div>
  );
}

export function RoyalCard({ card, onClick, glow }) {
  return (
    <div className={`card royal ${glow ? 'afford' : ''}`} onClick={onClick}>
      <div className="pts">{card.pts}</div>
      <div className="royal-crown"><Crown size={40} /></div>
      <div className="note royaltext">{ROYAL_TEXT[card.ab]}</div>
    </div>
  );
}

export function CardBack({ level, count, onClick, label }) {
  const dots = level === 'cf' ? 4 : level;
  return (
    <div className={`card back lv${level}`} onClick={count ? onClick : undefined}>
      <div className="emblem">
        <b>{label}</b>
        <div className="dots">{Array.from({ length: dots }, (_, i) => <i key={i} />)}</div>
      </div>
      {count !== '' && <span className="count">{count}</span>}
    </div>
  );
}
