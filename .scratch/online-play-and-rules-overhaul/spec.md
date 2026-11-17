# Online play, AI opponents, and faithful rules for Splendor Duel

Status: ready-for-agent

## Problem Statement

The game is currently a single-screen, two-player toy. Both players share one screen and one browser tab, the whole game vanishes on refresh, and there is no way to play someone on another device or play against the computer. The rules are also too forgiving compared with the physical game. Payment is chosen automatically, reserving takes the gold and the card in one click, a player who cannot take any action has no way out, and the cards are randomly invented because the official list is not available yet. The result is neither a faithful version of the board game nor something two friends can use to play remotely.

## Solution

Turn the game into a website where every game has a 5-digit game code and is stored on a server. Players can play on one device, play online by sharing a code, get paired by Quick match, or play an AI opponent with a chosen difficulty and depth. The rules follow the physical game: the player makes every choice (what to pay with, taking gold before reserving a card, pressing Replenish even when it is forced), and only bookkeeping is automatic and animated. Cards come from a per-game card source, either Random gen or the Official list, which stays empty until the real cards are added. Games that nobody has played for seven days are cleaned up automatically.

## User Stories

### Starting and finding games

1. As a player, I want a home screen with Play on this device, Play the AI, Create online game, Join with code, Quick match and Rules, so that I can start any kind of game in one click.
2. As a player, I want one New game dialog for every game type, so that creating a game is the same experience each time.
3. As a player creating a game, I want to choose the expansion on or off, so that I can play the base game or The Counterfeiters.
4. As a player creating a game, I want to choose the card source, Random gen or Official, so that I can play with generated cards or the real ones.
5. As a player creating an AI game, I want to choose a difficulty and a depth, so that the opponent matches my skill and how long I am willing to wait.
6. As a player, I want every game to have a 5-digit game code shown in the game with a Copy button, so that I can share it or come back to it.
7. As a player, I want to join an online game by typing a game code, so that I can play a friend without any sign-up.
8. As a player, I want a clear error when a code does not exist, is already full, or has been cleaned up, so that I know what went wrong.
9. As a player, I want Quick match to pair me with another waiting player, so that I can play a stranger without arranging anything.
10. As a player in Quick match, I want to be offered an AI game after 60 seconds without a match, so that I am never stuck waiting.
11. As a player, I want Quick match to always be a base game with the same card source for everyone, so that matched players have identical settings.
12. As a player, I want Quick match to use the Official cards as soon as that list is filled, and Random gen until then, so that it improves automatically when the real cards exist.

### Identity and returning

13. As a player, I want to play without creating an account, so that I can start immediately.
14. As a player, I want my browser to remember my seat in each game, so that I can close the tab and come back to the same game with its code.
15. As a player in a same-device or AI game, I want only my own browser to be able to resume it, so that nobody else can take over my game.
16. As a player, I want only online games to be joinable from another browser, so that a second person can only enter when I intend them to.
17. As a player, I want to be able to see how recently my opponent was active, so that I know whether they are still around.
18. As a player, I want a Resign button, so that I can end a game I no longer want to continue.
19. As a player, I want an abandoned game to be removed automatically after seven days with no move, so that old games do not pile up.

### Turn flow and rules

20. As a player, I want to use a privilege or replenish the board before my mandatory action, so that I can set up my turn as in the physical game.
21. As a player, I want a privilege to let me take any one non-gold token, so that spending it matches the rules.
22. As a player, I want to take up to three adjacent tokens in a straight line, so that the take rule is enforced.
23. As a player, I want gold to be impossible to take as a normal token, so that gold is only gained by reserving.
24. As a player taking three tokens of one colour or two pearls, I want my opponent to receive a privilege, so that the penalty is applied.
25. As a player, I want reserving to be a two-step action in one turn, so that I first take a gold and only then choose a card.
26. As a player who has taken a gold, I want to be able to cancel before choosing a card, so that the gold goes back and I can change my mind like in real life.
27. As a player, I want my turn not to end until the card is chosen, so that reserving is one complete action.
28. As a player, I want reserving to be unavailable when there is no gold on the board or I already hold three reserved cards, so that the limits are enforced.
29. As a player, I want to see my reserved cards but not my opponent's, so that reserved cards stay secret.
30. As a player buying a card, I want to pay by choosing which of my own tokens to spend, so that nothing is done for me.
31. As a player buying a card, I want to see what is still owed after my bonuses and any gold I have used, so that I can pay correctly.
32. As a player buying a card, I want gold to stand in for any other token, so that wildcards work as in the rules.
33. As a player buying a card, I want the purchase accepted only when my payment is exactly enough, so that nobody overpays by accident.
34. As a player buying a card with a wild bonus, I want to choose which of my existing colours it copies, and be unable to buy it when I own none, so that the wild rule is followed.
35. As a player, I want a card ability to resolve when I buy the card, including extra turn, privilege, matching token, steal and wild, so that cards work as printed.
36. As a player reaching my third and sixth crown, I want to choose a royal card, so that crowns are rewarded.
37. As a player, I want to be limited to ten tokens at the end of my turn and asked what to discard, so that the token limit is enforced.
38. As a player who has no possible mandatory action, I want to be required to replenish the board first, so that I cannot get stuck.
39. As a player who must replenish, I want to still press the Replenish button myself, so that the game does not do it silently for me.
40. As a player, I want the game to end immediately when I reach 20 prestige points, 10 crowns, or 10 points on one colour, so that victory follows the rules.

