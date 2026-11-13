// PROTOTYPE v3 direction A: Tabletop. One screen, nothing scrolls, everything sits where it would
// on a real table: the supply board in the middle, the market fanned to its left, royals to its
// right, and the two players seated diagonally opposite each other.
import { bonuses, colorPts, crowns, kinds, plan, pts, total, resCap } from '../engine/engine.js';
import { COLORS, CF_TEXT } from '../engine/data.js';
import { Crown, Gem, Mini } from '../components/Art.jsx';
import { Board, CfCardMini, cx, Deck, Pay, PCard, Pile, RoyalMini, Scrolls } from './bits.jsx';
import { pileAction } from './table.js';

export const name = 'Tabletop';

const CARD_W = 76;

function Seat({ S, d, dispatch, idx, corner }) {
  const p = S.players[idx];
  const active = idx === S.cur;
  const b = bonuses(p);
  const click = pileAction(S, idx, dispatch);
  const held = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  return (
    <div className={cx('ta-seat', corner, active && 'on', click && 'hot')}>
      <div className="ta-who">
        <span className="ta-name">{p.name}</span>
        <span className="ta-vp"><b>{pts(p)}</b> pts</span>
        <span className="ta-chip"><b>{crowns(p)}</b><Crown size={13} /></span>
        <span className="ta-chip"><Scrolls n={p.priv} size={14} /></span>
        <span className="ta-chip ta-tot">{total(p)}/10</span>
      </div>

      <div className="ta-goods">
        <div className="ta-piles">
          {held.length === 0 && <span className="tp-none">no tokens</span>}
          {held.map((k) => <Pile key={k} kind={k} n={p.tok[k]} size={30} onClick={click ? () => click(k) : null} />)}
        </div>
        <div className="ta-bon">
          {COLORS.filter((c) => b[c]).map((c) => (
            <span key={c} className="ta-gemchip" title={`${b[c]} ${c} bonus`}>
              <Gem kind={c} size={14} /><b>{b[c]}</b>{colorPts(p, c) ? <i>{colorPts(p, c)}v</i> : null}
            </span>
          ))}
          {p.royals.map((r) => <span key={r.id} className="ta-gemchip gold"><Crown size={13} /><b>{r.pts}</b></span>)}
          {p.cf.map((c) => <span key={c.id} className="ta-gemchip cf" title={CF_TEXT[c.ab](c)}><Mini kind="glass" size={13} /></span>)}
        </div>
        <div className="ta-res">
          {p.res.map((c, i) =>
            active
              ? <PCard key={c.id} card={c} w={44} sel={S.selCard?.src === 'res' && S.selCard.i === i}
                  afford={d.idle && !!plan(S, p, c)} onClick={() => dispatch({ type: 'card', src: 'res', i })} />
              : <Deck key={c.id} level={c.level} label="" w={44} faceDown count={0} />,
          )}
          {Array.from({ length: Math.max(0, Math.min(3, resCap(p)) - p.res.length) }, (_, i) => <span key={i} className="ta-slot" />)}
        </div>
      </div>
    </div>
  );
}

function Actions({ S, d, dispatch }) {
  const act = (a) => () => dispatch(a);
  return (
    <div className="ta-actions">
      <button className="ta-btn go" disabled={!d.canTake} onClick={act({ type: 'take' })}>Take {d.canTake ? S.sel.length : ''}</button>
      <button className="ta-btn go" disabled={!d.canBuy} onClick={act({ type: 'buy' })}>Buy</button>
      {(d.goldChosen || d.reservableSel) && <button className="ta-btn go" disabled={!d.canRes} onClick={act({ type: 'reserve' })}>Reserve</button>}
      {(d.goldChosen || d.reservableSel) && <button className="ta-btn" onClick={act({ type: 'cancelReserve' })}>Cancel</button>}
      <button className="ta-btn" disabled={!d.canPriv} onClick={act({ type: 'priv' })}>{S.mode ? 'Cancel privilege' : `Privilege ${d.p.priv}`}</button>
      <button className="ta-btn" disabled={!d.canRefill} onClick={act({ type: 'repl' })}>Refill</button>
      {d.pd?.type === 'multi' && <button className="ta-btn go" onClick={act({ type: 'confirmMulti' })}>Confirm {d.pd.sel.length}</button>}
      {d.canSkip && <button className="ta-btn" onClick={act({ type: 'skip' })}>Skip</button>}
      {d.pd?.type === 'wild' && d.pd.colors.map((c) => (
        <button key={c} className="ta-btn go" onClick={act({ type: 'wild', c })}><Gem kind={c} size={14} /> {c}</button>
      ))}
      {d.endOpts.map((o) => <button key={o.k} className="ta-btn" onClick={act({ type: 'endabil', k: o.k })}>{o.t}</button>)}
      {d.pd?.type === 'endabil' && <button className="ta-btn go" onClick={act({ type: 'endDone' })}>Finish turn</button>}
    </div>
  );
}

