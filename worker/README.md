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

## Online

It is deployed at https://splendor-duel.danieldombrovsky9.workers.dev. The Worker serves both the game and
the `/api` routes from that one address, and the weekly cleanup runs on Mondays at 04:00 UTC.

To publish a new version, from the project folder with Node 22:

```
npx vite build
# then remove dist/images (box art), before uploading; dist/docs (the rulebook PDFs) is uploaded on purpose
npx wrangler deploy --config worker/wrangler.toml
```

The rulebook PDF tabs in Rules appear when /shared/docs/rules.pdf and /shared/docs/expansion.pdf are served, which they are in the current deploy.
