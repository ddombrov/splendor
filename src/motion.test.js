import { describe, expect, it } from 'vitest';
import { createGame } from './engine/engine.js';
import { diffFlights } from './motion.jsx';

const rect = (left, top, w = 100, h = 100) => ({ left, top, width: w, height: h });

/** Two game states and a snapshot with a position for every board square and every card. */
function states() {
  const prev = createGame(false, 7, 0);
  const next = structuredClone(prev);
  const snap = { cells: {}, cards: {} };
  prev.board.forEach((_, i) => { snap.cells[i] = rect(i * 10, 0); });
  prev.pyr.flat().forEach((c, i) => { snap.cards[c.id] = rect(i * 5, 300, 124, 174); });
  return { prev, next, snap };
}

describe('what flies when the game changes', () => {
  it('flies nothing when nothing moved', () => {
    const { prev, next, snap } = states();
    expect(diffFlights(prev, next, snap)).toEqual([]);
  });

  it('flies a token from its board square to the player who took it', () => {
    const { prev, next, snap } = states();
    const kind = prev.board[5];
    next.board[5] = null;
    next.players[1].tok[kind] += 1;
    const out = diffFlights(prev, next, snap);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'token', kind, to: '[data-dest-tokens="1"]' });
    expect(out[0].from.width).toBeLessThan(snap.cells[5].width);
  });

  it('does not fly a token that was only returned to the bag', () => {
    const { prev, next, snap } = states();
    next.board[5] = null;
    expect(diffFlights(prev, next, snap)).toEqual([]);
  });

  it('flies a bought card into the buyer\'s cards', () => {
    const { prev, next, snap } = states();
    const card = prev.pyr[1][2];
    next.pyr[1][2] = { ...prev.decks[1].at(-1) };
    next.players[0].cards.push({ ...card, color: card.bonus });
    const out = diffFlights(prev, next, snap);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'jewel', to: '[data-dest-cards="0"]' });
    expect(out[0].card.id).toBe(card.id);
    expect(out[0].from).toEqual(snap.cards[card.id]);
  });

  it('flies a reserved card to the reserve of the player who reserved it', () => {
    const { prev, next, snap } = states();
    const card = prev.pyr[0][0];
    next.pyr[0][0] = { ...prev.decks[0].at(-1) };
    next.players[0].res.push(card);
    expect(diffFlights(prev, next, snap)[0]).toMatchObject({ to: '[data-dest-res="0"]' });
  });

  it("flies a card the other player reserved to their reserve, without knowing the card's new id", () => {
    const { prev, next, snap } = states();
    const card = prev.pyr[2][1];
    next.pyr[2][1] = { ...prev.decks[2].at(-1) };
    next.players[1].res.push({ id: 'hidden-0', level: card.level, hidden: true });
    const out = diffFlights(prev, next, snap);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ to: '[data-dest-res="1"]' });
  });

  it('flies a card from a reserve into the cards when it is bought', () => {
    const { prev, next, snap } = states();
    const card = prev.pyr[0][1];
    prev.players[0].res.push(card);
    prev.pyr[0][1] = { ...prev.decks[0].at(-1) };
    next.pyr[0] = [...prev.pyr[0]];
    next.players[0].cards.push({ ...card, color: card.bonus });
    const out = diffFlights(prev, next, snap);
    expect(out.find((f) => f.card.id === card.id)).toMatchObject({ to: '[data-dest-cards="0"]' });
  });

  it('does not fly a reserved card that is still in the same reserve', () => {
    const { prev, next, snap } = states();
    const card = prev.pyr[0][1];
    prev.players[0].res.push(card);
    next.players[0].res.push(card);
    prev.pyr[0] = prev.pyr[0].filter((c) => c.id !== card.id);
    next.pyr[0] = [...prev.pyr[0]];
    expect(diffFlights(prev, next, snap)).toEqual([]);
  });

  it('skips a card it has no screen position for', () => {
    const { prev, next } = states();
    const card = prev.pyr[1][0];
    next.pyr[1][0] = { ...prev.decks[1].at(-1) };
    next.players[0].cards.push({ ...card, color: card.bonus });
    expect(diffFlights(prev, next, { cells: {}, cards: {} })).toEqual([]);
  });

  it('pours new tokens from the middle of the board into the empty squares, in spiral order', () => {
    const { prev, next, snap } = states();
    prev.board[12] = null; prev.board[7] = null; prev.board[0] = null;
    const out = diffFlights(prev, next, snap).filter((f) => f.type === 'refill');
    expect(out.map((f) => f.cell)).toEqual([12, 7, 0]);
    expect(out.map((f) => f.delay)).toEqual([0, 80, 160]);
    expect(out[1].to).toBe('[data-cell="7"]');
  });

  it('flies a claimed royal card to the player who took it', () => {
    const { prev, next, snap } = states();
    const royal = prev.royals[0];
    snap.cards[royal.id] = rect(900, 10, 124, 174);
    next.royals = next.royals.slice(1);
    next.players[1].royals.push(royal);
    expect(diffFlights(prev, next, snap).find((f) => f.type === 'royal')).toMatchObject({ to: '[data-dest-cards="1"]' });
  });
});
