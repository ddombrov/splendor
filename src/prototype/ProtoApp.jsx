// PROTOTYPE v2: throwaway. Delete the folder and the two lines in main.jsx when a direction wins.
//
// Plan: the previous prototype was rejected, so this one starts from nothing. It does NOT reuse
// the app's components, tokens, cards or colours, and it replaces the whole page instead of
// sitting inside it. Three radically different design directions, each applied to the same two
// screens (assumption: "some of the UI" means the unbuilt home screen and manual payment):
//   A Editorial  B Parchment  C Bold
//   /?prototype=home&variant=A|B|C    /?prototype=pay&variant=A|B|C
// Switch with the bar at the bottom or the arrow keys.
import { useEffect, useState } from 'react';
import * as A from './A.jsx';
import * as B from './B.jsx';
import * as C from './C.jsx';
import './proto.css';

const DIRECTIONS = { A, B, C };
const SCREENS = { home: 'Home', pay: 'Pay' };
const KEYS = Object.keys(DIRECTIONS);

const read = () => {
  const q = new URLSearchParams(window.location.search);
  const screen = SCREENS[q.get('prototype')] ? q.get('prototype') : 'home';
  const variant = DIRECTIONS[q.get('variant')] ? q.get('variant') : 'A';
  return { screen, variant };
};

function write(screen, variant) {
  const url = new URL(window.location.href);
  url.searchParams.set('prototype', screen);
  url.searchParams.set('variant', variant);
  window.history.replaceState(null, '', url);
}

export default function ProtoApp() {
  const [state, setState] = useState(read);
  const go = (screen, variant) => { write(screen, variant); setState({ screen, variant }); };
  const step = (d) => go(state.screen, KEYS[(KEYS.indexOf(state.variant) + d + KEYS.length) % KEYS.length]);

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

  const Screen = state.screen === 'home' ? DIRECTIONS[state.variant].Home : DIRECTIONS[state.variant].Pay;
  return (
    <>
      <Screen key={`${state.screen}${state.variant}`} />
      <div className="proto-bar">
        {Object.entries(SCREENS).map(([key, label]) => (
          <button key={key} className={key === state.screen ? 'on' : ''} onClick={() => go(key, state.variant)}>{label}</button>
        ))}
        <span className="sep" />
        <button className="arrow" onClick={() => step(-1)} aria-label="Previous direction">&larr;</button>
        <span className="label">{state.variant} &middot; {DIRECTIONS[state.variant].name}</span>
        <button className="arrow" onClick={() => step(1)} aria-label="Next direction">&rarr;</button>
      </div>
    </>
  );
}
