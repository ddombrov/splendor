---
status: accepted
---

# Clients poll for the opponent's move every two seconds

Online play starts with each browser asking the server for updates about every 2 seconds, and a player's own move shows immediately. Live push over WebSockets would need Durable Objects and more setup, and a turn-based game does not need it. If polling feels slow, moving to WebSockets is the planned upgrade.
