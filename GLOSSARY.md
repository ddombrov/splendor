# Splendor Duel

A browser version of the two-player board game Splendor Duel, including the Counterfeiters expansion. Players take tokens, reserve and buy jewel cards, and race to one of three victory conditions.

## Language

### Components

**Board**:
The 5x5 grid of tokens that players take from, filled in a spiral starting from the centre.
_Avoid_: Grid, table

**Bag**:
The pool of tokens that are not currently on the board.
_Avoid_: Pool, supply

**Token**:
Any piece taken from the board: a gem, a pearl, a gold, or a glassware.
_Avoid_: Coin, chip

**Gem**:
A token of one of the five colours: blue, white, green, black, red.
_Avoid_: Stone, jewel

**Pearl**:
A token that pays for pearl costs but never gives a bonus.

**Gold**:
A wild token that can stand in for any other token when paying. It is only gained by reserving a card.
_Avoid_: Joker

**Glassware**:
A purple token that exists only with the expansion.
_Avoid_: Purple token

**Privilege**:
A scroll a player spends to take one non-gold token from the board. There are three in play, and they are shown as scroll icons.
_Avoid_: Scroll token, power

**Pyramid**:
The face-up jewel cards, 3 at level 3, 4 at level 2 and 5 at level 1.
_Avoid_: Market, tableau

### Cards

**Jewel card**:
A card with a level, a cost, a bonus, prestige points, crowns and sometimes an ability.
_Avoid_: Development card

**Level**:
Which of the three jewel decks a card belongs to.
_Avoid_: Tier

**Bonus**:
The discount a bought jewel card gives on future purchases, in the card's colour. Some cards give two. A wild bonus copies a colour the player already owns.

**Prestige points**:
Points printed on a card. They count toward the 20-point victory condition.
_Avoid_: Score, VP

**Crown**:
A symbol on a card. Reaching 3 and then 6 crowns lets the player take a royal card.

**Ability**:
An effect resolved when a jewel card is bought: extra turn, privilege, matching token, steal, or wild bonus.
_Avoid_: Power, effect

**Royal card**:
A card taken for free when a player reaches their 3rd and 6th crown. It gives prestige points and may have an ability.
_Avoid_: Noble

**Counterfeiter card**:
An expansion card that costs at least one glassware and gives a lasting ability instead of points. It cannot be reserved.

### Turn

**Optional action**:
Either using a privilege or replenishing the board. A player may do none, one, or both, before the mandatory action.

**Mandatory action**:
The one action every turn must contain: take tokens, reserve a card, or buy a card. A counterfeiter card can be bought with the expansion.

**Take tokens**:
Taking up to three adjacent non-gold tokens in a straight line from the board.

**Reserve**:
A mandatory action in two steps within the same turn. The player first takes a gold from the board, and only then chooses the card to reserve. Before choosing the card, the player can cancel and return the gold.
_Avoid_: Hold

**Purchase**:
A mandatory action where the player pays a card's cost, after bonuses, with tokens they choose. Payment must be exact, and gold can replace any token.
_Avoid_: Buy (in rules text)

**Replenish**:
An optional action that refills the empty board spaces from the bag and gives the opponent a privilege. When a player has no possible mandatory action, replenishing becomes required before they continue, and they still press the button themselves.
_Avoid_: Refill (in rules text)

**Bookkeeping**:
Effects that follow from a player's choices and happen automatically, with an animation: returning paid tokens to the bag, replacing pyramid cards, giving the penalty privilege to the opponent, filling the board, and checking victory.

**Victory condition**:
Reaching 20 prestige points, or 10 crowns, or 10 prestige points on cards of one colour. Some expansion royal cards lower the colour and crown thresholds to 9.

### Playing

**Game code**:
The 5-digit number that identifies one game.
_Avoid_: Room code, game ID

**Seat**:
A player's position in a game, held anonymously by one browser.
_Avoid_: Account, user

**Same-device game**:
A game where both seats are played by two people on one device.
_Avoid_: Hot-seat, local game

**Online game**:
A game where a second person joins from another browser by entering the game code.
_Avoid_: Multiplayer

**Quick match**:
Random matchmaking that pairs two waiting players into a base-game online game. After 60 seconds without a match the player is offered an AI game.

**AI game**:
A game where the second seat is played by the computer.

**Difficulty**:
How well the AI plays: Easy, Medium, or Hard.
_Avoid_: Level (reserved for jewel cards)

**Depth**:
How many moves ahead the AI looks, with a time limit: Quick, Standard, or Deep. It is chosen separately from difficulty.

**Card source**:
Where a game's cards come from: Random gen, which generates a fresh set, or Official, which uses the official card list.

**Move log**:
The ordered list of actions taken in a game, used to replay the opponent's move as an animation.

**Expansion**:
The Counterfeiters expansion, switched on per game.
