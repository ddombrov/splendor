---
status: accepted
---

# AI moves are computed in the human player's browser

In an AI game the human's browser calculates the AI's move and submits it as the second seat, through the same path and the same server validation as any other move. This keeps the server simple and means AI games are stored like every other game. The AI only uses information a player could see, so it never reads the human's reserved cards or the deck order. Difficulty and depth are separate choices, and each depth has its own time limit.