### Automatic bookkeeping and animation

41. As a player, I want paid tokens to return to the bag automatically, so that I do not manage the bag by hand.
42. As a player, I want pyramid cards to be replaced automatically, so that the pyramid is always full.
43. As a player, I want the penalty privilege to move to my opponent automatically, so that I cannot forget it.
44. As a player, I want the board to fill automatically in spiral order when someone replenishes, so that the layout is correct.
45. As a player, I want these automatic steps to be animated, so that I can follow what changed.
46. As a player, I want a Settings option for animation speed, Normal, Fast or Off, so that I can match my patience.
47. As a player watching my opponent, I want their move to play back as an animation, so that I see exactly what they did.
48. As a player who rejoins after missing moves, I want the board to jump straight to the current state, so that I do not replay a long history.

### The expansion

49. As a player using the expansion, I want four glassware tokens added to the bag, so that they enter play as in the rules.
50. As a player using the expansion, I want glassware to count as a gem or pearl for taking, privileges and stealing, so that it behaves as the rulebook says.
51. As a player using the expansion, I want to buy one of three face-up counterfeiter cards as a mandatory action, so that the new action exists.
52. As a player owning counterfeiter cards, I want to switch on each discount or ability myself before paying, so that nothing is applied automatically.
53. As a player owning counterfeiter cards, I want each card's ability usable only once per turn, so that the rule is enforced.
54. As a player, I want end-of-turn counterfeiter abilities offered before the token limit is checked, so that the order matches the rules.
55. As a player using the expansion, I want the extra royal cards and their win conditions, so that the full expansion is playable.

### Playing the AI

56. As a player, I want Easy, Medium and Hard difficulties, so that I can pick how well the AI plays.
57. As a player, I want Quick, Standard and Deep depths for any difficulty, so that I can trade thinking time for strength.
58. As a player, I want the AI to stop thinking when its time limit is reached and still play a legal move, so that I never wait too long.
59. As a player, I want the AI to use only information I could see, so that it does not cheat by reading my reserved cards or the deck.
60. As a player, I want an AI game to be saved and resumable with its code, so that I can come back to it.

### Cards

61. As a player, I want Random gen to build a fresh, correctly sized set of cards each game, so that every game is different.
62. As a player, I want the Official option to exist but stay empty until the real cards are added, so that the real cards can be dropped in later.
63. As a player in an online game, I want both of us to see the same cards, so that the game is fair.

### Settings and help

64. As a player, I want Settings to hold the expansion toggle, animation speed, Rules and New game, so that options live in one place.
65. As a player, I want in-game confirmation dialogs for destructive actions like starting a new game, so that I do not lose a game by accident.
66. As a player, I want a collapsible reminder of my turn options, so that I can hide it once I know the rules.

## Implementation Decisions

