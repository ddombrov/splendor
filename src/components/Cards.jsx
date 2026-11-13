import { CF_TEXT, ROYAL_TEXT } from '../engine/data.js';
import { PAL, Gem, Crown, AbilityIcon, Mini } from './Art.jsx';

// Royal abilities that have a picture; the first three need no words, the rest keep their text.
const ICON_ONLY = ['privilege', 'extra', 'steal', 'take1', 'rtake3', 'rtake4', 'rbag2', 'rgold', 'rcounter', 'rreserve', 'w9c', 'w9k'];
// Counterfeiter powers that are just a picture and a number.
const CF_ICON = {
  any1: () => ['wild', '−1'],
  any3: () => ['wild', '−3'],
  red2: (c) => [`gem:${c.rc}`, '−2'],
  pearl1: () => ['gem:pearl', '−1'],
  priv2: () => ['privilege', '2'],
  xturn: () => ['extra', '', 'privilege'],
  xsteal: () => ['steal', '', 'privilege'],
  royalbuy: () => ['crown', '+'],
  crowns2: () => ['crown', '2'],
  reserve5: () => ['takecard', '5'],
  matchplus: () => ['match', '2'],
};
// A number drawn on the picture, for powers that take several tokens.
const ICON_COUNT = { rtake3: 3, rtake4: 4, rbag2: 2, w9c: '−1', w9k: '−1' };
const ROYAL_ICON = { privilege: 'privilege', extra: 'extra', steal: 'steal', take1: 'match', rtake3: 'match', rtake4: 'match', rbag2: 'bag', rcounter: 'takecard', rreserve: 'takecard', rgold: 'gold', w9c: 'wild', w9k: 'crown' };

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
      <div className="ptsrow">
        <div className="pts">{card.pts || ''}</div>
        <div className="crownrow">{Array.from({ length: card.crowns }, (_, i) => <Crown key={i} size={22} />)}</div>
      </div>
      <div className="bonus">
        {Array.from({ length: card.n }, (_, i) => <Gem key={i} kind={kind} size={card.n > 1 ? 22 : 26} />)}
      </div>
      {abil && (
        <div className="abil">
          <AbilityIcon ab={abil} size={28} />
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
      {card.crowns > 0 && <div className="crownrow cfcrowns"><Crown size={20} /><Crown size={20} /></div>}
      {CF_ICON[card.ab] ? (() => { const [pic, num, sub] = CF_ICON[card.ab](card); return (
        <div className="note iconly">
          <span className="relative inline-flex">
            <AbilityIcon ab={pic} size={44} />
            {num && <b className="iconcount">{num}</b>}
            {sub && <span className="iconsub"><AbilityIcon ab={sub} size={24} /></span>}
          </span>
        </div>
      ); })() : (
        <div className="note">{CF_TEXT[card.ab](card)}</div>
      )}
      <Costs cost={card.cost} />
    </div>
  );
}

export function RoyalCard({ card, onClick, glow }) {
  return (
    <div className={`card royal ${glow ? 'afford' : ''}`} onClick={onClick}>
      <div className="ptsrow"><div className="pts">{card.pts}</div></div>
      <div className="royal-crown"><Crown size={42} /></div>
      <div className={`note royaltext ${ICON_ONLY.includes(card.ab) ? 'iconly' : ''}`}>
        {ROYAL_ICON[card.ab] && (
          <span className="relative inline-flex">
            <AbilityIcon ab={ROYAL_ICON[card.ab]} size={ICON_ONLY.includes(card.ab) ? 44 : 24} />
            {ICON_COUNT[card.ab] && <b className="iconcount">{ICON_COUNT[card.ab]}</b>}
          </span>
        )}
        {!ICON_ONLY.includes(card.ab) && ROYAL_TEXT[card.ab]}
      </div>
      <div className="rmark l" title="Claim a royal card at 3 crowns"><Crown size={34} /><b>3</b></div>
      <div className="rmark r" title="Claim a royal card at 6 crowns"><Crown size={34} /><b>6</b></div>
    </div>
  );
}

/** A face-down card or deck: just the back artwork. */
export function CardBack({ level, count, onClick }) {
  return <div className={`card back lv${level}`} onClick={count ? onClick : undefined} />;
}
