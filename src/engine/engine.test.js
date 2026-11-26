import { describe, expect, it, vi } from 'vitest';
import { canPass, createGame, cur, opp, plan, reduce, limitCount as limit, SPIRAL } from './engine.js';

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

  it('lets a take reach exactly ten', () => {
    const state = withTokens(gameWithBoard({ 0: 'red', 1: 'green' }), 8);
    const after = play(state, ...click(0, 1), { type: 'take' });
    expect(limit(after.players[0])).toBe(10);
    expect(after.cur).toBe(1);
  });

  it('lets a player at ten take three, then return three at the end of the turn', () => {
    const state = withTokens(gameWithBoard({ 0: 'red', 1: 'green', 2: 'white' }), 10);
    const taken = play(state, ...click(0, 1, 2), { type: 'take' });
    expect(limit(taken.players[0])).toBe(13);
    expect(taken.pending?.type).toBe('discard');
    const after = play(taken, ...Array(3).fill({ type: 'disc', c: 'blue' }));
    expect(limit(after.players[0])).toBe(10);
    expect(after.players[0].tok).toMatchObject({ red: 1, green: 1, white: 1, blue: 7 });
    expect(after.cur).toBe(1);
  });

  it('lets a player who went over ten undo the take at the discard step and choose another move', () => {
    const state = withTokens(gameWithBoard({ 0: 'red', 1: 'green', 2: 'white' }), 10);
    const taken = play(state, ...click(0, 1, 2), { type: 'take' });
    expect(taken.undo).toBeTruthy();
    const partly = play(taken, { type: 'disc', c: 'blue' });
    const back = play(partly, { type: 'undo' });
    expect(back.board.slice(0, 3)).toEqual(['red', 'green', 'white']);
    expect(back.players[0].tok.blue).toBe(10);
    expect(back.pending).toBeNull();
    expect(back.main).toBe(false);
    expect(back.cur).toBe(0);
  });

  it('does not offer the undo once a card from a deck has been shown', () => {
    const state = withTokens(gameWithBoard({ 3: 'gold' }), 10);
    const after = play(state, ...click(3), { type: 'card', src: 'pyr', l: 0, i: 0 }, { type: 'reserve' });
    expect(after.pending?.type).toBe('discard');
    expect(after.undo).toBeNull();
  });

  it('lets a player at ten choose gold to reserve, then return one token', () => {
    const state = withTokens(gameWithBoard({ 3: 'gold' }), 10);
    const after = play(state, ...click(3), { type: 'card', src: 'pyr', l: 0, i: 0 }, { type: 'reserve' });
    expect(after.players[0].res).toHaveLength(1);
    expect(after.pending?.type).toBe('discard');
  });
});

describe('a privilege that takes the player over ten', () => {
  const atTen = () => {
    const state = gameWithBoard({ 0: 'red' });
    state.players[0].tok.blue = 10;
    state.players[0].priv = 1;
    return state;
  };

  it('can be undone until the main action, giving back the privilege and the token', () => {
    const state = atTen();
    const over = play(state, { type: 'priv' }, ...click(0));
    expect(limit(over.players[0])).toBe(11);
    expect(over.undo).toBeTruthy();
    const back = play(over, { type: 'undo' });
    expect(back.players[0].priv).toBe(1);
    expect(back.board[0]).toBe('red');
    expect(back.players[0].tok.red).toBe(0);
    expect(back.undo).toBeNull();
  });

  it('is kept once a buy brings the player back to ten', () => {
    const state = atTen();
    state.pyr[0][0] = { id: 'red-test', kind: 'jewel', level: 1, cost: { red: 1 }, pts: 0, crowns: 0, ability: null, n: 1, bonus: 'green', color: null };
    const after = play(state, { type: 'priv' }, ...click(0), { type: 'card', src: 'pyr', l: 0, i: 0 }, { type: 'buy' });
    expect(after.players[0].cards.map((c) => c.id)).toContain('red-test');
    expect(limit(after.players[0])).toBe(10);
    expect(after.undo).toBeNull();
    expect(after.cur).toBe(1);
  });

  it('is not kept when the privilege leaves the player at ten or fewer', () => {
    const state = atTen();
    state.players[0].tok.blue = 5;
    expect(play(state, { type: 'priv' }, ...click(0)).undo).toBeNull();
  });
});

