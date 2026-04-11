---
name: No direct node or tsx execution
description: Use pnpm test/playwright tests, not raw node/tsx invocations
type: feedback
---

Do not run `node` directly, install `tsx`, or use ad-hoc script execution.

**Why:** User preference — all execution should go through pnpm-mediated tooling.

**How to apply:** For UI verification write Playwright test files and run via `pnpm exec playwright test` (or a `pnpm` script wrapping it). For logic inspection use vitest. Never call `node` or `tsx` directly.
