# Splendor Duel

A web version of the two-player board game Splendor Duel, with the Counterfeiters expansion. Play on one device, against the computer, or online with a friend or a stranger.

- Play it: https://danieldombrovsky.com/splendor-duel/
- Direct link to the game: https://splendor-duel.danieldombrovsky9.workers.dev

Built with React, Vite, Tailwind CSS and shadcn/ui. The rules engine in `src/engine` is shared by the browser and the Cloudflare Worker in `worker/`, which stores online games in Cloudflare D1. See `worker/README.md` for deploying.
