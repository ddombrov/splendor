// PROTOTYPE v3: throwaway. Shared leaf pieces only (tokens, cards, decks). No layout lives here:
// every direction arranges these itself. Sizes are driven by props so each direction picks its own density.
import { PAL, Gem, Crown, Mini, TokenArt, Scroll, AbilityIcon } from '../components/Art.jsx';
import { CF_TEXT, ROYAL_TEXT } from '../engine/data.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

const COST_ORDER = ['blue', 'white', 'green', 'black', 'red', 'pearl', 'glass'];
const AB_LABEL = { extra: 'Extra turn', privilege: 'Take a privilege', match: 'Take a matching token', steal: 'Steal a token', wild: 'Wild bonus' };

export const Pips = ({ n, size }) => Array.from({ length: n }, (_, i) => <Crown key={i} size={size} />);

export function Pay({ list, size = 15 }) {
  return (
    <span className="tp-pay">
      {[...list].map(([k, n]) => (
        <span key={k} className="tp-pill"><Mini kind={k} size={size} /><b>{n}</b></span>
      ))}
    </span>
  );
}

function Cost({ cost }) {
  return (
    <div className="tp-cost">
      {COST_ORDER.filter((k) => cost[k]).map((k) => (
        <span key={k} className="tp-pill"><Mini kind={k} size="1.15em" /><b>{cost[k]}</b></span>
      ))}
    </div>
  );
}

/** One jewel card, scaled entirely off its width. */
export function PCard({ card, w = 84, sel, afford, dim, onClick }) {
  const wild = card.bonus === 'wild';
  const kind = wild ? 'wild' : card.bonus;
  const abil = card.ability || (wild ? 'wild' : null);
  const title = [wild && 'Wild bonus: copies one of your colours', card.ability && AB_LABEL[card.ability]].filter(Boolean).join(' + ');
  return (
    <div
      className={cx('tp-card', `tp-l${card.level}`, sel && 'sel', afford && 'afford', dim && 'dim', onClick && 'click')}
      style={{ '--cw': `${w}px`, '--tint': PAL[kind].glow }}
      onClick={onClick}
      title={title}
    >
      <div className="tp-art"><Gem kind={kind} size={w * 0.52} /></div>
      {card.pts > 0 && <div className="tp-pts">{card.pts}</div>}
      <div className="tp-crowns"><Pips n={card.crowns} size={w * 0.15} /></div>
      <div className="tp-bonus">
        <Gem kind={kind} size={w * 0.23} />
        {card.n > 1 && <b>×{card.n}</b>}
      </div>
      {abil && <div className="tp-ab"><AbilityIcon ab={abil} size={w * 0.16} /></div>}
      <Cost cost={card.cost} />
    </div>
  );
}

export function CfCardMini({ card, w = 84, sel, afford, onClick }) {
  return (
    <div
      className={cx('tp-card', 'tp-cf', sel && 'sel', afford && 'afford', onClick && 'click')}
      style={{ '--cw': `${w}px`, '--tint': PAL.glass.glow }}
      onClick={onClick}
      title={CF_TEXT[card.ab](card)}
    >
      <div className="tp-cfhead"><Mini kind="glass" size="1.1em" /> Counterfeiter</div>
      <div className="tp-note">{CF_TEXT[card.ab](card)}</div>
      {card.crowns > 0 && <div className="tp-cfcrowns"><Pips n={card.crowns} size={w * 0.15} /></div>}
      <Cost cost={card.cost} />
    </div>
  );
}

export function RoyalMini({ card, w = 72, glow, onClick }) {
  return (
    <div className={cx('tp-royal', glow && 'glow', onClick && 'click')} style={{ '--cw': `${w}px` }} onClick={onClick} title={ROYAL_TEXT[card.ab]}>
      <Crown size={w * 0.3} />
      <b>{card.pts}</b>
      <small>{ROYAL_TEXT[card.ab]}</small>
    </div>
  );
}

export function Deck({ level, count, label, w = 84, onClick, faceDown }) {
  return (
    <div className={cx('tp-card', 'tp-back', `tp-bk${level}`, count && onClick && 'click')} style={{ '--cw': `${w}px` }} onClick={count ? onClick : undefined}>
      <b>{label}</b>
      {!faceDown && <span className="tp-count">{count}</span>}
    </div>
  );
}

/** A single token on the supply board. */
export const Tok = ({ kind, size, cls, onClick }) => (
  <div className={cx('tp-tok', cls, onClick && 'click')} onClick={onClick}><TokenArt kind={kind} size={size} /></div>
);

/** A player's stack of one token kind, with its count. */
export const Pile = ({ kind, n, size = 34, onClick }) => (
  <div className={cx('tp-pile', onClick && 'click')} title={kind} onClick={onClick}>
    <TokenArt kind={kind} size={size} />
    <span>{n}</span>
  </div>
);

export const Scrolls = ({ n, size = 16 }) =>
  n > 0 ? Array.from({ length: n }, (_, i) => <Scroll key={i} size={size} />) : <span className="tp-none">0</span>;

/** The 5x5 supply board. Every direction frames it differently, so only the grid is shared. */
export function Board({ S, d, dispatch, cell = 48, gap = 5, className }) {
  return (
    <div className={cx('tp-board', className)} style={{ '--cell': `${cell}px`, '--gap': `${gap}px` }}>
      {S.board.map((c, i) => (
        <div className="tp-slot" key={i}>
          {c && <Tok kind={c} size={cell * 0.95} cls={d.cellCls(c, i)} onClick={() => dispatch({ type: 'tok', i })} />}
        </div>
      ))}
    </div>
  );
}
