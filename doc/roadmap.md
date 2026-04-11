# Roadmap

This file is the **execution plan** for Bytewars. The other docs say *what* the game is; this one says *what we build next, in what order, and when we know it's done.*

It is a living document. Update task status as work progresses. If a task changes a decision recorded in another doc (gameplay.md, architecture.md, setting.md), update that doc in the same PR — per `CLAUDE.md`, code and docs must not drift.

## How to read this file

- Work is grouped into **versions** (v0.1, v0.2, …). A version ships when all its milestones are done.
- Each version contains **milestones** (M0, M1, …). Milestones within a version run in **sequence**.
- Each milestone contains **tasks**. Tasks within a milestone may be marked **(parallel)** — those can be picked up by independent agents at the same time. Otherwise tasks run in their listed order.
- Each task has: **status**, **track**, **depends on**, **inputs**, **outputs**, **acceptance**, and optional **notes**.
- **Status** values: `todo` · `in-progress` · `blocked` · `done`.
- **Track** values: `foundation` · `logic` · `ui` · `render` · `integration`. The track tells you which layer the work touches and which other tracks it must not cross (per `architecture.md` §2).
- **Acceptance** is a *testable* check, not a vibe. If you can't tell whether the task is done from the acceptance line, the task is underspecified — push back.

## How to work on this in parallel

The three-layer architecture (`architecture.md` §2) is explicitly designed so logic, ui, and render can be developed independently against shared contracts. Multi-agent work follows from that:

1. **M0 and M1 must finish before parallel work can start.** They establish the project skeleton, the boundary lint, and the type contracts every layer depends on.
2. **Once M1 is done, M2 splits into three tracks** (logic / ui / render) that can run concurrently. Each track only touches files under its own layer's folder, so two agents working on different tracks should not produce merge conflicts.
3. **Each task lists its exact `outputs`** — the files it is allowed to create or modify. An agent picking up a task should not write outside that list without flagging it.
4. **Render can be developed against hand-written event-log fixtures** before the resolver is implemented. UI can be developed against the stubbed logic API (M1) before any logic exists. This is the whole point of M1.
5. **Integration (M3) is sequential** and reconciles any contract drift between tracks.

If you (an agent or a human) start a task, set its status to `in-progress` and add a one-line note about which branch / PR you are using. When you finish, set it to `done` and link the merged PR.

---

## v0.1 — Walking Skeleton

**Goal.** End-to-end pipeline proof. Press *Start Combat*, watch one hardcoded fight resolve from gambits → resolver → event log → DOM playback. The walking skeleton intentionally has **no map, no rewards, no editor, no content loaders, no modules, no statuses, no cooldowns**. It exists to de-risk the architecture before any content work begins.

**Scope.** Two player units vs. two enemy units. Hardcoded gambits using a tiny vocabulary subset. One screen (Combat). One seed. Deterministic outcome. Visible in the browser; covered by tests in CI.

**Out of scope for v0.1** (deferred to later versions): map / nodes / rewards · gambit editor UI · content data files / Zod loaders · modules · statuses · cooldowns · multiple chassis classes beyond the three needed for the fixture · audio · save/resume · main menu / run summary screens.

**Done bar.** All tasks below are `done`, T-3.2 passes in CI, and a human can boot `pnpm dev` and watch the fight play to completion.

### M0 — Foundation (sequential)

