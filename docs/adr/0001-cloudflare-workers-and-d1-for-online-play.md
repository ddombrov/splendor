---
status: accepted
---

# Cloudflare Workers with D1 hosts online play

Online games, same-device games and AI games are all stored on the server so a player can return by game code. We chose Cloudflare Workers with a D1 database because its built-in cron trigger covers the weekly cleanup and there is no server to maintain. D1 was confirmed as the database.

Alternatives considered: a hosted Postgres service such as Supabase, and a self-run Node server. Both would work but add something to operate.