describe('passing', () => {
  const stuck = () => {
    const state = gameWithBoard({});
    state.bag = [];
    return state;
  };

  it('is allowed when nothing can be taken, reserved or bought and the board cannot be replenished', () => {
    const state = stuck();
    expect(canPass(state)).toBe(true);
    const after = play(state, { type: 'pass' });
    expect(after.cur).toBe(1);
  });

  it('is not allowed while replenishing would give the player a move', () => {
    const state = gameWithBoard({});
    expect(canPass(state)).toBe(false);
    expect(play(state, { type: 'pass' }).cur).toBe(0);
  });

  it('is not allowed while a card can be bought', () => {
    const state = stuck();
    state.players[0].tok.gold = 3;
    state.pyr[0][0] = { id: 'cheap', kind: 'jewel', level: 1, cost: { red: 1 }, pts: 0, crowns: 0, ability: null, n: 1, bonus: 'green', color: null };
    expect(canPass(state)).toBe(false);
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

describe('the printed cards', () => {
  const all = (exp = false) => {
    const S = createGame(exp, 5, 0);
    return [0, 1, 2].map((l) => [...S.pyr[l], ...S.decks[l]]);
  };

  it('are the 30, 24 and 13 cards of the three levels', () => {
    expect(all().map((level) => level.length)).toEqual([30, 24, 13]);
    expect(all(true).map((level) => level.length)).toEqual([30, 24, 13]);
  });

  it('never have more than one pearl in a cost, or 2 crowns with a bonus worth 2 gems', () => {
    for (const c of all().flat()) {
      expect(c.cost.pearl ?? 0).toBeLessThanOrEqual(1);
      expect(c.crowns === 2 && c.n === 2).toBe(false);
    }
  });

  it('include the three cards that give points but no colour', () => {
    expect(all().flat().filter((c) => c.bonus === 'none').map((c) => c.pts).sort()).toEqual([3, 5, 6]);
  });

  it('count the abilities that were printed', () => {
    const count = (ab) => all().flat().filter((c) => c.ability === ab).length;
    expect([count('steal'), count('privilege'), count('extra'), count('match')]).toEqual([5, 5, 6, 5]);
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

  it('drops the oldest pick when a new one makes an L shape, keeping the last two that fit', () => {
    let S = setup();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'tok', i: 1 });
    S = reduce(S, { type: 'tok', i: 6 });
    expect(S.sel).toEqual([1, 6]);
  });

  it('drops older picks one at a time until the rest fit', () => {
    let S = setup();
    for (const i of [0, 1, 2]) S = reduce(S, { type: 'tok', i });
    expect(S.sel).toEqual([0, 1, 2]);
    S = reduce(S, { type: 'tok', i: 3 });
    expect(S.sel).toEqual([1, 2, 3]);
    S = reduce(S, { type: 'tok', i: 20 });
    expect(S.sel).toEqual([20]);
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

describe('winning ends the game at once', () => {
  it('does not offer a steal or anything else after the winning card', () => {
    const state = createGame(false, 8, 0);
    state.pyr[0][0] = { id: 'win-test', kind: 'jewel', level: 1, cost: {}, pts: 2, crowns: 0, ability: 'steal', n: 1, bonus: 'blue', color: null };
    state.players[0].cards = [{ id: 'old', kind: 'jewel', level: 1, cost: {}, pts: 18, crowns: 0, n: 1, bonus: 'red', color: 'red' }];
    state.players[1].tok.red = 2;
    const after = play(state, { type: 'card', src: 'pyr', l: 0, i: 0 }, { type: 'buy' });
    expect(after.over).toBe(state.players[0].name);
    expect(after.pending).toBeNull();
  });
});

describe('tokens or a card, not both', () => {
  const start = () => {
    const S = createGame(false, 9, 0);
    S.board = Array(25).fill('red');
    return S;
  };

  it('drops the picked tokens when a card is chosen', () => {
    let S = start();
    S = reduce(S, { type: 'tok', i: 0 });
    S = reduce(S, { type: 'card', src: 'pyr', l: 0, i: 0 });
    expect(S.sel).toEqual([]);
    expect(S.selCard).toMatchObject({ src: 'pyr' });
  });

  it('drops the chosen card when a token is picked', () => {
    let S = start();
    S = reduce(S, { type: 'card', src: 'pyr', l: 0, i: 0 });
    S = reduce(S, { type: 'tok', i: 0 });
    expect(S.selCard).toBeNull();
    expect(S.sel).toEqual([0]);
  });

  it('still lets a gold token and a card be chosen together to reserve', () => {
    let S = start();
    S.board[3] = 'gold';
    S = reduce(S, { type: 'tok', i: 3 });
    S = reduce(S, { type: 'card', src: 'pyr', l: 0, i: 0 });
    expect(S.goldSel).toBe(3);
    expect(S.selCard).toMatchObject({ src: 'pyr' });
  });
});

describe('game options', () => {
  it('deal made-up cards, with the same counts, when random cards is on', () => {
    const S = createGame(false, 5, 0, { randomCards: true });
    expect([0, 1, 2].map((l) => S.pyr[l].length + S.decks[l].length)).toEqual([30, 24, 13]);
    const printed = createGame(false, 5, 0);
    expect(JSON.stringify(S.decks)).not.toBe(JSON.stringify(printed.decks));
    for (const c of [...S.pyr.flat(), ...S.decks.flat()]) expect(c.cost.pearl ?? 0).toBeLessThanOrEqual(1);
  });

  it('show all four printed royals by default, and sometimes a different one when random royals is on', () => {
    const base = createGame(false, 5, 0);
    expect(base.royals.map((r) => r.id).sort()).toEqual(['b1', 'b2', 'b3', 'b4']);
    let different = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const S = createGame(false, seed, 0, { randomRoyals: true });
      expect(S.royals).toHaveLength(4);
      if (S.royals.some((r) => r.id === 'b5')) different++;
    }
    expect(different).toBeGreaterThan(0);
    expect(different).toBeLessThan(40);
  });
});

describe('the printed counterfeiter cards', () => {
  const deck = () => { const S = createGame(true, 5, 0); return [...S.crow, ...S.cdeck]; };

  it('are the 17 printed ones, five of them cutting a colour', () => {
    const cards = deck();
    expect(cards).toHaveLength(17);
    expect(cards.filter((c) => c.ab === 'red2').map((c) => c.rc).sort()).toEqual(['black', 'blue', 'green', 'red', 'white']);
    expect(cards.every((c) => c.cost.glass >= 1)).toBe(true);
  });

  it('can cost a gold token, which has to be paid', () => {
    const S = createGame(true, 5, 0);
    const card = deck().find((c) => c.ab === 'crowns2');
    expect(card.cost).toEqual({ glass: 2, gold: 1 });
    const p = S.players[0];
    p.tok.glass = 2;
    p.tok.gold = 0;
    expect(plan(S, p, card)).toBeNull();
    p.tok.gold = 1;
    expect(plan(S, p, card).pay).toMatchObject({ glass: 2, gold: 1 });
  });
});
