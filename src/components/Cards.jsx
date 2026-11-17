import { CF_TEXT, ROYAL_TEXT } from '../engine/data.js';
import { classicCardFile, useLook } from '../lib/look.js';
import { centrePicture, cfPicture } from '../lib/cardTypes.js';
import { PAL, Gem, Crown, AbilityIcon, Mini } from './Art.jsx';

// Royal abilities that have a picture; the first three need no words, the rest keep their text.
const ICON_ONLY = ['privilege', 'extra', 'steal', 'take1', 'rtake3', 'rtake4', 'rbag2', 'rgold', 'rcounter', 'rreserve', 'w9c', 'w9k'];
// Counterfeiter powers that are just a picture and a number.
export const CF_ICON = {
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
  nolimit: () => ['gem:glass', '', 'xmark'],
  peek: () => ['takecard', '3', 'eye'],
};
// A number drawn on the picture, for powers that take several tokens.
export const ICON_COUNT = { rtake3: 3, rtake4: 4, rbag2: 2, w9c: '−1', w9k: '−1' };
export const ROYAL_ICON = { privilege: 'privilege', extra: 'extra', steal: 'steal', take1: 'match', rtake3: 'match', rtake4: 'match', rbag2: 'bag', rcounter: 'takecard', rreserve: 'takecard', rgold: 'gold', w9c: 'wild', w9k: 'crown' };

const COST_ORDER = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass', 'gold'];
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

/** A card drawn as its printed picture (the original look). */
function PrintedCard({ card, file, onClick, selected, afford }) {
  return (
    <div data-card-id={card.id} className={`card imgcard ${selected ? 'sel' : ''} ${afford ? 'afford' : ''}`} onClick={onClick}>
      <img src={`/classic/${file}`} alt="" draggable={false} />
    </div>
  );
}

export function JewelCard({ card, onClick, selected, afford, look: forced }) {
  const current = useLook();
  const look = forced ?? current;
  const file = look === 'classic' ? classicCardFile(card) : null;
  if (file) return <PrintedCard card={card} file={file} onClick={onClick} selected={selected} afford={afford} />;
  const wild = card.bonus === 'wild';
  const kind = wild ? 'wild' : card.bonus;
  const abil = card.ability;
  const centre = card.bonus === 'wild' ? '/shared/icons/any-color-gem.png' : centrePicture(card); // the rainbow bug stands in for wild cards
  const title = [wild && 'Wild bonus: copies one of your colours', card.ability && AB_LABEL[card.ability]].filter(Boolean).join(' + ');
  return (
    <div
      data-card-id={card.id}
      className={`card jewel l${card.level} k-${kind} ${selected ? 'sel' : ''} ${afford ? 'afford' : ''}`}
      style={{ '--tint': PAL[kind].glow }}
      onClick={onClick}
      title={title}
    >
      <div className="art">{centre ? <img src={centre} alt="" draggable={false} className="jewelart" /> : kind !== 'none' && <Gem kind={kind} size={62} />}</div>
      <div className="ptsrow">
        <div className="pts">{card.pts || ''}</div>
        <div className="crownrow">{Array.from({ length: card.crowns }, (_, i) => <Crown key={i} size={22} />)}</div>
      </div>
      <div className="bonus">
        {Array.from({ length: card.n }, (_, i) => (wild
          ? <img key={i} src="/modern/jewelry/wild-gems.png" width={28} height={28} alt="" draggable={false} className="gem-img" />
          : <Gem key={i} kind={kind} size={card.n > 1 ? 22 : 26} />))}
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

export function CfCard({ card, onClick, selected, afford, look: forced }) {
  const current = useLook();
  const look = forced ?? current;
  const piece = cfPicture(card);
  const file = look === 'classic' ? classicCardFile(card) : null;
  if (file) return <PrintedCard card={card} file={file} onClick={onClick} selected={selected} afford={afford} />;
  return (
    <div data-card-id={card.id} className={`card cfcard k-cf ${selected ? 'sel' : ''} ${afford ? 'afford' : ''}`} onClick={onClick}>
      {piece && <div className="art cfart"><img src={piece} alt="" draggable={false} className="jewelart" /></div>}
      {card.crowns > 0 && <div className="ptsrow"><div className="crownrow"><Crown size={20} /><Crown size={20} /></div></div>}
      {CF_ICON[card.ab] ? (() => { const [pic, num, sub] = CF_ICON[card.ab](card); return (
        <div className="note iconly">
          <span className="relative inline-flex">
            <AbilityIcon ab={pic} size={44} />
            {num && <b className="iconcount">{num}</b>}
            {sub && <span className={`iconsub ${sub}`}><AbilityIcon ab={sub} size={sub === 'eye' ? 30 : sub === 'xmark' ? 30 : 24} /></span>}
          </span>
        </div>
      ); })() : (
        <div className="note">{CF_TEXT[card.ab](card)}</div>
      )}
      <Costs cost={card.cost} />
    </div>
  );
}

// The base royals each have a picture of their own; the expansion royals keep the crown.
const ROYAL_ART = { steal: 'cloak', privilege: 'beret', extra: 'sunhat', none: 'necklace', rreserve: 'tassel', rgold: 'scarf', w9c: 'butterfly', rcounter: 'cloak-blue', rtake4: 'snake', rbag2: 'hairclip', rtake3: 'turban' };

export function RoyalCard({ card, onClick, glow, look: forced }) {
  const current = useLook();
  const look = forced ?? current;
  const file = look === 'classic' ? classicCardFile(card) : null;
  if (file) return <PrintedCard card={card} file={file} onClick={onClick} afford={glow} />;
  const art = ROYAL_ART[card.ab ?? 'none'] ?? null;
  return (
    <div data-card-id={card.id} className={`card royal ${glow ? 'afford' : ''}`} onClick={onClick}>
      <div className="ptsrow"><div className="pts">{card.pts}</div></div>
      {art && <div className="royal-crown pic"><img src={`/modern/cards/royals/${art}.png`} alt="" draggable={false} className="royal-art" /></div>}
      {card.ab && (
        <div className={`note royaltext ${ICON_ONLY.includes(card.ab) ? 'iconly' : ''}`}>
          {ROYAL_ICON[card.ab] && (
            <span className="relative inline-flex">
              <AbilityIcon ab={ROYAL_ICON[card.ab]} size={ICON_ONLY.includes(card.ab) ? 44 : 24} />
              {ICON_COUNT[card.ab] && <b className="iconcount">{ICON_COUNT[card.ab]}</b>}
            </span>
          )}
          {!ICON_ONLY.includes(card.ab) && ROYAL_TEXT[card.ab]}
        </div>
      )}
      <div className="rmark l" title="Claim a royal card at 3 crowns"><Crown size={34} /><b>3</b></div>
      <div className="rmark r" title="Claim a royal card at 6 crowns"><Crown size={34} /><b>6</b></div>
    </div>
  );
}

/** A face-down card or deck: just the back artwork. */
export function CardBack({ level, count, onClick }) {
  return <div className={`card back lv${level}`} onClick={count ? onClick : undefined} />;
}
