// PROTOTYPE v3: temporary smoke check, delete with the rest of the prototype. Walks random but
// legal games with the expansion on and renders all three directions at every position, so every
// prompt the engine can raise (discard, steal, royal, wild, peek, end-of-turn abilities) gets drawn.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { createGame, cur, endOptions, plan, reduce, limitCount } from '../engine/engine.js';
import { nextRandom } from '../engine/rng.js';
import { derive } from './table.js';
import A from './A.jsx';
import B from './B.jsx';
import C from './C.jsx';

const VIEWS = { A, B, C };
const render = (View, S) => renderToString(createElement(View, { S, dispatch: () => {}, d: derive(S), chrome: null }));
const held = (p, gold) => Object.keys(p.tok).filter((k) => p.tok[k] > 0 && (gold || k !== 'gold'));

function walk(seed, onState) {
  const holder = { rng: (seed * 7919) >>> 0 };
  const pick = (n) => Math.floor(nextRandom(holder) * n);
  const choose = (l) => l[pick(l.length)];
  let S = createGame(true, seed);
  const seen = new Set();

  for (let step = 0; step < 600 && !S.over; step++) {
    onState(S);
    seen.add(S.pending?.type || (S.mode ?? 'idle'));
    const p = cur(S), pd = S.pending;
    const cells = S.board.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

    if (pd) {
      if (pd.type === 'pick') S = reduce(S, { type: 'tok', i: choose(cells) });
      else if (pd.type === 'multi') {
        const open = cells.filter((i) => S.board[i] !== 'gold' && !pd.sel.includes(i));
        S = reduce(S, !open.length || (pd.sel.length && pick(2)) ? { type: 'confirmMulti' } : { type: 'tok', i: choose(open) });
      } else if (pd.type === 'steal') S = reduce(S, { type: 'steal', c: choose(held(S.players[1 - S.cur], false)) });
      else if (pd.type === 'royal') S = reduce(S, { type: 'royal', i: 0 });
      else if (pd.type === 'discard') S = reduce(S, { type: 'disc', c: choose(held(p, true)) });
      else if (pd.type === 'wild') S = reduce(S, { type: 'wild', c: pd.colors[0] });
      else if (pd.type === 'freeReserve') S = reduce(S, pick(2) ? { type: 'skip' } : { type: 'card', src: 'deck', l: 1 });
      else if (pd.type === 'freeCf') S = reduce(S, { type: 'card', src: 'cf', i: 0 });
      else if (pd.type === 'peek') S = reduce(S, { type: 'peekPick', i: 0 });
      else if (pd.type === 'endabil') {
        const opts = endOptions(S);
        S = reduce(S, opts.length && pick(10) < 7 ? { type: 'endabil', k: choose(opts).k } : { type: 'endDone' });
      } else throw new Error(`unexpected prompt ${pd.type}`);
      continue;
    }

    const buyable = [];
    S.pyr.forEach((row, l) => row.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'pyr', l, i })));
    p.res.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'res', i }));
    S.crow.forEach((c, i) => plan(S, p, c) && buyable.push({ src: 'cf', i }));
    const free = cells.filter((i) => S.board[i] !== 'gold');
    const roll = pick(10);
    if (limitCount(p) >= 10 && !buyable.length) S = reduce(S, { type: 'giveBack', c: choose(held(p, true)) });

    if (buyable.length && roll < 6) {
      S = reduce(S, { type: 'card', ...choose(buyable) });
      onState(S); // a card is selected: the preview and pay line are on screen
      S = reduce(S, { type: 'buy' });
    } else if (free.length) {
      S = reduce(S, { type: 'tok', i: choose(free) });
      onState(S); // tokens are selected
      S = reduce(S, { type: 'take' });
    } else {
      S = reduce(S, { type: 'repl' });
    }
  }
  return seen;
}

test.each(Object.keys(VIEWS))('direction %s survives a whole random game', (key) => {
  let rendered = 0;
  walk(4242, (S) => { expect(render(VIEWS[key], S).length).toBeGreaterThan(500); rendered++; });
  expect(rendered).toBeGreaterThan(60);
});

test.each(Object.keys(VIEWS))('direction %s draws every prompt the engine can raise', (key) => {
  const drawn = new Set();
  for (let seed = 1; seed <= 25; seed++) {
    walk(seed, (S) => {
      const t = S.pending?.type;
      if (!t || drawn.has(t)) return;
      drawn.add(t);
      expect(render(VIEWS[key], S).length).toBeGreaterThan(500);
    });
  }
  for (const t of ['pick', 'multi', 'steal', 'discard', 'royal', 'endabil', 'wild']) expect([...drawn]).toContain(t);
});

test('the walks between them reach the awkward prompts', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 25; seed++) for (const t of walk(seed, () => {})) seen.add(t);
  for (const t of ['multi', 'steal', 'discard', 'royal', 'endabil', 'wild']) expect([...seen]).toContain(t);
});
