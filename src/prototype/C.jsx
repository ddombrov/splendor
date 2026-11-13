// PROTOTYPE v2, direction C: "Bold". Playful and chunky: thick outlines, hard shadows, saturated
// colour blocks. Home is a grid of big coloured tiles with a bottom sheet. Payment is a keypad of
// colour tiles that fill up like glasses as you tap them.
import { DEPTHS, DIFFICULTIES, MODES, NAMES, SAMPLE_CODE, SOURCES, useNewGame, usePayment } from './model.js';
import { useState } from 'react';

export const name = 'Bold';

const TILE = { blue: '#3d7bff', white: '#ffffff', green: '#2fd27a', black: '#2b2b33', red: '#ff5252', pearl: '#f2b6ff', gold: '#ffc400' };
const TILE_INK = { black: '#fff' };
const MODE_TILE = { device: '#ffc400', ai: '#7a5cff', online: '#2fd27a', join: '#ff8a3d', quick: '#ff5c8a' };

function Chip({ options, value, onChange }) {
  return (
    <div className="pc-chips">
      {options.map((o) => <button key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

export function Home() {
  const g = useNewGame('device');
  return (
    <div className="pc">
      <header className="pc-head"><h1>Splendor <span>Duel</span></h1></header>
      <div className="pc-tiles">
        {MODES.map((m) => (
          <button key={m.key} className={`pc-tile ${g.mode === m.key ? 'on' : ''}`} style={{ background: MODE_TILE[m.key] }} onClick={() => g.setMode(m.key)}>
            <b>{m.label}</b><small>{m.blurb}</small>
          </button>
        ))}
      </div>

      <div className="pc-sheet">
        <div className="pc-grab" />
        <h2>{g.current.label}</h2>
        {g.has.code && <input className="pc-code" value={g.code} onChange={(e) => g.setCode(e.target.value)} placeholder="00000" inputMode="numeric" />}
        {g.has.setup && (
          <div className="pc-opts">
            <div><span>Cards</span><Chip options={SOURCES} value={g.source} onChange={g.setSource} /></div>
            <div><span>Expansion</span><Chip options={['Off', 'On']} value={g.exp ? 'On' : 'Off'} onChange={(v) => g.setExp(v === 'On')} /></div>
          </div>
        )}
        {g.has.ai && (
          <div className="pc-opts">
            <div><span>Smarts</span><Chip options={DIFFICULTIES} value={g.difficulty} onChange={g.setDifficulty} /></div>
            <div><span>Think time</span><Chip options={DEPTHS} value={g.depth} onChange={g.setDepth} /></div>
          </div>
        )}
        {g.has.quick && <p>Paired with a stranger, base game. A minute with no match? Play the computer.</p>}
        {g.mode === 'online' && <p>Code to share: <b className="pc-big">{SAMPLE_CODE}</b></p>}
        <button className="pc-play" disabled={!g.ready}>{g.verb.toUpperCase()}!</button>
      </div>
    </div>
  );
}

export function Pay() {
  const p = usePayment();
  const { card } = p;
  const [goldMode, setGoldMode] = useState(false);
  const tap = (k) => (goldMode ? p.addGold(k) : p.addOwn(k));
  return (
    <div className="pc">
      <header className="pc-head">
        <h1>Pay up!</h1>
        <div className="pc-card"><b>{card.pts}</b><span>pts</span><i style={{ background: TILE[card.bonus] }} /></div>
      </header>
      <p className="pc-hint">Tap a colour to pay one. Tap again for more. Tap a coin below to take it back.</p>

      <div className="pc-keys">
        {p.kinds.map((k) => {
          const paid = (p.own[k] || 0) + (p.gold[k] || 0);
          const pct = Math.round((paid / p.owed[k]) * 100);
          const ok = p.remaining(k) === 0;
          return (
            <button key={k} className={`pc-key ${ok ? 'ok' : ''}`} style={{ '--c': TILE[k], '--t': TILE_INK[k] || '#1a1a1a', '--fill': `${pct}%` }} onClick={() => tap(k)} disabled={ok}>
              <span className="pc-fill" />
              <span className="pc-num">{ok ? '✓' : p.remaining(k)}</span>
              <span className="pc-name">{NAMES[k]}</span>
              <span className="pc-have">{goldMode ? '' : `${p.ownLeft(k)} in hand`}</span>
            </button>
          );
        })}
      </div>

      <div className="pc-wild">
        <button className={`pc-gold ${goldMode ? 'on' : ''}`} onClick={() => setGoldMode(!goldMode)}>
          <span className="pc-coin" />{goldMode ? 'Gold mode ON' : 'Use gold'}<b>{p.goldLeft}</b>
        </button>
        <div className="pc-used">
          {p.kinds.flatMap((k) => [
            ...Array.from({ length: p.own[k] || 0 }, (_, i) => <button key={`o${k}${i}`} style={{ background: TILE[k] }} onClick={() => p.undoOwn(k)} aria-label={`take back ${NAMES[k]}`} />),
            ...Array.from({ length: p.gold[k] || 0 }, (_, i) => <button key={`g${k}${i}`} className="gold" style={{ background: TILE.gold, borderColor: TILE[k] }} onClick={() => p.undoGold(k)} aria-label="take back gold" />),
          ])}
        </div>
      </div>

      <button className="pc-play" disabled={!p.done}>{p.done ? 'BUY IT!' : `${p.totalLeft} TO GO`}</button>
      <button className="pc-reset" onClick={p.reset}>start over</button>
    </div>
  );
}
