// PROTOTYPE v2: throwaway sample data and behaviour shared by the three design directions.
// Only logic lives here. Every direction draws its own layout, type and components from scratch.
import { useState } from 'react';

export const KINDS = ['blue', 'white', 'green', 'black', 'red', 'pearl'];
export const NAMES = { blue: 'Sapphire', white: 'Diamond', green: 'Emerald', black: 'Onyx', red: 'Ruby', pearl: 'Pearl', gold: 'Gold' };

export const SAMPLE_PLAYER = {
  tok: { blue: 3, white: 2, green: 2, black: 2, red: 3, pearl: 1, gold: 2 },
  bonus: { blue: 1, white: 0, green: 2, black: 0, red: 1 },
};
export const SAMPLE_CARD = { level: 3, pts: 4, crowns: 1, bonus: 'green', cost: { blue: 4, white: 2, red: 3, pearl: 1 } };

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

export function owedByKind(card, bonus) {
  const owed = {};
  for (const k of KINDS) {
    const need = (card.cost[k] || 0) - (k === 'pearl' ? 0 : bonus[k] || 0);
    if (need > 0) owed[k] = need;
  }
  return owed;
}

/** Manual, exact payment: the player decides every token. Nothing is chosen for them. */
export function usePayment(card = SAMPLE_CARD, player = SAMPLE_PLAYER) {
  const owed = owedByKind(card, player.bonus);
  const kinds = Object.keys(owed);
  const [own, setOwn] = useState({});
  const [gold, setGold] = useState({});
  const goldUsed = sum(gold);
  const remaining = (k) => owed[k] - (own[k] || 0) - (gold[k] || 0);
  const canOwn = (k) => remaining(k) > 0 && (own[k] || 0) < player.tok[k];
  const canGold = (k) => remaining(k) > 0 && goldUsed < player.tok.gold;
  const bump = (set, k, d) => set((o) => ({ ...o, [k]: Math.max(0, (o[k] || 0) + d) }));
  return {
    card, player, owed, kinds, own, gold, remaining, canOwn, canGold,
    goldLeft: player.tok.gold - goldUsed,
    ownLeft: (k) => player.tok[k] - (own[k] || 0),
    totalLeft: kinds.reduce((a, k) => a + remaining(k), 0),
    done: kinds.every((k) => remaining(k) === 0),
    addOwn: (k) => canOwn(k) && bump(setOwn, k, 1),
    addGold: (k) => canGold(k) && bump(setGold, k, 1),
    // Click-only helper: put a gold on the first colour that still needs paying.
    addGoldAnywhere: () => { const k = kinds.find(canGold); if (k) bump(setGold, k, 1); },
    undoOwn: (k) => (own[k] ? bump(setOwn, k, -1) : null),
    undoGold: (k) => (gold[k] ? bump(setGold, k, -1) : null),
    reset: () => { setOwn({}); setGold({}); },
  };
}

export const MODES = [
  { key: 'device', label: 'Play on this device', blurb: 'Two people, one screen' },
  { key: 'ai', label: 'Play the computer', blurb: 'Choose how clever, and how patient' },
  { key: 'online', label: 'Host an online game', blurb: 'Share a five-digit code' },
  { key: 'join', label: 'Join with a code', blurb: 'Enter a friend\'s code' },
  { key: 'quick', label: 'Quick match', blurb: 'Be paired with a stranger' },
];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const DEPTHS = ['Quick', 'Standard', 'Deep'];
export const SOURCES = ['Random', 'Official'];
export const SAMPLE_CODE = '48217';

export function useNewGame(initial = 'device') {
  const [mode, setMode] = useState(initial);
  const [exp, setExp] = useState(false);
  const [source, setSource] = useState('Random');
  const [difficulty, setDifficulty] = useState('Medium');
  const [depth, setDepth] = useState('Standard');
  const [code, setCode] = useState('');
  const has = {
    setup: ['device', 'ai', 'online'].includes(mode),
    ai: mode === 'ai',
    code: mode === 'join',
    quick: mode === 'quick',
  };
  const ready = !has.code || code.length === 5;
  const verb = { join: 'Join', quick: 'Find a match' }[mode] || 'Start';
  return {
    mode, setMode, exp, setExp, source, setSource, difficulty, setDifficulty, depth, setDepth,
    code, setCode: (v) => setCode(v.replace(/\D/g, '').slice(0, 5)), has, ready, verb,
    current: MODES.find((m) => m.key === mode),
  };
}
