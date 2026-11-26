import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, reduce } from '../engine/engine.js';
import { clearSave, loadSave, writeSave } from './saves.js';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

describe('saved games', () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it('brings back the same game that was saved and keeps it playable', () => {
    let S = createGame(true, 5, 0);
    S = reduce(S, { type: 'chooseFirst', player: 0 });
    writeSave({ mode: 'ai', exp: true, difficulty: 'hard' }, S);
    const back = loadSave('ai');
    expect(back.S).toEqual(JSON.parse(JSON.stringify(S)));
    expect(back).toMatchObject({ exp: true, difficulty: 'hard' });
    expect(() => reduce(back.S, { type: 'tok', i: 12 })).not.toThrow();
  });

  it('keeps one slot per kind and forgets finished games', () => {
    const S = createGame(false, 1, 0);
    writeSave({ mode: 'device' }, S);
    expect(loadSave('ai')).toBeNull();
    writeSave({ mode: 'device' }, { ...S, over: 'Player 1' });
    expect(loadSave('device')).toBeNull();
    writeSave({ mode: 'device' }, S);
    clearSave('device');
    expect(loadSave('device')).toBeNull();
  });
});
