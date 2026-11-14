import { describe, expect, it, vi } from 'vitest';
import { createGame, cur, opp, reduce, limitCount as limit, SPIRAL } from './engine.js';

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

  it('never takes gold with the take action', () => {
    const state = gameWithBoard({ 0: 'gold', 1: 'red' });
    const after = play(state, ...click(0), { type: 'take' });
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

describe('the pyramid', () => {
  it('shows 5 level-1 cards, 4 level-2 cards and 3 level-3 cards', () => {
    const state = createGame(false, 3);
    expect(state.pyr.map((row) => row.length)).toEqual([5, 4, 3]);
  });
});

describe('reserving a card', () => {
  const gold = (cell) => ({ type: 'tok', i: cell });
  const pyramidCard = { type: 'card', src: 'pyr', l: 0, i: 0 };
  const complete = { type: 'reserve' };
  const twoGolds = () => gameWithBoard({ 3: 'gold', 7: 'gold', 0: 'blue' });

  it('reserves the chosen card and takes the chosen gold token, gold first', () => {
    const state = twoGolds();
    const chosen = state.pyr[0][0].id;
    const after = play(state, gold(7), pyramidCard, complete);
    expect(after.players[0].res.map((c) => c.id)).toEqual([chosen]);
    expect(after.players[0].tok.gold).toBe(1);
    expect(after.cur).toBe(1);
  });

  it('gives the same result when the card is chosen before the gold token', () => {
    const state = twoGolds();
    const goldFirst = play(state, gold(7), pyramidCard, complete);
    const cardFirst = play(state, pyramidCard, gold(7), complete);
    expect(cardFirst).toEqual(goldFirst);
  });

  it('lets the player choose which gold token to take', () => {
    const after = play(twoGolds(), gold(7), pyramidCard, complete);
    expect(after.board[7]).toBeNull();
    expect(after.board[3]).toBe('gold');
  });

  it('replaces the reserved card in the pyramid', () => {
    const state = twoGolds();
    const after = play(state, gold(3), pyramidCard, complete);
    expect(after.pyr[0]).toHaveLength(5);
    expect(after.pyr[0][0].id).not.toBe(state.pyr[0][0].id);
  });

  it('can reserve the top card of a deck without revealing it', () => {
    const state = twoGolds();
    const top = state.decks[2].at(-1).id;
    const after = play(state, gold(3), { type: 'card', src: 'deck', l: 2 }, complete);
    expect(after.players[0].res.map((c) => c.id)).toEqual([top]);
  });

  it('does nothing until both a gold token and a card are chosen', () => {
    const state = twoGolds();
    const onlyGold = play(state, gold(3), complete);
    const onlyCard = play(state, pyramidCard, complete);
    expect(onlyGold.players[0].res).toHaveLength(0);
    expect(onlyGold.cur).toBe(0);
    expect(onlyCard.players[0].res).toHaveLength(0);
    expect(onlyCard.cur).toBe(0);
    expect(onlyGold.toast).toBeTruthy();
    expect(onlyCard.toast).toBeTruthy();
  });

  it('lets the player cancel without changing the game', () => {
    const state = twoGolds();
    const cancelled = play(state, gold(3), pyramidCard, { type: 'cancelReserve' }, complete);
    expect(cancelled.players[0].res).toHaveLength(0);
    expect(cancelled.board[3]).toBe('gold');
    expect(cancelled.cur).toBe(0);
  });

  it('deselects the gold token when it is chosen again', () => {
    const state = twoGolds();
    const after = play(state, gold(3), gold(3), pyramidCard, complete);
    expect(after.players[0].res).toHaveLength(0);
  });

  it('drops the gold choice when ordinary tokens are chosen instead', () => {
    const state = twoGolds();
    const after = play(state, gold(3), ...click(0), pyramidCard, complete);
    expect(after.players[0].res).toHaveLength(0);
  });

  it('does not allow choosing gold once three cards are reserved', () => {
    const state = twoGolds();
    state.players[0].res = state.decks[0].splice(0, 3);
    const after = play(state, gold(3), pyramidCard, complete);
    expect(after.players[0].res).toHaveLength(3);
    expect(after.players[0].tok.gold).toBe(0);
    expect(after.toast).toBeTruthy();
  });
});

describe('choosing who goes first', () => {
  const ask = () => createGame(false, 5, null);

  it('waits for the choice, with all three scrolls still on the table', () => {
    const state = ask();
    expect(state.awaitingFirst).toBe(true);
    expect(state.privBoard).toBe(3);
    expect(state.players.map((p) => p.priv)).toEqual([0, 0]);
  });

  it('ignores moves until someone has been chosen', () => {
    const state = ask();
    const cell = state.board.findIndex((c) => c && c !== 'gold');
    const after = play(state, ...click(cell), { type: 'take' });
    expect(after.players[0].tok).toEqual(state.players[0].tok);
    expect(after.cur).toBe(0);
    expect(after.awaitingFirst).toBe(true);
  });

  it('lets player 1 go first and gives player 2 a scroll', () => {
    const after = reduce(ask(), { type: 'chooseFirst', player: 0 });
    expect(after.awaitingFirst).toBe(false);
    expect(after.cur).toBe(0);
    expect(after.players.map((p) => p.priv)).toEqual([0, 1]);
    expect(after.privBoard).toBe(2);
  });

  it('lets player 2 go first and gives player 1 a scroll', () => {
    const after = reduce(ask(), { type: 'chooseFirst', player: 1 });
    expect(after.cur).toBe(1);
    expect(after.players.map((p) => p.priv)).toEqual([1, 0]);
    expect(after.privBoard).toBe(2);
  });

  it('cannot be chosen a second time', () => {
    const once = reduce(ask(), { type: 'chooseFirst', player: 1 });
    const twice = reduce(once, { type: 'chooseFirst', player: 0 });
    expect(twice).toEqual(once);
  });

  it('keeps the old behaviour when the first player is given up front', () => {
    const state = createGame(false, 5);
    expect(state.awaitingFirst).toBe(false);
    expect(state.cur).toBe(0);
    expect(state.players.map((p) => p.priv)).toEqual([0, 1]);
  });
});

describe('the ten token limit when taking', () => {
  const withTokens = (state, n) => {
    state.players[0].tok.blue = n;
    return state;
  };

  it('does not let a take push the player over ten', () => {
    const state = withTokens(gameWithBoard({ 0: 'red', 1: 'green' }), 9);
    const picked = play(state, ...click(0, 1));
    expect(picked.sel).toEqual([0]);
    expect(picked.toast).toBeTruthy();
    const after = play(picked, { type: 'take' });
    expect(after.players[0].tok.red).toBe(1);
    expect(limit(after.players[0])).toBe(10);
    expect(after.pending).toBeNull();
  });

  it('lets a take reach exactly ten', () => {
    const state = withTokens(gameWithBoard({ 0: 'red', 1: 'green' }), 8);
    const after = play(state, ...click(0, 1), { type: 'take' });
    expect(limit(after.players[0])).toBe(10);
    expect(after.cur).toBe(1);
  });

  it('refuses any token when already at ten', () => {
    const state = withTokens(gameWithBoard({ 0: 'red' }), 10);
    const picked = play(state, ...click(0));
    expect(picked.sel).toEqual([]);
    expect(picked.toast).toBeTruthy();
  });

  it('refuses a privilege token when at ten, and keeps the privilege', () => {
    const state = withTokens(gameWithBoard({ 0: 'red' }), 10);
    state.players[0].priv = 1;
    const after = play(state, { type: 'priv' }, ...click(0));
    expect(after.players[0].priv).toBe(1);
    expect(after.board[0]).toBe('red');
  });

  it('refuses choosing gold to reserve when at ten', () => {
    const state = withTokens(gameWithBoard({ 3: 'gold' }), 10);
    const after = play(state, ...click(3));
    expect(after.goldSel).toBeNull();
    expect(after.toast).toBeTruthy();
  });
});

describe('returning a token to get under the limit', () => {
  it('lets a player at ten return one token to the bag before their action', () => {
    const state = gameWithBoard({ 0: 'red' });
    state.players[0].tok.blue = 10;
    const bag = state.bag.length;
    const after = play(state, { type: 'giveBack', c: 'blue' });
    expect(after.players[0].tok.blue).toBe(9);
    expect(after.bag).toHaveLength(bag + 1);
    expect(after.cur).toBe(0);
    const taken = play(after, ...click(0), { type: 'take' });
    expect(taken.players[0].tok.red).toBe(1);
  });

  it('does not let a player below ten give tokens away', () => {
    const state = gameWithBoard({ 0: 'red' });
    state.players[0].tok.blue = 9;
    const after = play(state, { type: 'giveBack', c: 'blue' });
    expect(after.players[0].tok.blue).toBe(9);
  });
});

describe('stealing at the ten token limit', () => {
  const buyStealCard = (tokens) => {
    const state = createGame(false, 8, 0);
    const card = { id: 'steal-test', kind: 'jewel', level: 1, cost: {}, pts: 0, crowns: 0, ability: 'steal', n: 1, bonus: 'blue', color: null };
    state.pyr[0][0] = card;
    state.players[0].tok.blue = tokens;
    state.players[1].tok.red = 2;
    return play(state, { type: 'card', src: 'pyr', l: 0, i: 0 }, { type: 'buy' });
  };

  it('offers a steal when the buyer has room', () => {
    const after = buyStealCard(5);
    expect(after.pending?.type).toBe('steal');
  });

  it('skips the steal, but still gives the card, when the buyer holds ten tokens', () => {
    const after = buyStealCard(10);
    expect(after.pending).toBeNull();
    expect(after.players[0].cards.map((c) => c.id)).toContain('steal-test');
    expect(after.players[1].tok.red).toBe(2);
    expect(after.cur).toBe(1);
  });
});

describe('cancelling a half-made action', () => {
  it('clears chosen tokens, gold, card and privilege mode without changing the game', () => {
    const state = gameWithBoard({ 0: 'red', 1: 'green', 3: 'gold' });
    state.players[0].priv = 1;
    const chosen = play(state, ...click(0, 1), { type: 'card', src: 'pyr', l: 0, i: 0 });
    const after = reduce(chosen, { type: 'cancelAction' });
    expect(after.sel).toEqual([]);
    expect(after.goldSel).toBeNull();
    expect(after.selCard).toBeNull();
    expect(after.board).toEqual(state.board);
    expect(after.cur).toBe(0);
    const priv = play(state, { type: 'priv' });
    expect(priv.mode).toBe('priv');
    expect(reduce(priv, { type: 'cancelAction' }).mode).toBeNull();
    expect(reduce(priv, { type: 'cancelAction' }).players[0].priv).toBe(1);
  });
});

describe('resigning', () => {
  it('ends the game with the other player as the winner', () => {
    const state = createGame(false, 4, 0);
    const after = reduce(state, { type: 'resign', player: 0 });
    expect(after.over).toBe('Player 2');
    expect(after.resigned).toBe(0);
  });

  it('works even before anyone has been chosen to go first', () => {
    const after = reduce(createGame(false, 4, null), { type: 'resign', player: 1 });
    expect(after.over).toBe('Player 1');
  });

  it('does nothing once the game is over', () => {
    const over = reduce(createGame(false, 4, 0), { type: 'resign', player: 0 });
    expect(reduce(over, { type: 'resign', player: 1 })).toEqual(over);
  });
});

describe('replenishing follows the arrows printed on the board', () => {
  // Read from the supplied wooden board picture: the centre, then up, right, down, left, and outward.
  const ARROWS = [12, 7, 8, 13, 18, 17, 16, 11, 6, 1, 2, 3, 4, 9, 14, 19, 24, 23, 22, 21, 20, 15, 10, 5, 0];

  it('uses the same order as the picture', () => {
    expect(SPIRAL).toEqual(ARROWS);
  });

  it('puts a single token in the first empty space along the arrows, not the first by position', () => {
    const state = createGame(false, 6, 0);
    state.board = Array(25).fill('red');
    state.board[8] = null;
    state.board[13] = null;
    state.bag = ['blue'];
    const after = reduce(state, { type: 'repl' });
    expect(after.board[8]).toBe('blue');
    expect(after.board[13]).toBeNull();
  });

  it('fills the spaces one after another in arrow order', () => {
    const state = createGame(false, 6, 0);
    state.board = Array(25).fill(null);
    state.bag = ['blue', 'blue', 'blue', 'blue'];
    const after = reduce(state, { type: 'repl' });
    expect([12, 7, 8, 13].every((i) => after.board[i] === 'blue')).toBe(true);
    expect(after.board.filter(Boolean)).toHaveLength(4);
  });

  it('lays out a new game in the same order', () => {
    const state = createGame(false, 6, 0);
    expect(state.board.every(Boolean)).toBe(true);
  });
});

describe('random cards', () => {
  it('never give a card both 2 crowns and a bonus worth 2 gems', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const S = createGame(false, seed, 0);
      const all = [...S.pyr.flat(), ...S.decks.flat()];
      for (const c of all) expect(c.crowns === 2 && c.n === 2).toBe(false);
    }
  });
});

