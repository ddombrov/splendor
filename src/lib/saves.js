// Games on this device and against the computer are kept in the browser's local storage, one slot per kind.
const key = (mode) => `sd:save:${mode}`;

export function loadSave(mode) {
  try {
    const v = JSON.parse(localStorage.getItem(key(mode)));
    return v && v.S && !v.S.over ? v : null;
  } catch { return null; }
}

export function writeSave(session, S) {
  try {
    const { mode, exp, source, difficulty, randomCards, randomRoyals } = session;
    localStorage.setItem(key(mode), JSON.stringify({ mode, exp, source, difficulty, randomCards, randomRoyals, S, at: Date.now() }));
  } catch { /* storage is full or blocked; the game just is not saved */ }
}

export function clearSave(mode) {
  try { localStorage.removeItem(key(mode)); } catch { /* ignore */ }
}
