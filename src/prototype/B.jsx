// PROTOTYPE v2, direction B: "Parchment". Warm paper, ink, serif type, wax seal.
// Home is a printed menu with dotted leaders. Payment is a purse of coins you drag onto a ledger.
import { useState } from 'react';
import { DEPTHS, DIFFICULTIES, MODES, NAMES, SAMPLE_CODE, SOURCES, useNewGame, usePayment } from './model.js';

export const name = 'Parchment';

const INK = '#3a2817';
const FILL = { blue: '#4a73b8', white: '#efe9d8', green: '#4b8a5e', black: '#3b3330', red: '#a8323a', pearl: '#e9d6e6', gold: '#c9971f' };

/** An engraved coin: ink outline, flat wash, a few facet lines. */
export function Coin({ kind, size = 34 }) {
  const f = FILL[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={NAMES[kind]}>
      <circle cx="20" cy="20" r="18" fill="#f6ecd2" stroke={INK} strokeWidth="1.6" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke={INK} strokeWidth=".6" strokeDasharray="1.5 2" />
      {kind === 'pearl' ? (
        <circle cx="20" cy="20" r="8" fill={f} stroke={INK} strokeWidth="1.2" />
      ) : kind === 'gold' ? (
        <g stroke={INK} strokeWidth="1.2" fill={f}><circle cx="20" cy="20" r="8" /><path d="M20 13v14M13 20h14" fill="none" /></g>
      ) : (
        <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
          <path d="M12 17l4-6h8l4 6-8 13z" fill={f} />
          <path d="M12 17h16M16 11l4 19M24 11l-4 19" fill="none" strokeWidth=".8" />
        </g>
      )}
    </svg>
  );
}

const Box = ({ on }) => <span className={`pb-box ${on ? 'on' : ''}`}>{on ? '✕' : ''}</span>;

export function Home() {
  const g = useNewGame('device');
  const [begun, setBegun] = useState(false);
  return (
    <div className="pb">
      <div className="pb-sheet">
        <div className="pb-crest">&#10086;</div>
        <h1>Splendor Duel</h1>
        <p className="pb-tag">Jewellers of the Renaissance, at your table</p>
        <div className="pb-rule" />

        <h3>Choose your table</h3>
        <ul className="pb-menu">
          {MODES.map((m) => (
            <li key={m.key} className={g.mode === m.key ? 'on' : ''} onClick={() => g.setMode(m.key)}>
              <span className="pb-name">{m.label}</span><span className="pb-dots" /><span className="pb-note">{m.blurb}</span>
            </li>
          ))}
        </ul>

        {g.has.code && (
          <div className="pb-line"><span>Enter the five-digit code</span><input value={g.code} onChange={(e) => g.setCode(e.target.value)} placeholder="_ _ _ _ _" inputMode="numeric" /></div>
        )}
        {g.has.setup && (
          <>
            <h3>House rules</h3>
            <ul className="pb-rules">
              <li onClick={() => g.setExp(!g.exp)}><Box on={g.exp} /> The Counterfeiters expansion</li>
              {SOURCES.map((s) => <li key={s} onClick={() => g.setSource(s)}><Box on={g.source === s} /> {s === 'Random' ? 'Cards drawn at random' : 'The official cards'}</li>)}
              {g.has.ai && (
                <>
                  <li className="pb-sub">Opponent&rsquo;s wit: {DIFFICULTIES.map((d) => <b key={d} className={g.difficulty === d ? 'on' : ''} onClick={(e) => { e.stopPropagation(); g.setDifficulty(d); }}>{d}</b>)}</li>
                  <li className="pb-sub">Forethought: {DEPTHS.map((d) => <b key={d} className={g.depth === d ? 'on' : ''} onClick={(e) => { e.stopPropagation(); g.setDepth(d); }}>{d}</b>)}</li>
                </>
              )}
            </ul>
          </>
        )}
        {g.has.quick && <p className="pb-fine">Base game, shared cards. Wait a minute and you may play the computer instead.</p>}

        <div className="pb-foot">
          {g.mode === 'online' && <p className="pb-fine">Your code: <b>{SAMPLE_CODE}</b></p>}
          <button className={`pb-seal ${begun ? 'pressed' : ''}`} disabled={!g.ready} onClick={() => setBegun(!begun)}><span>{g.verb}</span></button>
        </div>
      </div>
    </div>
  );
}

export function Pay() {
  const p = usePayment();
  const { card } = p;
  const [over, setOver] = useState(null);
  const drop = (k, e) => {
    e.preventDefault();
    setOver(null);
    const what = e.dataTransfer.getData('text/plain');
    if (what === 'gold') p.addGold(k);
    else if (what === k) p.addOwn(k);
  };
  const click = (kind) => (kind === 'gold' ? p.addGoldAnywhere() : p.addOwn(kind));

  return (
    <div className="pb">
      <div className="pb-sheet wide">
        <p className="pb-tag">Level {card.level} &middot; {card.pts} points &middot; {NAMES[card.bonus]} bonus</p>
        <h1>The Ledger</h1>
        <div className="pb-rule" />
        <div className="pb-cols">
          <section>
            <h3>Your purse</h3>
            <p className="pb-fine">Drag a coin onto its line, or click it. Gold fits any line.</p>
            <div className="pb-purse">
              {[...p.kinds, 'gold'].map((k) => {
                const left = k === 'gold' ? p.goldLeft : p.ownLeft(k);
                return (
                  <div key={k} className={`pb-coin ${left <= 0 ? 'spent' : ''}`} draggable={left > 0}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', k)} onClick={() => left > 0 && click(k)}>
                    <Coin kind={k} size={46} /><em>{left}</em>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h3>Owed on this card</h3>
            <ul className="pb-ledger">
              {p.kinds.map((k) => (
                <li key={k} className={over === k ? 'over' : ''} onDragOver={(e) => { e.preventDefault(); setOver(k); }} onDragLeave={() => setOver(null)} onDrop={(e) => drop(k, e)}>
                  <span className="pb-name">{p.owed[k]} &times; {NAMES[k]}</span><span className="pb-dots" />
                  <span className="pb-paid">
                    {Array.from({ length: p.own[k] || 0 }, (_, i) => <span key={`o${i}`} onClick={() => p.undoOwn(k)}><Coin kind={k} size={22} /></span>)}
                    {Array.from({ length: p.gold[k] || 0 }, (_, i) => <span key={`g${i}`} onClick={() => p.undoGold(k)}><Coin kind="gold" size={22} /></span>)}
                    <b>{p.remaining(k) === 0 ? 'paid' : `${p.remaining(k)} to go`}</b>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="pb-foot">
          <button className="pb-link" onClick={p.reset}>Sweep the table clear</button>
          <button className={`pb-seal ${p.done ? '' : 'idle'}`} disabled={!p.done}><span>Pay</span></button>
        </div>
      </div>
    </div>
  );
}
