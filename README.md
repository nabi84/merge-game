# Merge Han

A beginner-friendly Next.js + TypeScript + Tailwind scaffold for a cute Korean snack merge game.

## What is in this repo
- A concrete MVP spec in [docs/mvp-spec.md](/Users/HOH7B9/Desktop/ChatGPT/merge-game/docs/mvp-spec.md)
- A beginner-friendly architecture guide in [docs/architecture.md](/Users/HOH7B9/Desktop/ChatGPT/merge-game/docs/architecture.md)
- A first playable prototype using a grid-based merge loop

## Why the first prototype is grid-based
Watermelon-style physics is a bigger step than it looks. This version proves the merge ladder, board pressure, scoring, and chaining before adding a physics renderer.

## Run locally
This machine currently does not have `node` or `npm` available, so I could not install dependencies or boot the app here.

Once Node.js is installed:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Recommended next steps
1. Install Node.js 20+ and npm.
2. Run the app and tune the spawn table and scoring.
3. Add animation and sound juice.
4. Replace the grid board with a Canvas-based physics board.
5. Add optional OpenAI-powered flavor features through `app/api`.