export default function A({ S, dispatch, d, chrome }) {
  const rows = [2, 1, 0]; // level 3 at the back of the table, level 1 nearest the players

  return (
    <div className="ta">
      <header className="ta-top">
        <Seat S={S} d={d} dispatch={dispatch} idx={0} corner="tl" />
        <img className="ta-logo" src="/images/logo.png" alt="Splendor Duel" />
        <div className="ta-tools">{chrome}</div>
      </header>

      <div className="ta-table">
        <section className="ta-market">
          {rows.map((l) => (
            <div className="ta-row" key={l}>
              <Deck level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'deck', l })} />
              {S.pyr[l].map((c, i) => (
                <PCard key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                  afford={d.affordable(c)} onClick={() => dispatch({ type: 'card', src: 'pyr', l, i })} />
              ))}
            </div>
          ))}
          {S.exp && (
            <div className="ta-row">
              <Deck level="cf" label="CF" count={S.cdeck.length} w={CARD_W} onClick={() => dispatch({ type: 'card', src: 'cdeck' })} />
              {S.crow.map((c, i) => (
                <CfCardMini key={c.id} card={c} w={CARD_W} sel={S.selCard?.src === 'cf' && S.selCard.i === i}
                  afford={d.affordable(c) || d.pd?.type === 'freeCf'} onClick={() => dispatch({ type: 'card', src: 'cf', i })} />
              ))}
            </div>
          )}
          {d.pd?.type === 'peek' && (
            <div className="ta-row ta-peek">
              {d.pd.cards.map((c, i) => <PCard key={c.id} card={c} w={CARD_W} afford onClick={() => dispatch({ type: 'peekPick', i })} />)}
            </div>
          )}
        </section>

        <section className="ta-centre">
          <div className="ta-tray">
            <Board S={S} d={d} dispatch={dispatch} cell={46} gap={5} />
          </div>
          <div className="ta-supply">
            <span><Scrolls n={S.privBoard} size={15} /> on the table</span>
            <span>bag {S.bag.length}</span>
          </div>
        </section>

        <aside className="ta-royals">
          <div className="ta-crownmark"><Crown size={22} /><b>3</b></div>
          {S.royals.map((r, i) => <RoyalMini key={r.id} card={r} w={78} glow={d.pd?.type === 'royal'} onClick={() => dispatch({ type: 'royal', i })} />)}
          <div className="ta-crownmark"><Crown size={22} /><b>6</b></div>
        </aside>
      </div>

      <footer className="ta-bot">
        <div className="ta-focus">
          {d.card
            ? (d.card.kind === 'cf' ? <CfCardMini card={d.card} w={92} /> : <PCard card={d.card} w={92} />)
            : <div className="ta-focus-empty">no card selected</div>}
        </div>
        <div className="ta-turn">
          <div className="ta-prompt">
            <b>{d.p.name}</b>
            <span className={cx(S.toast && 'warn')}>{d.prompt}</span>
          </div>
          {d.card && (
            <div className="ta-paying">
              {d.payPlan ? <>pay <Pay list={d.payList} /></> : <span className="warn">not affordable yet</span>}
            </div>
          )}
          <Actions S={S} d={d} dispatch={dispatch} />
        </div>
        <Seat S={S} d={d} dispatch={dispatch} idx={1} corner="br" />
      </footer>
    </div>
  );
}
