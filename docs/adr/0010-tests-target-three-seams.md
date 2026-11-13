---
status: accepted
---

# Tests target three seams and not the screens

Automated tests sit at three high-level seams. The first is the rules engine, which takes a game state and an action and returns the new state, and covers the rules and the expansion. The second is the Worker's HTTP interface, run against a local test database, covering creating and joining games, submitting moves, polling, quick match, resigning, the cleanup, and what each player is allowed to see. The third is the AI's move chooser, which must return a legal move within its time limit. Tests check behaviour from the outside and not how the code is built inside. The screens have no automated tests.
