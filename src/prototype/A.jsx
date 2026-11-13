// PROTOTYPE v2, direction A: "Editorial". Light, typographic, hairline rules, no cards, no gold.
// Home is an expandable list. Payment is a receipt whose rows fill with segments as you pay.
import { DEPTHS, DIFFICULTIES, MODES, NAMES, SAMPLE_CODE, SOURCES, useNewGame, usePayment } from './model.js';

export const name = 'Editorial';

const HUE = { blue: '#2f5fd0', white: '#c9ced6', green: '#1f9d63', black: '#161616', red: '#d6403a', pearl: '#d9b8e6', gold: '#d9a526' };
const Dot = ({ kind }) => <i className="pa-dot" style={{ background: HUE[kind] }} />;

function Choice({ options, value, onChange }) {
  return (
    <div className="pa-choice">
      {options.map((o) => <button key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

export function Home() {
  const g = useNewGame('device');
  return (
    <div className="pa">
      <div className="pa-wrap">
        <h1 className="pa-title">Splendor<br />Duel</h1>
        <p className="pa-sub">A two-player game of jewels, crowns and prestige.</p>
        <ol className="pa-list">
          {MODES.map((m, i) => {
            const open = g.mode === m.key;
            return (
              <li key={m.key} className={open ? 'open' : ''}>
                <button className="pa-row" onClick={() => g.setMode(m.key)}>
                  <span className="pa-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pa-label">{m.label}<small>{m.blurb}</small></span>
                  <span className="pa-plus">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="pa-panel">
                    {g.has.code && (
                      <label className="pa-field"><span>Game code</span>
                        <input className="pa-code" value={g.code} onChange={(e) => g.setCode(e.target.value)} placeholder="00000" inputMode="numeric" />
                      </label>
                    )}
                    {g.has.setup && (
                      <>
                        <div className="pa-field"><span>Cards</span><Choice options={SOURCES} value={g.source} onChange={g.setSource} /></div>
                        <div className="pa-field"><span>Counterfeiters</span><Choice options={['Off', 'On']} value={g.exp ? 'On' : 'Off'} onChange={(v) => g.setExp(v === 'On')} /></div>
                      </>
                    )}
                    {g.has.ai && (
                      <>
                        <div className="pa-field"><span>Difficulty</span><Choice options={DIFFICULTIES} value={g.difficulty} onChange={g.setDifficulty} /></div>
                        <div className="pa-field"><span>Depth</span><Choice options={DEPTHS} value={g.depth} onChange={g.setDepth} /></div>
                      </>
                    )}
                    {g.has.quick && <p className="pa-note">Base game, shared cards. After a minute without a match you can play the computer instead.</p>}
                    {m.key === 'online' && <p className="pa-note">Your code will be <b>{SAMPLE_CODE}</b>.</p>}
                    <button className="pa-go" disabled={!g.ready}>{g.verb} <span>&rarr;</span></button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function Pay() {
  const p = usePayment();
  const { card } = p;
  return (
    <div className="pa">
      <div className="pa-wrap">
        <p className="pa-kicker">Level {card.level} &middot; {card.pts} points &middot; {card.crowns} crown &middot; <Dot kind={card.bonus} /> {NAMES[card.bonus]} bonus</p>
        <h1 className="pa-title small">Pay for this card</h1>
        <p className="pa-sub">Your bonuses are already taken off. Choose every token yourself.</p>

        <table className="pa-receipt">
          <tbody>
            {p.kinds.map((k) => (
              <tr key={k}>
                <td className="pa-what"><Dot kind={k} />{NAMES[k]}<small>{p.owed[k]} owed</small></td>
                <td className="pa-bar">
                  {Array.from({ length: p.owed[k] }, (_, i) => {
                    const own = p.own[k] || 0;
                    const cls = i < own ? 'tok' : i < own + (p.gold[k] || 0) ? 'gold' : '';
                    return <span key={i} className={cls} />;
                  })}
                </td>
                <td className="pa-act">
                  <button onClick={() => p.undoOwn(k) || p.undoGold(k)} disabled={!(p.own[k] || p.gold[k])}>&minus;</button>
                  <button onClick={() => p.addOwn(k)} disabled={!p.canOwn(k)}>Token <em>{p.ownLeft(k)}</em></button>
                  <button onClick={() => p.addGold(k)} disabled={!p.canGold(k)}>Gold <em>{p.goldLeft}</em></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pa-total"><span>Still owed</span><b>{p.totalLeft}</b></div>
        <button className="pa-pay" disabled={!p.done}>{p.done ? 'Pay and buy' : `Pay ${p.totalLeft} more to buy`}</button>
        <button className="pa-text" onClick={p.reset}>Start over</button>
      </div>
    </div>
  );
}
