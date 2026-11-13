// PROTOTYPE v3 direction C: Duel. The screen is split on the diagonal: each player owns a corner
// and the tint of the felt behind it, the shared supply runs through the middle as one strip, and
// the controls move to whichever corner is on turn, so the board itself tells you whose move it is.
import { bonuses, colorPts, crowns, kinds, plan, pts, total } from '../engine/engine.js';
import { COLORS, CF_TEXT } from '../engine/data.js';
import { Crown, Gem, Mini } from '../components/Art.jsx';
import { Board, CfCardMini, cx, Deck, Pay, PCard, Pile, RoyalMini, Scrolls } from './bits.jsx';
import { pileAction } from './table.js';

export const name = 'Duel';

const CARD_W = 68;

function Side({ S, d, dispatch, idx }) {
  const p = S.players[idx];
  const active = idx === S.cur;
  const b = bonuses(p);
  const click = pileAction(S, idx, dispatch);
  const held = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  return (
    <div className={cx('tc-side', `p${idx}`, active && 'on', click && 'hot')}>
      <div className="tc-score">
        <b>{pts(p)}</b>
        <span>{p.name}</span>
      </div>
      <div className="tc-stats">
        <span>{crowns(p)}<Crown size={13} /></span>
        <span><Scrolls n={p.priv} size={13} /></span>
        <span className={cx(total(p) > 10 && 'over')}>{total(p)}/10</span>
      </div>
      <div className="tc-tokens">
        {held.length === 0 && <span className="tp-none">empty</span>}
        {held.map((k) => <Pile key={k} kind={k} n={p.tok[k]} size={26} onClick={click ? () => click(k) : null} />)}
      </div>
      <div className="tc-bars">
        {COLORS.filter((c) => b[c]).map((c) => (
          <span key={c} className="tc-bar" title={`${b[c]} ${c} bonus, ${colorPts(p, c)} points`}>
            <Gem kind={c} size={12} /><b>{b[c]}</b>
          </span>
        ))}
        {p.royals.map((r) => <span key={r.id} className="tc-bar gold"><Crown size={11} /><b>{r.pts}</b></span>)}
        {p.cf.map((c) => <span key={c.id} className="tc-bar cf" title={CF_TEXT[c.ab](c)}><Mini kind="glass" size={11} /></span>)}
      </div>
      <div className="tc-res">
        {p.res.map((c, i) =>
          active
            ? <PCard key={c.id} card={c} w={40} sel={S.selCard?.src === 'res' && S.selCard.i === i}
                afford={d.idle && !!plan(S, p, c)} onClick={() => dispatch({ type: 'card', src: 'res', i })} />
            : <Deck key={c.id} level={c.level} label="" w={40} faceDown count={0} />,
        )}
      </div>
    </div>
  );
}

function Control({ S, d, dispatch }) {
  const act = (a) => () => dispatch(a);
  return (
    <div className="tc-control">
      <div className="tc-say">
        <span className={cx('tc-prompt', S.toast && 'warn')}>{d.prompt}</span>
        {d.card && (
          <span className="tc-paying">
            {d.card.kind === 'cf' ? <CfCardMini card={d.card} w={52} /> : <PCard card={d.card} w={52} />}
            {d.payPlan ? <span>pay <Pay list={d.payList} size={14} /></span> : <span className="warn">not affordable</span>}
          </span>
        )}
      </div>
      <div className="tc-buttons">
        <button className="tc-btn go" disabled={!d.canTake} onClick={act({ type: 'take' })}>Take {d.canTake ? S.sel.length : ''}</button>
        <button className="tc-btn go" disabled={!d.canBuy} onClick={act({ type: 'buy' })}>Buy</button>
        {(d.goldChosen || d.reservableSel) && <button className="tc-btn go" disabled={!d.canRes} onClick={act({ type: 'reserve' })}>Reserve</button>}
        {(d.goldChosen || d.reservableSel) && <button className="tc-btn" onClick={act({ type: 'cancelReserve' })}>Cancel</button>}
        <button className="tc-btn" disabled={!d.canPriv} onClick={act({ type: 'priv' })}>{S.mode ? 'Cancel' : `Privilege ${d.p.priv}`}</button>
        <button className="tc-btn" disabled={!d.canRefill} onClick={act({ type: 'repl' })}>Refill</button>
        {d.pd?.type === 'multi' && <button className="tc-btn go" onClick={act({ type: 'confirmMulti' })}>Confirm {d.pd.sel.length}</button>}
        {d.canSkip && <button className="tc-btn" onClick={act({ type: 'skip' })}>Skip</button>}
        {d.pd?.type === 'wild' && d.pd.colors.map((c) => (
          <button key={c} className="tc-btn go" onClick={act({ type: 'wild', c })}><Gem kind={c} size={13} /> {c}</button>
        ))}
        {d.endOpts.map((o) => <button key={o.k} className="tc-btn" onClick={act({ type: 'endabil', k: o.k })}>{o.t}</button>)}
        {d.pd?.type === 'endabil' && <button className="tc-btn go" onClick={act({ type: 'endDone' })}>Finish turn</button>}
      </div>
    </div>
  );
}

export default function C({ S, dispatch, d, chrome }) {
  return (
    <div className={cx('tc', `turn${S.cur}`)}>
      <div className="tc-ground" aria-hidden />

      <div className="tc-row top">
        <Side S={S} d={d} dispatch={dispatch} idx={0} />
        {S.cur === 0 && <Control S={S} d={d} dispatch={dispatch} />}
        <div className="tc-brand"><img src="/images/logo.png" alt="Splendor Duel" />{chrome}</div>
      </div>

      <div className="tc-stage">
        <div className="tc-supply">
          <Board S={S} d={d} dispatch={dispatch} cell={44} gap={4} />
          <div className="tc-supply-foot"><Scrolls n={S.privBoard} size={14} /><span>bag {S.bag.length}</span></div>
        </div>

        <div className="tc-film">
          <div className="tc-crowns">
            {S.royals.map((r, i) => <RoyalMini key={r.id} card={r} w={62} glow={d.pd?.type === 'royal'} onClick={() => dispatch({ type: 'royal', i })} />)}
            {!S.royals.length && <span className="tp-none">royals all claimed</span>}
          </div>
          <div className="tc-reel">
            {[2, 1, 0].map((l) => (
              <div className="tc-group" key={l}>
                <Deck level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'deck', l })} />
                {S.pyr[l].map((c, i) => (
                  <PCard key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                    afford={d.affordable(c)} onClick={() => dispatch({ type: 'card', src: 'pyr', l, i })} />
                ))}
              </div>
            ))}
            {S.exp && (
              <div className="tc-group">
                <Deck level="cf" label="CF" count={S.cdeck.length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'cdeck' })} />
                {S.crow.map((c, i) => (
                  <CfCardMini key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'cf' && S.selCard.i === i}
                    afford={d.affordable(c) || d.pd?.type === 'freeCf'} onClick={() => dispatch({ type: 'card', src: 'cf', i })} />
                ))}
              </div>
            )}
            {d.pd?.type === 'peek' && (
              <div className="tc-group peek">
                {d.pd.cards.map((c, i) => <PCard key={c.id} card={c} w={CARD_W} afford onClick={() => dispatch({ type: 'peekPick', i })} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tc-row bottom">
        {S.cur === 1 && <Control S={S} d={d} dispatch={dispatch} />}
        <Side S={S} d={d} dispatch={dispatch} idx={1} />
      </div>
    </div>
  );
}
