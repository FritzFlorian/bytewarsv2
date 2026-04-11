# Bytewars

A roguelike tactics game where you program robot squads using gambit-style priority lists, then watch them fight.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit/integration tests (Vitest, node + jsdom) |
| `pnpm typecheck` | TypeScript type-check without emitting |
| `pnpm e2e` | Run browser tests (Playwright, headless Chromium — auto-starts dev server) |
| `pnpm check` | Full check: `test` + `typecheck` + `e2e` |
| `pnpm lint` | Run ESLint |
| `pnpm run:fixture` | Pretty-print the walking-skeleton fight event log to stdout |

## Current State (v0.1 — done)

The walking skeleton is complete. It demonstrates the full end-to-end pipeline:
gambits → resolver → event log → animated DOM playback.

**To run it:**
1. `pnpm install && pnpm dev`
2. Open [http://localhost:5173](http://localhost:5173)
3. Click **Start Combat** — a hardcoded 2v2 fight resolves and plays back in the browser
4. Use **Play / Pause / Step** to control playback; the speed selector adjusts playback rate (0.5× – 10×)

**Debug pages** (dev server only):
- `/?debug=units` — renders all three chassis components side-by-side
- `/?debug=scene` — plays a hand-written fixture through the render layer

## What's Next (v0.2)

- **Gambit editor** — a dedicated screen to author per-unit gambit lists (condition + action dropdowns, drag-to-reorder) before running a fight
- **Combat visual feedback** — active unit highlight, target indicators (arrow/projectile), idle state distinction, scrolling combat log side panel

See `doc/roadmap.md` for the full task breakdown.
