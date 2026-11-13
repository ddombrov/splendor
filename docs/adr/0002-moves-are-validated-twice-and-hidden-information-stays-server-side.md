---
status: accepted
---

# Moves are validated in the browser and again by the Worker, and hidden information is redacted on read

A player's browser checks a move first so it feels instant, and the Worker re-runs the same rules code before writing it. Only legal moves reach the stored game state. Without the second check, anyone using browser developer tools could write an illegal state, and the stored state would reveal the opponent's reserved cards and the deck order. Each player therefore reads back only what they are allowed to see.

This extends the original idea of trusting the browser's validation alone. It requires the rules engine to be shared code that runs in both places.
