// PROTOTYPE v3 direction B: Market. The opposite bet from A. The card market is the page and it
// scrolls; the token board is demoted to a small docked widget; the two players live in fixed
// corner panels, diagonally opposite; and everything you can actually do collects in one sticky
// deal bar along the bottom.
import { bonuses, colorPts, crowns, kinds, plan, pts, total } from '../engine/engine.js';
import { COLORS, CF_TEXT } from '../engine/data.js';
import { Crown, Gem } from '../components/Art.jsx';
import { Board, CfCardMini, cx, Deck, Pay, PCard, Pile, RoyalMini, Scrolls } from './bits.jsx';
import { pileAction } from './table.js';

export const name = 'Market';

const CARD_W = 94;

function Seat({ S, d, dispatch, idx, corner }) {
  const p = S.players[idx];
  const active = idx === S.cur;
  const b = bonuses(p);
  const click = pileAction(S, idx, dispatch);
  const held = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  return (
    <aside className={cx('tb-seat', corner, active && 'on', click && 'hot')}>
      <div className="tb-head">
        <span className="tb-dot" />
        <h3>{p.name}</h3>
        <span className="tb-vp">{pts(p)}</span>
      </div>
      <div className="tb-meta">
        <span>{crowns(p)} <Crown size={12} /></span>
        <span><Scrolls n={p.priv} size={13} /></span>
        <span className={cx(total(p) > 10 && 'over')}>{total(p)}/10 tokens</span>
      </div>

      <div className="tb-piles">
        {held.length === 0 && <span className="tp-none">no tokens</span>}
        {held.map((k) => <Pile key={k} kind={k} n={p.tok[k]} size={28} onClick={click ? () => click(k) : null} />)}
      </div>

      <div className="tb-bon">
        {COLORS.filter((c) => b[c]).map((c) => (
          <span key={c} className="tb-chip" title={`${b[c]} ${c} bonus`}><Gem kind={c} size={13} /><b>{b[c]}</b>{colorPts(p, c) ? <i>{colorPts(p, c)}v</i> : null}</span>
        ))}
        {p.royals.map((r) => <span key={r.id} className="tb-chip gold"><Crown size={12} /><b>{r.pts}</b></span>)}
      </div>

      {p.cf.length > 0 && (
        <ul className="tb-cf">
          {p.cf.map((c) => <li key={c.id} className={cx(S.used[c.id] && active && 'spent')}>{CF_TEXT[c.ab](c)}</li>)}
        </ul>
      )}

      {p.res.length > 0 && (
        <div className="tb-res">
          {p.res.map((c, i) =>
            active
              ? <PCard key={c.id} card={c} w={46} sel={S.selCard?.src === 'res' && S.selCard.i === i}
                  afford={d.idle && !!plan(S, p, c)} onClick={() => dispatch({ type: 'card', src: 'res', i })} />
              : <Deck key={c.id} level={c.level} label="" w={46} faceDown count={0} />,
          )}
        </div>
      )}
    </aside>
  );
}