#### T-0.1 — Initialize Vite + React + TypeScript project
- **Status:** done
- **Track:** foundation
- **Depends on:** —
- **Inputs:** `pnpm-workspace.yaml` (supply-chain rules — must be honored when adding deps), `architecture.md` §1
- **Outputs:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`. Update `README.md` to replace the "open `index.html`" instructions with `pnpm install && pnpm dev`.
- **Acceptance:** `pnpm install && pnpm dev` boots a hello-world page in the browser; `pnpm build` produces `dist/` without errors or warnings; TypeScript is in strict mode (`"strict": true`).
- **Notes:** Use the Vite React-TS template as a starting point. Respect `pnpm-workspace.yaml` (`minimumReleaseAge`, `blockExoticSubdeps`, etc.) for every dependency added.

#### T-0.2 — Folder skeleton matching architecture.md §5
- **Status:** done
- **Track:** foundation
- **Depends on:** T-0.1
- **Inputs:** `architecture.md` §5
- **Outputs:** Empty folders (with `.gitkeep`) at: `src/logic/{state,gambits,combat,map,content}`, `src/ui/{screens,components,hooks}`, `src/render/{CombatScene,animations}`, `src/content/schema`, `src/styles`, `tests/logic`.
- **Acceptance:** `tree src/ tests/` matches `architecture.md` §5; `pnpm build` still passes.
- **Notes:** No code yet — just the shape. Subsequent tasks fill the folders.

#### T-0.3 — Vitest setup (logic env)
- **Status:** done
- **Track:** foundation
- **Depends on:** T-0.1
- **Inputs:** `architecture.md` §9
- **Outputs:** `vitest.config.ts` (or merged into `vite.config.ts`); a trivial test at `tests/logic/smoke.test.ts` that imports nothing from the project and asserts `1 + 1 === 2`; `pnpm test` script in `package.json`.
- **Acceptance:** `pnpm test` runs the smoke test in **node env** (no jsdom), and it passes.
- **Notes:** Logic tests must run in node env per `architecture.md` §9 — if jsdom leaks in here, the boundary is already breaking. UI tests will need jsdom; that config is added in T-2B.1, not now.

#### T-0.4 — Layer-boundary lint
- **Status:** done
- **Track:** foundation
- **Depends on:** T-0.2
- **Inputs:** `architecture.md` §2 (strict rules)
- **Outputs:** ESLint config (using `eslint-plugin-import` / `eslint-plugin-boundaries` or equivalent) that forbids:
  1. `src/logic/**` importing from `src/ui/**`, `src/render/**`, `react`, `react-dom`, or any DOM/browser global type.
  2. `src/render/**` importing from `src/ui/**`.
  3. `Math.random()` anywhere under `src/logic/**` (custom rule or `no-restricted-syntax`).
  4. `src/ui/**` importing from `src/render/**` *internals* — only the public render entry point is allowed (TBD: define one in T-2C.2).
  Plus a `pnpm lint` script.
- **Acceptance:** `pnpm lint` passes on the empty skeleton. Manually create a temporary file under `src/logic/` that imports from `react` — `pnpm lint` fails. Delete the temp file.
- **Notes:** This is the architectural backbone. It must be in place **before** logic/ui/render agents start working in parallel, otherwise the boundary will rot the moment two agents are working at once. CI (GitHub Actions) is deliberately deferred until after v0.1 ships per Q-V0.1-5 — during M2, whoever merges is responsible for running `pnpm lint && pnpm test && pnpm build` locally.

### M1 — Contracts (sequential, blocks all M2 parallel work)

#### T-1.1 — Core domain types
- **Status:** done
- **Track:** foundation
- **Depends on:** T-0.2, T-0.3
- **Inputs:** `gameplay.md` §3 (combat layout), `architecture.md` §4 (interpreter shape)
- **Outputs:** `src/logic/state/types.ts` exporting (at minimum): `UnitId`, `Side` (`'player' | 'enemy'`), `Row` (`'front' | 'middle' | 'back'`), `Column` (`0 | 1 | 2`), `SlotRef` (`{ side, row, column }`), `Unit` (`{ id, side, slot, hp, maxHp, gambits }`), `Battlefield` (`{ slots, round }`), `CombatState` (`{ battlefield, seed, finished: false | 'player' | 'enemy' }`).
- **Acceptance:** Compiles under strict TS. Re-exported from `src/logic/index.ts`. One type-only test (`tests/logic/types.test.ts`) constructs a sample `CombatState` literal and asserts no compiler errors.
- **Notes:** Keep this minimal for the walking skeleton. **Do not** add fields for modules, statuses, cooldowns, or class info yet — those land in v0.2 with content data. Document the omissions in a top-of-file comment so v0.2 work knows where to extend.

#### T-1.2 — Gambit and action types (walking-skeleton subset)
- **Status:** done
- **Track:** foundation
- **Depends on:** T-1.1
- **Inputs:** `architecture.md` §4, `gameplay.md` §7
- **Outputs:** `src/logic/gambits/types.ts` exporting:
  - `TargetSelector` = `'self' | 'nearest_enemy' | 'any_enemy'`
  - `Condition` = `{ kind: 'always' } | { kind: 'self_hp_below'; pct: number } | { kind: 'target_exists'; target: TargetSelector }`
  - `Action` = `{ kind: 'attack'; target: TargetSelector } | { kind: 'idle' }`
  - `Rule` = `{ condition: Condition; action: Action }`
  - `GambitList` = `Rule[]`
  Re-exported from `src/logic/index.ts`.
- **Acceptance:** Compiles strict; consumed by a placeholder fixture in `tests/logic/fixtures.ts` (just a typed const, no behavior).
- **Notes:** This is **deliberately a tiny subset** of the v1 vocabulary. The point of v0.1 is to prove the pipeline, not cover the full design. v0.2 expands the vocabulary; the *shape* (discriminated unions) should not change.

#### T-1.3 — `CombatEvent` discriminated union (walking-skeleton subset)
- **Status:** done
- **Track:** foundation
- **Depends on:** T-1.1
- **Inputs:** `architecture.md` §3
- **Outputs:** `src/logic/combat/events.ts` exporting `CombatEvent`. Subset for v0.1: `round_started`, `turn_started`, `rule_fired`, `action_used`, `damage_dealt`, `unit_destroyed`, `turn_ended`, `round_ended`, `combat_ended`. Re-exported from `src/logic/index.ts`.
- **Acceptance:** Compiles strict. A test in `tests/logic/events.test.ts` round-trips a sample `CombatEvent[]` through `JSON.parse(JSON.stringify(...))` and `expect(...).toEqual(...)` — proves it's plain serializable data with no class instances or functions.
- **Notes:** Heal, status, and movement events come in v0.2 with the corresponding actions. Keep the union open for extension.

#### T-1.4 — Seeded RNG
- **Status:** done
- **Track:** foundation
- **Depends on:** T-0.4
- **Inputs:** `architecture.md` §8
- **Outputs:** `src/logic/rng.ts` exporting `createRng(seed: number): { next(): number; nextInt(maxExclusive: number): number }`. Tests in `tests/logic/rng.test.ts`.
- **Acceptance:** Same seed produces an identical sequence across two `createRng` instances (asserted across ≥100 calls). `pnpm lint` would catch any `Math.random()` in `src/logic/` (manual check by inserting one temporarily).
- **Notes:** Mulberry32 is fine. Not cryptographic; not trying to be.

#### T-1.5 — Logic public API stub
- **Status:** done
- **Track:** foundation
- **Depends on:** T-1.1, T-1.2, T-1.3, T-1.4
- **Inputs:** all previous M1 contracts
- **Outputs:** `src/logic/index.ts` exporting:
  - All types from T-1.1, T-1.2, T-1.3.
  - `createCombat(seed: number, playerUnits: Unit[], enemyUnits: Unit[]): CombatState` — **stubbed**, throws `"not implemented (T-2A.3)"`.
  - `resolveRound(state: CombatState): { state: CombatState; events: CombatEvent[] }` — **stubbed**, throws.
  - `isCombatOver(state: CombatState): false | 'player' | 'enemy'` — **stubbed**, throws.
- **Acceptance:** `src/ui/` and `src/render/` (when they exist) can import these symbols without TS errors. `tests/logic/api.test.ts` confirms the symbols exist and throw the expected message.
- **Notes:** **This task is the parallel-work seam.** Once T-1.5 is merged, three agents can start M2 tracks A / B / C simultaneously against this stable surface.

### M2 — Layer implementation (parallel after M1)

The three tracks below run **in parallel**. Each track only modifies files under its own layer's folder. If a task here needs a contract change in `src/logic/` types (M1 outputs), stop and update the M1 file in a small standalone PR first — do not edit types from a track PR.

#### Track A — logic

##### T-2A.1 — Walking-skeleton fixture (parallel)
- **Status:** done
- **Track:** logic
- **Depends on:** T-1.5
- **Inputs:** contracts from M1
- **Outputs:** `src/logic/content/fixtures.ts` exporting:
  - `walkingSkeletonFixture()` returning `{ playerUnits: Unit[]; enemyUnits: Unit[] }`.
  - 2 player units (one vacuum-class, one butler-class — names and stats hardcoded). Player units start with **80 HP** (per Q-V0.1-2).
  - 2 enemy units (`qa-rig` × 2). Enemy units start with **60 HP**.
  - Each unit gets a `GambitList` using **only** the v0.1 vocabulary.
- **Acceptance:** A test asserts unit count, asserts each gambit only uses condition/action kinds defined in T-1.2, and asserts the hardcoded HP values match Q-V0.1-2.
- **Notes:** Hardcoded only — **no JSON loaders, no Zod yet**. Those land with content data in v0.2. Damage value for `attack` is hardcoded to `10`; revisit when modules exist.

##### T-2A.2 — Gambit interpreter (parallel-with-2A.1 once 2A.1 is merged; otherwise sequential)
- **Status:** done
- **Track:** logic
- **Depends on:** T-1.5, T-2A.1
- **Inputs:** types from M1, fixture from T-2A.1
- **Outputs:** `src/logic/gambits/interpreter.ts` implementing:
  - `chooseAction(unit: Unit, battlefield: Battlefield): Action`
  - Internal evaluators for `always`, `self_hp_below`, `target_exists`.
  - Internal target resolvers for `self`, `nearest_enemy`, `any_enemy`.
  - Falls through to `{ kind: 'idle' }` when no rule matches.
  - `tests/logic/interpreter.test.ts` with at least one test per condition kind, one test per target selector, and one fall-through-to-idle test.
- **Acceptance:** ≥6 passing tests; pure function (no I/O, no globals); imports nothing from `src/ui/`, `src/render/`, or anywhere outside `src/logic/`.
- **Notes:** No RNG needed in the v0.1 subset (no tie-breaking in `nearest_enemy` for the walking-skeleton fixture — pick the lowest-row, lowest-column slot deterministically).

##### T-2A.3 — Combat resolver
- **Status:** done
- **Track:** logic
- **Depends on:** T-2A.2
- **Inputs:** interpreter, fixture, RNG
- **Outputs:**
  - `src/logic/combat/resolver.ts` implementing the round loop per `gameplay.md` §4: alternating player/enemy by index, one action per unit per round, emitting `CombatEvent`s in correct order (`round_started` → for each unit: `turn_started`, `rule_fired`, `action_used`, optional `damage_dealt` / `unit_destroyed`, `turn_ended` → `round_ended`; `combat_ended` when one side is all destroyed).
  - `src/logic/index.ts` updated: stubs from T-1.5 replaced with real implementations of `createCombat`, `resolveRound`, `isCombatOver`.
  - `tests/logic/resolver.test.ts` — golden test against the walking-skeleton fixture with a pinned seed asserting an exact event-log shape and a deterministic winner.
- **Acceptance:** Golden test passes. Combat eventually ends (`combat_ended` event always emitted within a generous round cap, e.g. 100). Expected fight length with Q-V0.1-2 values (10 dmg, 80/60 HP) is ~6–8 rounds. Rerunning with the same seed produces the same event log byte-for-byte.
- **Notes:** Damage is fixed (`10` per attack) for v0.1 — no variance, no crit, no row/column reach rules. The reach rules from `gameplay.md` §3 land in v0.2 along with the row/column action types. Document this simplification in a top-of-file comment.

##### T-2A.4 — Headless run script
- **Status:** done
- **Track:** logic
- **Depends on:** T-2A.3
- **Inputs:** real logic API
- **Outputs:** `scripts/run-fixture.ts` plus a `pnpm run:fixture` script that runs the walking-skeleton fight to completion and pretty-prints the event log to stdout.
- **Acceptance:** `pnpm run:fixture` prints a readable trace of the fight ending in a `combat_ended` line.
- **Notes:** Useful for the render-track agent to inspect real event-log shape without booting the UI.

#### Track B — ui

##### T-2B.1 — Subscribe bridge + `useGameState` (parallel with Track A and Track C)
- **Status:** done
- **Track:** ui
- **Depends on:** T-1.5
- **Inputs:** logic public API (stubbed is fine)
- **Outputs:**
  - `src/ui/state.ts` — a tiny store using `useSyncExternalStore` (or hand-rolled subscribe pattern), holding the current `CombatState | null`.
  - `src/ui/hooks/useGameState.ts` — React hook returning `[state, dispatch]`.
  - `tests/ui/state.test.ts` — first jsdom test; configure `vitest.config.ts` to switch env per test file (use `// @vitest-environment jsdom` directive on this file, or split into a separate vitest project — your call).
- **Acceptance:** Hook returns initial state; dispatching a no-op intent triggers a re-render in a test component. UI tests run in jsdom, logic tests still run in node env.
- **Notes:** No Redux, no Zustand (per `architecture.md` §6). Keep this small.

##### T-2B.2 — App shell + Combat screen scaffold (parallel)
- **Status:** done
- **Track:** ui
- **Depends on:** T-2B.1
- **Inputs:** state hook
- **Outputs:**
  - `src/ui/App.tsx` rendering only the Combat screen for v0.1.
  - `src/ui/screens/Combat/CombatScreen.tsx` containing:
    - A "Start Combat" button that calls a `startCombat` intent.
    - A 3×3 + 3×3 layout placeholder (CSS grid; empty divs as slots).
    - A play/pause/step control row (inert until T-3.1 wires render in).
    - A `<div>` mount point where the render layer's `CombatScene` will be plugged in by T-3.1.
  - `src/ui/screens/Combat/CombatScreen.module.css` (or equivalent).
- **Acceptance:** `pnpm dev` shows the Combat screen with the layout and inert controls. Clicking "Start Combat" calls the (stubbed) logic API and logs the resulting state to the console.
- **Notes:** This task **does not** import from `src/render/` — that wiring happens in T-3.1.

#### Track C — render

##### T-2C.1 — Three chassis components in DOM/SVG/CSS (parallel)
- **Status:** done
- **Track:** render
- **Depends on:** T-1.1 (types only — does **not** depend on logic implementation)
- **Inputs:** `setting.md` §4, `doc/art-style-samples.html` (column B), types from T-1.1
- **Outputs:**
  - `src/render/units/Vacuum.tsx`
  - `src/render/units/Butler.tsx`
  - `src/render/units/QaRig.tsx`
  - Each composed from a tree of `<div>` and `<svg>` primitives — chassis body, dome/head, eye, treads/arms, etc., as separate elements so future modules can attach as child elements.
  - Two-tone cel shading via CSS classes (base / shadow), optional small highlight accent.
  - `src/styles/units.css` with the shared shading rules.
  - A throwaway debug page (e.g. `src/ui/screens/Combat/_DebugUnits.tsx`, only routed in dev) that renders all three chassis side-by-side at slot size for visual review.
- **Acceptance:** All three chassis render identifiably at slot size in the debug page. Silhouettes pass the "tell apart in solid black" check from `setting.md` §4 (manually verified; document the check in the PR).
- **Notes:** No sprite assets, no images. Pure DOM/SVG/CSS. The compositional structure matters more than the polish — modules in v0.2 will attach as child elements, so leave room for them.

##### T-2C.2 — Event log → visual schedule (parallel after T-2C.1)
- **Status:** done
- **Track:** render
- **Depends on:** T-2C.1, T-1.3
- **Inputs:** chassis components, `CombatEvent` type
- **Outputs:**
  - `src/render/playback.ts` — converts a `CombatEvent[]` into a timed schedule, parameterized by playback speed (0.5× / 1× / 2× / 10×).
  - `src/render/CombatScene/CombatScene.tsx` — React component that takes a `CombatEvent[]` prop (and a speed prop) and replays it visually. Owns the 3×3 + 3×3 unit layout, HP bars, damage popups, destroyed-unit fade.
  - `src/render/CombatScene/index.ts` — the **single public entry point** of the render layer. T-0.4's lint rule should already restrict ui→render imports to this file.
  - CSS keyframes for: HP bar shrink, damage number popup, unit destroyed fade.
  - A hand-written `CombatEvent[]` fixture under `src/render/CombatScene/__fixtures__/sample.ts` for development against (no dependency on the resolver).
  - A debug page (`src/render/CombatScene/_DebugScene.tsx`, dev-only) that plays the sample fixture.
- **Acceptance:** Loading the debug page in `pnpm dev` plays the sample fixture visually at the selected speed. Pause and step controls work. The component does not import anything from `src/logic/combat/resolver.ts` (it only consumes the event-log type).
- **Notes:** Develop this against the hand-written fixture **before** T-2A.3 lands. Once T-2A.4 exists, you can sanity-check your fixture's shape against `pnpm run:fixture`.

### M3 — Integration (sequential)

#### T-3.1 — Wire logic → ui → render
- **Status:** done
- **Track:** integration
- **Depends on:** T-2A.3, T-2A.4, T-2B.2, T-2C.2
- **Inputs:** real logic API, ui shell, render scene
- **Outputs:**
  - `CombatScreen` calls `createCombat(...)` from the walking-skeleton fixture, then steps `resolveRound` until `isCombatOver` returns a winner, accumulating the event log.
  - The accumulated event log is passed to `<CombatScene events={...} speed={...} />`.
  - Play / pause / step controls in `CombatScreen` drive the `CombatScene` playback.
- **Acceptance:** `pnpm dev` → click "Start Combat" → the walking-skeleton fight plays to completion in the browser. Pause/step/speed all work.
- **Notes:** First time end-to-end. Expect minor contract drift between the three tracks. Fix at the contract layer (M1 files) — never patch around the boundary.

#### T-3.2 — Walking-skeleton smoke test + docs
- **Status:** todo
- **Track:** integration
- **Depends on:** T-3.1
- **Inputs:** full pipeline
- **Outputs:**
  - `tests/integration/walking-skeleton.test.ts` (jsdom): renders `<App />`, clicks "Start Combat", advances time / flushes effects, asserts the combat ends with a winner and that the event log contains at least one `combat_ended` event.
  - `README.md` updated with a "Walking skeleton" section explaining how to run it (`pnpm dev`, click Start) and how to run the tests.
- **Acceptance:** `pnpm test` (which now covers logic + ui + integration) passes locally. `README.md` reflects reality. A manual browser check is documented as a checklist item in the PR description (per `CLAUDE.md` UI verification — automated tests verify code correctness, browser check verifies feature correctness).
- **Notes:** This is the v0.1 done bar. When this lands, the walking skeleton ships and we open v0.2.

---

## v0.2 and beyond

Sketch only — to be fleshed out into milestones and tasks **after v0.1 lands**, when we know what the architecture actually feels like and which bets paid off.

Likely v0.2+ themes (no commitment, no order). Scope locked per the v1 decisions in `open-questions.md`:

- **CI.** Minimal GitHub Actions workflow (install + lint + test + build) gating every PR. Deferred from v0.1 per Q-V0.1-5 — add early in v0.2.
- **Content data + Zod loaders.** Move classes / units / enemies out of `fixtures.ts` into `src/content/*.json` files validated by Zod schemas. Adds the loader code in `src/logic/content/`.
- **Chassis roster expansion to 5 classes.** Add Lawnbot (tank) and Security-drone (ranged/flyer) to the walking-skeleton trio, per Q-S2. Kitchen-arm and other archetypes are deferred post-v1.
- **Vocabulary expansion.** Add the rest of the conditions and actions from `gameplay.md` §7 (`target.distance`, `ally.count`, `target.has_status`, `repair`, `advance`, `retreat`, `swap_with`, `use_ability`).
- **Modules.** Buff modules and action modules per `gameplay.md` §6. Adds the loot economy.
- **Cooldowns.** Per `gameplay.md` §6. Most actions become cooldown-gated.
- **Reach rules.** Front/middle/back row reach for melee/ranged actions per `gameplay.md` §3.
- **Run map + node progression.** **One act × 10–12 nodes** (per Q-G1) set in the Assembly Floor zone — combat / elite / repair-bay / boss. QA and Showroom zones are deferred post-v1.
- **Reward selection screen.** Pick from 3 upgrade options drawn from **5 reward categories** per Q-G2: new module, new unit, heal, +1 rule slot, vocabulary unlock.
- **Enemy gambits via same interpreter.** Enemies use `GambitList`s like players per Q-G3 — no parallel AI system.
- **Gambit editor UI.** The most important UI surface (`gameplay.md` §7) — list-based, drag-to-reorder. Starts units with **4 rule slots** per Q-G5.
- **Repair Bay node.** Fixed-% heal-all (start at 50%) per Q-G6.
- **Flavor text between nodes.** Short one-line terminal snippets per Q-S5.
- **Status effects.** Damage red / repair green / status yellow per `setting.md` §4.

These will be re-prioritized after v0.1 ships and the team has a feel for how the layers actually compose.
