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
| `pnpm e2e` | Run browser tests (Playwright, headless Chromium — auto-starts dev server) |
| `pnpm check` | Full check: `test` + `typecheck` + `e2e` |
| `pnpm lint` | Run ESLint |

## Walking Skeleton (v0.1)

The walking skeleton is complete. It demonstrates the full end-to-end pipeline:
gambits → resolver → event log → animated DOM playback.

**To run it:**
1. `pnpm install && pnpm dev`
2. Open [http://localhost:5173](http://localhost:5173)
3. Click **Start Combat** — a hardcoded 2v2 fight resolves instantly and plays back in the browser
4. Use **Play / Pause / Step** to control playback; the speed selector adjusts playback rate (0.5× – 10×)

**Debug pages** (dev server only):
- `/?debug=units` — renders all three chassis components side-by-side
- `/?debug=scene` — plays a hand-written fixture through the render layer

**To run the tests:**
```bash
pnpm test     # unit + integration tests (Vitest, node + jsdom)
pnpm e2e      # browser tests (Playwright, headless Chromium)
pnpm check    # all of the above + typecheck
```

## Status

v0.1 walking skeleton — done. Next: v0.2 (content data, vocabulary expansion, run map).
