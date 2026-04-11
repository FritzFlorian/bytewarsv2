# Bytewars — Project Instructions

- Always ask for details and clarification if you are unsure.
- After every task is fully finished, run `pnpm check` (runs unit tests + typecheck + e2e browser tests) and fix any errors before reporting the task as done.
- **Never run scripts directly** (no `node`, no `vite-node`, no `tsx`, no ad-hoc executables). All execution must go through pnpm-mediated tooling: `pnpm test`, `pnpm e2e`, `pnpm check`, or other declared `pnpm` scripts. When a task would naturally produce a standalone script, implement it as a Vitest test or Playwright spec instead.
- The `doc/` folder is the central reference for every development step. Before proposing or implementing changes, consult the relevant docs (`vision.md`, `gameplay.md`, `architecture.md`, `roadmap.md`, `open-questions.md`) and align with what they specify. When a task changes a decision the docs record, update the docs in the same step — code and docs must not drift.
- **Start every new development task by reading `doc/architecture.md` §0 (Quick Start).** It lists what is currently built, the key entry points, and the layer rules. This is the fastest way to orient before touching code.
