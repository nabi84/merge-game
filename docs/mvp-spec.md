# Merge Han MVP Spec

## Product goal
Build a mobile-first web game inspired by continuous merge games such as Watermelon Game, but themed around cute Korean snacks and designed to feel deeper than it first appears.

## Player fantasy
The player enters a cozy, collectible-feeling world of adorable snack icons, makes quick drop decisions, accidentally discovers chain reactions, and slowly learns that careful placement matters.

## Core promise
- Cute and readable in the first 10 seconds
- Playable with one thumb on mobile
- Endless, score-chasing loop
- Enough strategy to support "one more run"

## Target audience
- Casual mobile/web players
- Players who like cute visuals, cozy design, and snack aesthetics
- Players who enjoy "simple to learn, hard to master" score attacks

## MVP scope
- One endless mode
- One Korean snack theme
- One merge ladder with 12 tiers
- One score system
- One local best score save
- One preview queue
- One restart flow
- One polished HUD and onboarding panel

## Core gameplay loop
1. The player sees the current snack and the next three snacks.
2. The player chooses a column.
3. The snack drops into the board.
4. Touching matching snacks merge into the next tier.
5. Gravity settles the board.
6. New merges can chain automatically.
7. The player keeps playing until all columns are blocked.

## Strategy goals
- Encourage planning around the next few pieces
- Reward building stable columns instead of random spam
- Let chain reactions create high-score moments
- Keep rules simple enough that the depth feels discovered

## Merge ladder
1. Milk Candy
2. Banana Milk
3. Hotteok
4. Yakgwa
5. Bungeoppang
6. Tteok
7. Croffle
8. Macaron Box
9. Dalgona Set
10. Bingsoo
11. Dessert Tower
12. Festival Feast

## Scoring
- Base merge score grows with tier
- Larger groups are worth more than pairs
- Later chain links multiply value

## MVP success criteria
- A new player understands the rules without external explanation
- A full run takes roughly 2-5 minutes
- The player can feel the value of planning ahead
- The codebase is simple enough for further iteration

## Explicit non-goals for MVP
- Real-time physics simulation
- Multiplayer
- Accounts
- Cloud saves
- Live leaderboard
- In-app purchases
- Multiple themes
- AI-dependent gameplay

## OpenAI usage after MVP
- Generate run summary flavor text
- Generate daily mission text
- Generate seasonal event copy
- Help author new snack packs and theme variants
