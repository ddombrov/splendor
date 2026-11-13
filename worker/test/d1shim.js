// A tiny stand-in for Cloudflare D1, backed by Node's built-in SQLite, so the server can be tested
// without Cloudflare. It supports only what the server uses: prepare, bind, run, first and all.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function createDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const prepare = (sql) => {
    let args = [];
    const stmt = {
      bind: (...a) => { args = a; return stmt; },
      run: async () => { const r = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      first: async () => sqlite.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    };
    return stmt;
  };
  return { prepare, sqlite };
}
