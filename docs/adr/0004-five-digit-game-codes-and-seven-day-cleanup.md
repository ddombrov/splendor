---
status: accepted
---

# Games are keyed by a 5-digit code and deleted after seven idle days

Each game's primary key is a 5-digit code that players read aloud or type. The code space is small, about 100,000 values, so codes must be reused, and a weekly cron job deletes any game with no move in 7 days to free them. There is no turn timer, so an abandoned game occupies its code until that cleanup. Players can resign, and the opponent's last-active time is shown.
