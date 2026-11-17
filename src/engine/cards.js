/*
 * The 67 jewel cards of the base game, one row per card:
 *   points, crowns, bonus colour, how many gems the bonus is worth, ability, cost
 * Abilities: steal (the hand), privilege (the scroll), extra (go again), match (the loose gem: take a
 * token of the card's colour). A bonus of 'wild' counts as any colour you own; 'none' gives no colour.
 */
const S = 'steal';
const P = 'privilege';
const X = 'extra';
const M = 'match';

// level 1: the green deck
const GREEN = [
  [0, 0, 'green', 1, null, '1 white 1 blue 1 red 1 black'],
  [0, 0, 'blue', 1, M, '2 white 2 black'],
  [1, 0, 'wild', 1, null, '2 blue 2 red 1 black 1 pearl'],
  [0, 0, 'white', 1, M, '2 red 2 black'],
  [0, 0, 'blue', 1, X, '2 green 2 red 1 pearl'],
  [0, 0, 'black', 1, M, '2 green 2 red'],
  [0, 0, 'black', 1, X, '2 white 2 blue 1 pearl'],
  [0, 0, 'red', 1, M, '2 blue 2 green'],
  [0, 0, 'red', 1, X, '2 white 2 black 1 pearl'],
  [1, 0, 'blue', 1, null, '2 red 3 black'],
  [0, 0, 'blue', 1, null, '1 white 1 green 1 red 1 black'],
  [0, 1, 'red', 1, null, '3 black'],
  [0, 0, 'white', 1, null, '1 blue 1 green 1 red 1 black'],
  [0, 0, 'black', 1, null, '1 white 1 blue 1 green 1 red'],
  [1, 0, 'white', 1, null, '2 green 3 red'],
  [0, 1, 'black', 1, null, '3 white'],
  [0, 1, 'white', 1, null, '3 blue'],
  [0, 0, 'green', 1, X, '2 red 2 black 1 pearl'],
  [0, 0, 'white', 1, X, '2 blue 2 green 1 pearl'],
  [0, 1, 'blue', 1, null, '3 green'],
  [0, 0, 'red', 1, null, '1 white 1 blue 1 green 1 black'],
  [1, 0, 'black', 1, null, '2 blue 3 green'],
  [3, 0, 'none', 0, null, '4 red 1 pearl'],
  [0, 1, 'wild', 1, null, '4 white 1 pearl'],
  [0, 1, 'green', 1, null, '3 red'],
  [0, 0, 'green', 1, M, '2 white 2 blue'],
  [1, 0, 'red', 1, null, '2 white 3 blue'],
  [1, 0, 'wild', 1, null, '4 black 1 pearl'],
  [1, 0, 'green', 1, null, '3 white 2 black'],
  [1, 0, 'wild', 1, null, '2 white 2 green 1 black 1 pearl'],
];

// level 2: the yellow deck
const YELLOW = [
  [1, 0, 'blue', 1, S, '4 green 3 black'],
  [1, 0, 'red', 2, null, '2 white 5 black'],
  [5, 0, 'none', 0, null, '6 blue 1 pearl'],
  [0, 2, 'wild', 1, null, '6 blue 1 pearl'],
  [2, 0, 'blue', 1, P, '2 white 4 blue 1 pearl'],
  [2, 0, 'black', 1, P, '2 red 4 black 1 pearl'],
  [2, 1, 'black', 1, null, '2 blue 2 green 2 red 1 pearl'],
  [2, 1, 'red', 1, null, '2 white 2 blue 2 green 1 pearl'],
  [1, 0, 'red', 1, S, '3 blue 4 black'],
  [2, 0, 'red', 1, P, '2 green 4 red 1 pearl'],
  [1, 0, 'blue', 2, null, '5 green 2 red'],
  [1, 0, 'black', 1, S, '4 white 3 green'],
  [2, 0, 'green', 1, P, '2 blue 4 green 1 pearl'],
  [1, 0, 'black', 2, null, '5 white 2 blue'],
  [2, 0, 'wild', 1, null, '6 green 1 pearl'],
  [1, 0, 'white', 2, null, '5 blue 2 green'],
  [1, 0, 'green', 2, null, '5 red 2 black'],
  [2, 1, 'white', 1, null, '2 green 2 red 2 black 1 pearl'],
  [2, 1, 'blue', 1, null, '2 white 2 red 2 black 1 pearl'],
  [0, 2, 'wild', 1, null, '6 green 1 pearl'],
  [1, 0, 'white', 1, S, '4 blue 3 red'],
  [1, 0, 'green', 1, S, '3 white 4 red'],
  [2, 0, 'white', 1, P, '4 white 2 black 1 pearl'],
  [2, 1, 'green', 1, null, '2 white 2 blue 2 black 1 pearl'],
];

// level 3: the blue deck
const BLUE = [
  [3, 2, 'blue', 1, null, '3 white 3 green 5 black 1 pearl'],
  [4, 0, 'white', 1, null, '6 white 2 blue 2 black'],
  [3, 2, 'green', 1, null, '5 white 3 blue 3 red 1 pearl'],
  [6, 0, 'none', 0, null, '8 white'],
  [4, 0, 'red', 1, null, '2 green 6 red 2 black'],
  [0, 3, 'wild', 1, null, '8 black'],
  [3, 2, 'red', 1, null, '5 blue 3 green 3 black 1 pearl'],
  [4, 0, 'blue', 1, null, '2 white 6 blue 2 green'],
  [3, 0, 'wild', 1, X, '8 red'],
  [4, 0, 'black', 1, null, '2 white 2 red 6 black'],
  [3, 2, 'black', 1, null, '3 white 5 green 3 red 1 pearl'],
  [4, 0, 'green', 1, null, '2 blue 6 green 2 red'],
  [3, 2, 'white', 1, null, '3 blue 5 red 3 black 1 pearl'],
];

const parseCost = (text) => {
  const words = text.split(' ');
  const cost = {};
  for (let i = 0; i < words.length; i += 2) cost[words[i + 1]] = Number(words[i]);
  return cost;
};

const DECKS = [GREEN, YELLOW, BLUE];

/** The cards of one level (1, 2 or 3), in their printed order. */
export function jewelCards(level) {
  return DECKS[level - 1].map(([pts, crowns, bonus, n, ability, cost], i) => ({
    id: `j${level}-${i}`, kind: 'jewel', level, cost: parseCost(cost), pts, crowns, ability, n, bonus, color: null,
  }));
}