- **Hosting and storage.** The game runs on Cloudflare Workers with a D1 database. The weekly cleanup is a scheduled job on the same platform.
- **Shared rules engine.** One rules engine takes a game state and an action and returns the new state. The browser and the Worker both run this exact code. It is the only place game rules live.
- **Double validation.** A player's browser checks a move first for instant feedback. The Worker re-validates the move with the same engine before writing it. Only legal moves are stored.
- **Hidden information.** The stored state holds everything, but each player is sent only what they are allowed to see. A player never receives the opponent's reserved cards or the deck order. The Worker also generates the Random gen decks when a game is created, so both players share identical cards.
- **Game identity.** Each game is stored under a 5-digit game code that is its primary key. Codes are reused after a game is deleted.
- **Seats.** Players are anonymous. Each browser keeps a private token for its seat. Same-device and AI games are resumable only from the creating browser, and only online games can be joined from another browser by code.
- **Stored data per game.** The current state, the move log, the settings chosen when the game was created (expansion, card source, mode, AI difficulty and depth), and timestamps for last move and each seat's last activity.
- **Sync.** Browsers poll for changes about every two seconds. A player's own move appears immediately. WebSockets are a possible later upgrade.
- **Move log and animation.** The server stores the ordered actions of each game. The opponent's move is replayed from that log as animation. A player who rejoins after several missed moves is shown the current state directly.
- **Turn rules.** Optional actions come first, then exactly one mandatory action. Reserving is two steps within one turn: take a gold from the board, then choose a card, with cancel allowed before the card is chosen. Purchasing is manual and exact, with gold standing in for any token. A forced replenish is required when no mandatory action is possible, and the player must press the Replenish button.
- **Automatic bookkeeping.** Returning paid tokens to the bag, replacing pyramid cards, handing out the penalty privilege, filling the board in spiral order and checking victory are automatic and animated.
- **Animation settings.** Each animation lasts roughly a third to half a second and they play in order. Settings offers Normal, Fast and Off, with Normal as the default.
- **Expansion.** Glassware, counterfeiter cards, the 12-card royal pool and the modified abilities are supported. Counterfeiter discounts and abilities are switched on by the player and are each usable once per turn.
- **Card source.** A per-game setting with two options, Random gen and Official. Official uses a card list that is intentionally empty until the real cards are supplied, and its format is defined so the list can be filled in later. Quick match uses Official once it is filled and Random gen until then.
- **Quick match.** A waiting queue pairs two players into a base-game online game. After 60 seconds without a match, the player is offered an AI game.
- **Leaving.** There is no turn timer. Players can resign, and each player can see when their opponent was last active.
- **Cleanup.** A weekly scheduled job deletes every game that has had no move in seven days.
- **AI.** Difficulty (Easy, Medium, Hard) controls how well the AI plays. Depth (Quick, Standard, Deep) controls how far ahead it looks with a time cap: 1 move and 0.5 seconds, 2 moves and 1.5 seconds, and 3 moves and 3 seconds. Any difficulty can use any depth. The AI's move is calculated in the human's browser and submitted as the second seat, through the same validation as any other move. The AI only uses information a player could see.
- **Screens.** A home screen and a New game dialog are built with the existing look and components, without extra visual polish. A redesign is deferred.
- **Terminology.** The glossary defines the terms used here, including Replenish, Bookkeeping, Seat, Game code, Difficulty and Depth.

## Testing Decisions

- A good test checks behaviour from the outside: it sends actions or requests and checks the resulting state or response. It does not test how the code is built inside, so refactoring does not break it.
- There are three test seams, and the screens are not tested.
  1. The rules engine, which takes a state and an action and returns the new state. It covers the two-step reserve with cancel, manual exact payment, gold as wild, the forced replenish, privilege penalties, the token limit, crown and royal handling, all three victory conditions, wild bonuses, and the expansion.
  2. The Worker's HTTP interface, run against a local test database. It covers creating and joining games, submitting moves, polling, quick match, resigning, the cleanup of idle games, rejection of illegal moves, and that each player only sees what they are allowed to see.
  3. The AI's move chooser, which takes a state, a difficulty and a depth, and must return a legal move within the time limit.
- Prior art: the repository has no automated tests yet. The only existing check was a throwaway random-play script that ran many games to completion and looked for crashes, which is a useful idea for a stress test of the engine.

## Out of Scope

- A card maker or custom decks. The "Make your own" option was removed.
- User accounts, passwords, or continuing a game from a different device.
- Real-time WebSockets. Polling is used first.
- Turn timers or automatic forfeits.
- Spectators, chat, ratings or leaderboards.
- Entering the official card data. The list is left empty on purpose.
- Visual redesign or polish of any screen. UI enhancements come later when requested.
- Automated tests for the screens.
- Deploying to a live Cloudflare account. That is a public action and needs the owner's explicit go-ahead at that point.

## Further Notes

- The order of work was left to the implementer. A sensible order is the rules changes and tests, then animations, then the Worker and database, then the screens, then the AI, then deployment.
- Details confirmed by the owner, to be settled in the implementation: protecting against two moves being written at the same time (for example with a version number on each game), how seat tokens are stored on the server, whether game codes may start with zero, and what happens to a Quick match player who disconnects while waiting.
- The existing game logic already stores everything needed to move into a shared engine, but several rules in this spec are not implemented yet: the two-step reserve, manual payment, the forced replenish, and the Official card source.
- The glossary and the ten decision records in the repository describe the same design in more detail and should be read first.
