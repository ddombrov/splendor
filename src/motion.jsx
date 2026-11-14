import { useEffect, useRef } from 'react';
import { JewelCard, CfCard, RoyalCard } from './components/Cards.jsx';
import { TokenArt } from './components/Art.jsx';
import { SPIRAL } from './engine/engine.js';

/*
 * Flying things. When a new game state arrives, anything that left the board or the pyramid and
 * arrived in a player's inventory is drawn flying from where it was to where it went. Positions come
 * from a snapshot of the screen taken after the previous state was drawn, so the thing is shown
 * leaving the exact spot it was in.
 */
const copy = (r) => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/** Where things are on screen right now: board squares, and cards on the pyramid or in a reserve. */
export function takeSnapshot() {
  const snap = { cells: {}, cards: {} };
  document.querySelectorAll('[data-cell]').forEach((el) => { snap.cells[el.dataset.cell] = copy(el.getBoundingClientRect()); });
  document.querySelectorAll('[data-zone] [data-card-id]').forEach((el) => {
    if (!snap.cards[el.dataset.cardId]) snap.cards[el.dataset.cardId] = copy(el.getBoundingClientRect());
  });
  return snap;
}

const has = (list, id) => list.some((c) => c?.id === id);

/** What moved between two game states, as flights from a place to a destination on the screen. */
export function diffFlights(prev, next, snap) {
  const out = [];

  // tokens: a board space that emptied while some player gained that kind of token
  prev.board.forEach((kind, i) => {
    if (!kind || next.board[i] || !snap.cells[i]) return;
    const taker = [0, 1].find((p) => next.players[p].tok[kind] > prev.players[p].tok[kind]);
    if (taker == null) return;
    const c = snap.cells[i];
    const size = c.width * 0.85;
    out.push({ type: 'token', kind, to: `[data-dest-tokens="${taker}"]`, from: { left: c.left + (c.width - size) / 2, top: c.top + (c.height - size) / 2, width: size, height: size } });
  });

  // replenish: new tokens pour out of the middle of the board into their squares, in spiral order
  const poured = SPIRAL.filter((i) => !prev.board[i] && next.board[i] && snap.cells[i]);
  const mid = snap.cells[SPIRAL[0]];
  if (poured.length && mid) {
    const size = mid.width * 0.85;
    poured.forEach((i, rank) => {
      out.push({ type: 'refill', cell: i, kind: next.board[i], to: `[data-cell="${i}"]`, delay: rank * 80, from: { left: mid.left + (mid.width - size) / 2, top: mid.top + (mid.height - size) / 2, width: size, height: size } });
    });
  }

  // cards: anything face up that is no longer where it was
  const faceUp = [
    ...prev.pyr.flat().map((card) => ({ card, kind: 'jewel' })),
    ...prev.crow.map((card) => ({ card, kind: 'cf' })),
    ...prev.royals.map((card) => ({ card, kind: 'royal' })),
    ...prev.players.flatMap((p) => p.res.filter((c) => !c.hidden).map((card) => ({ card, kind: 'jewel' }))),
  ];
  faceUp.forEach(({ card, kind }) => {
    if (!card?.id || !snap.cards[card.id]) return;
    const still = next.pyr.flat().some((c) => c?.id === card.id) || has(next.crow, card.id) || has(next.royals, card.id);
    const owner = next.players.findIndex((p) => has(p.cards, card.id) || has(p.cf, card.id) || has(p.royals, card.id));
    const reserver = next.players.findIndex((p, pi) => has(p.res, card.id) || p.res.length > prev.players[pi].res.length);
    let to = null;
    if (owner >= 0) to = `[data-dest-cards="${owner}"]`;
    else if (!still && reserver >= 0) to = `[data-dest-res="${reserver}"]`;
    if (!to) return;
    const wasReserved = prev.players.some((p) => has(p.res, card.id));
    const nowReserved = next.players.some((p) => has(p.res, card.id));
    if (wasReserved && nowReserved) return; // it did not move
    out.push({ type: kind, card, to, from: snap.cards[card.id] });
  });
  return out;
}

const NATURAL_W = 124; // a card is drawn 124 pixels wide before any zoom

function Flight({ f, onLanded }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const target = document.querySelector(f.to);
    if (!el || !target) { onLanded(f.id); return undefined; }
    const t = target.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (f.from.left + f.from.width / 2);
    const refill = f.type === 'refill';
    const dy = (refill ? t.top + t.height / 2 : t.top + Math.min(t.height / 2, 30)) - (f.from.top + f.from.height / 2);
    const end = refill ? 1 : f.type === 'token' ? 0.7 : 0.32;
    const anim = refill ? el.animate(
      [
        { transform: 'translate(0px, 0px) scale(0.4)', opacity: 0 },
        { transform: 'translate(0px, 0px) scale(0.9)', opacity: 1, offset: 0.12 },
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 },
      ],
      { duration: 520, delay: f.delay, easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)', fill: 'both' },
    ) : el.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: 'translate(0px, -28px) scale(1.4)', opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 1 },
      ],
      { duration: f.type === 'token' ? 1000 : 1200, easing: 'cubic-bezier(0.35, 0.1, 0.3, 1)', fill: 'forwards' },
    );
    anim.onfinish = () => onLanded(f.id);
    return () => anim.cancel();
    // each flight runs once, when it is first drawn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = { position: 'fixed', left: f.from.left, top: f.from.top, width: f.from.width, height: f.from.height, zIndex: 80, pointerEvents: 'none' };
  if (f.type === 'token' || f.type === 'refill') {
    return <div ref={ref} style={{ ...box, lineHeight: 0 }}><TokenArt kind={f.kind} size={f.from.width} /></div>;
  }
  const Card = f.type === 'cf' ? CfCard : f.type === 'royal' ? RoyalCard : JewelCard;
  return (
    <div ref={ref} style={box}>
      <div style={{ width: NATURAL_W, transform: `scale(${f.from.width / NATURAL_W})`, transformOrigin: 'top left' }}>
        <Card card={f.card} />
      </div>
    </div>
  );
}

export function Flights({ flights, onLanded }) {
  return flights.map((f) => <Flight key={f.id} f={f} onLanded={onLanded} />);
}