describe('replenishing', () => {
  it('does nothing while the board is full, even with tokens in the bag', () => {
    const S = createGame(true, 5, 0);
    expect(S.bag.length).toBeGreaterThan(0);
    expect(S.board.every((c) => c)).toBe(true);
    const next = reduce(S, { type: 'repl' });
    expect(next.players[1].priv).toBe(S.players[1].priv);
    expect(next.log.length).toBe(S.log.length);
  });
});

describe('picking tokens in a line', () => {
  const setup = () => {
    const S = createGame(false, 9, 0);
    S.board = Array(25).fill('red');
    return S;
  };

  it('keeps a pick when the next one has one square between, so the middle one can be added', () => {
    let S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 2 });
    expect(S.sel).toEqual([0, 2]);
    S = reduce(S, { type: 'tok', i: 1 });
    expect(S.sel).toEqual([0, 2, 1]);
  });

  it('also keeps diagonal and vertical gaps', () => {
    let S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 12 });
    expect(S.sel).toEqual([0, 12]);
    S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 10 });
    expect(S.sel).toEqual([0, 10]);
  });

  it('starts over when the second token is too far away or the middle is gold', () => {
    let S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 3 });
    expect(S.sel).toEqual([3]);
    S = setup(); S.board[1] = 'gold';
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 2 });
    expect(S.sel).toEqual([2]);
  });

  it('cannot take a pick with a gap in it', () => {
    let S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 2 });
    const next = reduce(S, { type: 'take' });
    expect(next.players[0].tok.red + next.players[1].tok.red).toBe(0);
  });
});
