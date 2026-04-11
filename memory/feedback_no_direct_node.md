---
name: Never run scripts directly
description: All execution must go through declared pnpm scripts — never node, vite-node, tsx, or any direct executable
type: feedback
---

**Rule:** Never run any script directly — no `node`, no `vite-node`, no `tsx`, no `pnpm exec <binary>` for execution purposes. This is a hard rule documented in CLAUDE.md.

**Why:** Strong user preference. Repeatedly corrected. Any slip is unacceptable.

**How to apply:**
- Logic output / inspection → implement as a Vitest test that uses `console.log`, run via `pnpm test` or `pnpm run:fixture` wrapping `vitest run <file>`
- UI verification → Playwright spec in `tests/e2e/`, run via `pnpm e2e`
- When a roadmap task says "script", implement it as a test instead and wire a `pnpm` script that calls `vitest run` on that specific file
