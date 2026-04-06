# Beginner-Friendly Technical Architecture

## Why Next.js for this project
Next.js is not the game engine. It is the app shell around the game.

Use it for:
- Pages and routing
- Settings screens
- Menus and overlays
- Future OpenAI API routes
- Share pages and static content

Do not force React to become the full simulation engine. Keep the game rules in plain TypeScript modules and let React render state.

## Recommended architecture

### `app/`
Owns the application shell.
- `layout.tsx`: global frame and metadata
- `page.tsx`: homepage and primary game screen
- future `api/`: server routes for OpenAI-backed features

### `components/`
Owns UI pieces.
- HUD
- preview queue
- buttons
- settings panels
- tutorial cards

### `game/content/`
Owns static content definitions.
- snack tiers
- labels
- colors
- future theme packs

### `game/core/`
Owns gameplay rules.
- board shape
- piece spawning
- merge detection
- gravity resolution
- score calculation
- game over logic

### `game/types/`
Owns shared TypeScript types.

### `lib/`
Owns cross-cutting utilities.
- local storage helpers
- seeded random helpers
- future OpenAI client helpers

## Why this is beginner-friendly
- React components stay relatively small
- Game rules can be tested independently later
- Theme content can change without rewriting engine code
- You can replace the visual layer without rewriting the simulation

## State flow
1. React receives a user action such as "drop in column 2".
2. React calls a pure-ish TypeScript game function.
3. The engine returns the next `GameState`.
4. React re-renders the board and HUD.
5. Local storage persists best score only.

## Why this prototype uses a grid instead of physics
This first version is a rules prototype. It is designed to answer:
- Is the merge ladder readable?
- Is the score loop fun?
- Does planning feel rewarding?
- Does the theme land?

After those answers are yes, the next step is a physics board rendered with Canvas.

## Suggested phase plan

### Phase 1: Rules prototype
- Grid board
- click/tap to drop
- merge groups
- chains
- score

### Phase 2: Juice and UX
- sound
- pop animations
- combo callouts
- better tutorial
- accessibility settings

### Phase 3: Physics board
- Canvas renderer
- falling bodies
- circular collision
- wall bounce
- settle detection

### Phase 4: Meta progression
- local missions
- unlockable themes
- daily challenge seeds
- cosmetic rewards

### Phase 5: OpenAI support features
- AI run summaries
- AI event copy
- AI theme ideation tools

## Where OpenAI belongs
OpenAI should live in server routes under `app/api/*`.

Good examples:
- `app/api/run-summary/route.ts`
- `app/api/daily-flavor/route.ts`

Those routes should:
- read request data
- call the OpenAI API with your key from environment variables
- return short JSON responses

The client should treat AI as optional flavor, never as a blocker for the core gameplay loop.
