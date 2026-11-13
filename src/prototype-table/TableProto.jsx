// PROTOTYPE v3 host: throwaway. Owns one real game (the real engine, the real reducer) and hands
// it to whichever direction is selected, so all three are judged against real density, not mockups.
//   /?prototype=table&variant=A|B|C
import { useEffect, useReducer, useState } from 'react';
import { createGame, reduce } from '../engine/engine.js';
import * as A from './A.jsx';
import * as B from './B.jsx';
import * as C from './C.jsx';
import { derive } from './table.js';
import './table.css';

const DIRECTIONS = { A, B, C };
const KEYS = Object.keys(DIRECTIONS);
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

const read = () => {
  const q = new URLSearchParams(window.location.search).get('variant');
  return DIRECTIONS[q] ? q : 'A';
};

function write(variant) {
  const url = new URL(window.location.href);
  url.searchParams.set('prototype', 'table');
  url.searchParams.set('variant', variant);
  window.history.replaceState(null, '', url);
}

export default function TableProto() {
  const [variant, setVariant] = useState(read);
  const [exp, setExp] = useState(false);
  const [S, dispatch] = useReducer(reduce, null, () => createGame(false, newSeed()));

  const go = (v) => { write(v); setVariant(v); };
  const step = (n) => go(KEYS[(KEYS.indexOf(variant) + n + KEYS.length) % KEYS.length]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.matches('input, textarea') || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const restart = (withExp) => { setExp(withExp); dispatch({ type: 'new', exp: withExp, seed: newSeed() }); };
  const chrome = (
    <>
      <button className="tp-tool" onClick={() => restart(exp)}>New game</button>
      <button className="tp-tool" onClick={() => restart(!exp)}>Expansion {exp ? 'on' : 'off'}</button>
    </>
  );

  const View = DIRECTIONS[variant].default;
  return (
    <>
      <View key={variant} S={S} dispatch={dispatch} d={derive(S)} chrome={chrome} />

      {S.over && (
        <div className="tp-over">
          <div>
            <h2>{S.over} wins</h2>
            <button className="tp-tool" onClick={() => restart(exp)}>Play again</button>
          </div>
        </div>
      )}

      <div className="tp-bar">
        <button className="arrow" onClick={() => step(-1)} aria-label="Previous direction">&larr;</button>
        <span className="label">{variant} &middot; {DIRECTIONS[variant].name}</span>
        <button className="arrow" onClick={() => step(1)} aria-label="Next direction">&rarr;</button>
      </div>
    </>
  );
}
