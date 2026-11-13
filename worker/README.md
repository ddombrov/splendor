# Game server

A Cloudflare Worker with a D1 database. It owns online games: browsers send actions, the Worker runs
the shared rules engine in `src/engine`, stores only legal results, and sends each player a view with
the other player's hidden information removed.

- `schema.sql` is the database: rooms, a move log and the quick match queue.
- `src/handler.js` is the whole server. `src/index.js` connects it to Cloudflare and to the weekly cleanup.
- `test/` runs the server against a real SQLite database. These tests need Node 22 or newer and are skipped on older Node.

## Running it on your machine

Wrangler needs Node 22 or newer.

```
npm run worker:db     # creates the local database tables, once
npm run worker:dev    # starts the server on http://localhost:8787
npm run dev           # starts the game on http://localhost:8765, which forwards /api to the server
```

Nothing here touches Cloudflare. Local data lives in the git-ignored `.wrangler` folder.

## Putting it online

This is not done yet. It needs the real database created (`wrangler d1 create splendor-duel`), its id
put in `wrangler.toml`, the schema applied with `--remote`, and a deploy. The weekly cleanup is the
`crons` line in `wrangler.toml`.