export default function B({ S, dispatch, d, chrome }) {
  const act = (a) => () => dispatch(a);

  return (
    <div className="tb">
      <Seat S={S} d={d} dispatch={dispatch} idx={0} corner="tl" />
      <Seat S={S} d={d} dispatch={dispatch} idx={1} corner="br" />

      <div className="tb-dock">
        <div className="tb-dock-top">
          <span>Supply</span>
          <span>bag {S.bag.length}</span>
        </div>
        <Board S={S} d={d} dispatch={dispatch} cell={38} gap={4} />
        <div className="tb-dock-bot"><Scrolls n={S.privBoard} size={14} /> on the table</div>
        <button className="tb-btn go wide" disabled={!d.canTake} onClick={act({ type: 'take' })}>Take {d.canTake ? S.sel.length : ''} token{S.sel.length === 1 ? '' : 's'}</button>
        <div className="tb-dock-row">
          <button className="tb-btn" disabled={!d.canPriv} onClick={act({ type: 'priv' })}>{S.mode ? 'Cancel' : `Privilege ${d.p.priv}`}</button>
          <button className="tb-btn" disabled={!d.canRefill} onClick={act({ type: 'repl' })}>Refill</button>
        </div>
        {d.pd?.type === 'multi' && <button className="tb-btn go wide" onClick={act({ type: 'confirmMulti' })}>Confirm {d.pd.sel.length}</button>}
      </div>

      <main className="tb-col">
        <header className="tb-top">
          <img src="/images/logo.png" alt="Splendor Duel" />
          <div className="tb-tools">{chrome}</div>
        </header>

        <section className="tb-royals">
          <h4>Royals <em>3 and 6 crowns</em></h4>
          <div className="tb-strip">
            {S.royals.map((r, i) => <RoyalMini key={r.id} card={r} w={96} glow={d.pd?.type === 'royal'} onClick={() => dispatch({ type: 'royal', i })} />)}
            {!S.royals.length && <span className="tp-none">all claimed</span>}
          </div>
        </section>

        {[2, 1, 0].map((l) => (
          <section className="tb-level" key={l}>
            <h4>Level {l + 1} <em>{S.decks[l].length} left</em></h4>
            <div className="tb-strip">
              <Deck level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'deck', l })} />
              {S.pyr[l].map((c, i) => (
                <PCard key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                  afford={d.affordable(c)} onClick={() => dispatch({ type: 'card', src: 'pyr', l, i })} />
              ))}
            </div>
          </section>
        ))}

        {S.exp && (
          <section className="tb-level">
            <h4>Counterfeiters <em>{S.cdeck.length} left</em></h4>
            <div className="tb-strip">
              <Deck level="cf" label="CF" count={S.cdeck.length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'cdeck' })} />
              {S.crow.map((c, i) => (
                <CfCardMini key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'cf' && S.selCard.i === i}
                  afford={d.affordable(c) || d.pd?.type === 'freeCf'} onClick={() => dispatch({ type: 'card', src: 'cf', i })} />
              ))}
            </div>
          </section>
        )}

        {d.pd?.type === 'peek' && (
          <section className="tb-level">
            <h4>Reserve one of these</h4>
            <div className="tb-strip">
              {d.pd.cards.map((c, i) => <PCard key={c.id} card={c} w={CARD_W} afford onClick={() => dispatch({ type: 'peekPick', i })} />)}
            </div>
          </section>
        )}
      </main>

      <div className={cx('tb-deal', d.card && 'open')}>
        {d.card && <div className="tb-deal-card">{d.card.kind === 'cf' ? <CfCardMini card={d.card} w={70} /> : <PCard card={d.card} w={70} />}</div>}
        <div className="tb-deal-text">
          <b>{d.p.name}</b>
          <span className={cx(S.toast && 'warn')}>{d.prompt}</span>
          {d.card && (d.payPlan
            ? <span className="tb-deal-pay">pay <Pay list={d.payList} /></span>
            : <span className="tb-deal-pay warn">not affordable yet</span>)}
        </div>
        <div className="tb-deal-acts">
          {d.pd?.type === 'wild' && d.pd.colors.map((c) => (
            <button key={c} className="tb-btn go" onClick={act({ type: 'wild', c })}><Gem kind={c} size={14} /> {c}</button>
          ))}
          {d.endOpts.map((o) => <button key={o.k} className="tb-btn" onClick={act({ type: 'endabil', k: o.k })}>{o.t}</button>)}
          {d.pd?.type === 'endabil' && <button className="tb-btn go" onClick={act({ type: 'endDone' })}>Finish turn</button>}
          {d.canSkip && <button className="tb-btn" onClick={act({ type: 'skip' })}>Skip</button>}
          {(d.goldChosen || d.reservableSel) && <button className="tb-btn" onClick={act({ type: 'cancelReserve' })}>Cancel</button>}
          {(d.goldChosen || d.reservableSel) && (
            <button className="tb-btn go" disabled={!d.canRes} onClick={act({ type: 'reserve' })}>
              Reserve{d.goldChosen ? '' : ' (needs gold)'}
            </button>
          )}
          <button className="tb-btn go big" disabled={!d.canBuy} onClick={act({ type: 'buy' })}>Buy</button>
        </div>
      </div>
    </div>
  );
}
