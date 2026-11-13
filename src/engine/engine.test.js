import { describe, expect, it, vi } from 'vitest';
import { createGame, cur, opp, reduce } from './engine.js';

const play = (state, ...actions) => actions.reduce((s, a) => reduce(s, a), state);
const click = (...cells) => cells.map((i) => ({ type: 'tok', i }));

/**
 * A fresh base game whose board holds exactly the given tokens, by cell index.
 * Every other token goes back in the bag, so no token is created or lost.
 */
function gameWithBoard(tokens, seed = 1) {
  const state = createGame(false, seed);
  const everything = [...state.board, ...state.bag].filter(Boolean);
  state.board = Array(25).fill(null);
  for (const [cell, kind] of Object.entries(tokens)) {
    const at = everything.indexOf(kind);
    if (at < 0) throw new Error(`the game has no ${kind} token left to place`);
    everything.splice(at, 1);
    state.board[cell] = kind;
  }
  state.bag = everything;
  return state;
}

describe('a game is determined by its seed', () => {
  it('creating a game twice from the same seed gives identical games', () => {
    expect(createGame(false, 12345)).toEqual(createGame(false, 12345));
  });

  it('creating a game with the expansion twice from the same seed gives identical games', () => {
    expect(createGame(true, 777)).toEqual(createGame(true, 777));
  });

  it('different seeds give different games', () => {
    expect(createGame(false, 1).board).not.toEqual(createGame(false, 2).board);
  });

  it('refuses to create a game without a seed', () => {
    expect(() => createGame(false)).toThrow();
  });

  it('replenishing the board from the same state always gives the same board', () => {
    const state = createGame(false, 42);
    state.bag.push(...state.board.filter(Boolean));
    state.board.fill(null);
    const once = reduce(state, { type: 'repl' });
    const again = reduce(state, { type: 'repl' });
    expect(once.board).toEqual(again.board);
    expect(once.board.every(Boolean)).toBe(true);
  });

  it('never needs any randomness from outside the game', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('the engine must not use Math.random');
    });
    try {
      const state = createGame(true, 9);
      state.bag.push(...state.board.filter(Boolean));
      state.board.fill(null);
      expect(() => reduce(state, { type: 'repl' })).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('taking tokens', () => {
  it('moves two adjacent tokens in a row to the player and passes the turn', () => {
    const state = gameWithBoard({ 0: 'blue', 1: 'red' });
    const after = play(state, ...click(0, 1), { type: 'take' });
    const first = after.players[0];
    expect([first.tok.blue, first.tok.red]).toEqual([1, 1]);
    expect([after.board[0], after.board[1]]).toEqual([null, null]);
    expect(after.cur).toBe(1);
  });

  it('takes a diagonal line of three', () => {
    const state = gameWithBoard({ 0: 'blue', 6: 'green', 12: 'white' });
    const after = play(state, ...click(0, 6, 12), { type: 'take' });
    expect(after.board.filter(Boolean)).toHaveLength(0);
    expect(after.cur).toBe(1);
  });

  it('does not let tokens that are not in a line be taken together', () => {
    const state = gameWithBoard({ 0: 'blue', 2: 'red' });
    const after = play(state, ...click(0, 2), { type: 'take' });
    expect(after.players[0].tok.blue + after.players[0].tok.red).toBe(1);
  });

  it('does not let gold be taken as a normal token', () => {
    const state = gameWithBoard({ 0: 'gold', 1: 'red' });
    const picked = play(state, ...click(0));
    expect(picked.toast).toBeTruthy();
    const after = play(picked, { type: 'take' });
    expect(after.players[0].tok.gold).toBe(0);
    expect(after.board[0]).toBe('gold');
    expect(after.cur).toBe(0);
  });

  it('gives the opponent a privilege for three tokens of one colour', () => {
    const state = gameWithBoard({ 0: 'red', 1: 'red', 2: 'red' });
    const before = opp(state).priv;
    const after = play(state, ...click(0, 1, 2), { type: 'take' });
    expect(after.players[1].priv).toBe(before + 1);
    expect(after.privBoard).toBe(state.privBoard - 1);
  });

  it('gives the opponent a privilege for two pearls', () => {
    const state = gameWithBoard({ 0: 'pearl', 1: 'pearl' });
    const after = play(state, ...click(0, 1), { type: 'take' });
    expect(after.players[1].priv).toBe(opp(state).priv + 1);
  });

  it('gives no privilege for three different colours', () => {
    const state = gameWithBoard({ 0: 'red', 1: 'blue', 2: 'green' });
    const after = play(state, ...click(0, 1, 2), { type: 'take' });
    expect(after.players[1].priv).toBe(opp(state).priv);
    expect(after.privBoard).toBe(state.privBoard);
  });

  it('gives no privilege for taking a single token', () => {
    const state = gameWithBoard({ 0: 'pearl', 1: 'pearl' });
    const after = play(state, ...click(0), { type: 'take' });
    expect(after.players[1].priv).toBe(opp(state).priv);
    expect(cur(after)).toBe(after.players[1]);
  });
});
