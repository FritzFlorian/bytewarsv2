# Architecture Spec

This is the technical source of truth: stack, layering, folder layout, key interfaces, and testing strategy. Anything marked **[Proposal]** is current best-guess; anything marked **[TBD]** is unresolved and tracked in `open-questions.md`.

## 0. Quick Start for Development

**Three things to know before writing any code:**

1. **Three strictly separated layers** — `src/logic/`, `src/ui/`, `src/render/`. Logic is pure TS (no React, no DOM). Render is read-only playback of the event log. UI owns screens and wires them together. See §2 for the rules.

2. **Key entry points:**
   - `src/logic/index.ts` — the only file UI/render should import from the logic layer. Contains `createCombat`, `resolveRound`, `isCombatOver`, and all shared types.
   - `src/render/CombatScene/index.ts` — the only file UI should import from the render layer. Exports `<CombatScene events={...} speed={...} />`.
   - `src/ui/App.tsx` — the React root. All screen routing lives here.

3. **Before touching anything**, run `pnpm check` to confirm you are starting from green. After finishing, run it again — per `CLAUDE.md`, every task must leave `pnpm check` passing.

**What is currently built (v0.1–v0.3):**
- Logic layer: types, RNG, gambit interpreter, combat resolver, walking-skeleton fixture. Public API is fully implemented.
- Render layer: three chassis components (Vacuum, Butler, QaRig), `CombatScene` with HP bars / damage popups / destroyed-unit fade / active-unit highlight / target indicator / idle visual, `playback.ts` schedule converter, scrolling combat log panel.
- UI layer: `App.tsx`, `useGameState` hook, subscribe bridge, `CombatScreen` with play/pause/step/speed controls. `GambitEditorScreen` with per-unit tabs, searchable condition/action dropdowns, drag-to-reorder slots.
- Audio layer (`src/audio/`): Web Audio API engine, synthesized sounds for attack / damage / destroy, looping background beat, win/lose stingers, wired to combat playback.

**What is not built yet (v0.4+):**
- Run map + node progression
- Player squad JSON loader
- Boss chassis (Overseer)
- Game-over / victory screens
- Rewards, modules, content loaders, additional chassis

---

## 1. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Package manager | **pnpm** | Fast, disk-efficient, strict by default. |
| Build tool | **Vite** | Dev server, bundling, asset handling. |
| Language | **TypeScript** | Strict mode. The gambit interpreter especially benefits from types. |
| UI framework | **React** | Used for all menus, the gambit editor, the map screen, inventory, and the combat scene's DOM tree. |
| Combat rendering | **DOM + SVG + CSS** | Units composed from DOM and SVG primitives, animated with CSS transitions/transforms/keyframes. Compositional so modules and attachments can be added as runtime child elements. Same React tree as the rest of the UI. **No Canvas/WebGL in v1.** |
| Tests | **Vitest** | Vite-native, jest-compatible. Logic tests run in Node env; UI tests use jsdom (per-file `@vitest-environment jsdom` directive). |
| E2E tests | **Playwright** | Headless Chromium. `pnpm e2e` auto-starts the dev server. |
| Schema validation | **Zod** | For loading content data from JSON safely. Added when content loaders land in v0.3+. |

### Explicitly not in the stack

- **No game framework** (no Phaser, no Babylon, no Three). Phaser would fight the React/Vite structure and bring its own scene/state/loop.
- **No Canvas/WebGL renderer in v1.** PixiJS is the escape hatch only if combat visuals later demand effects DOM/SVG/CSS cannot deliver.
- **No state management library.** No Redux, Zustand, XState. Plain object + `useSyncExternalStore`.
- **No ECS library.** Bytewars has at most 18 units on a slot grid — ECS is overkill.
- **No physics engine.** None needed.

## 2. Three-layer architecture

The codebase is split into **three strictly separated layers**. Separation is enforced by ESLint import boundary rules (`pnpm lint`). *The logic layer can be unit-tested in a Node process with no DOM, no React, and no rendering code in scope.*

```
+-------------------------------------------------------------+
|                          UI LAYER                           |
|     React components: menus, gambit editor, map screen,     |
|     inventory, run summary. Reads from game state, sends    |
|     player intents into the logic layer.                    |
+-------------------------------------------------------------+
                              ^
                              |  state object + intents
                              v
+-------------------------------------------------------------+
|                  GAME LOGIC / STATE LAYER                   |
|     Pure TypeScript. Zero framework dependencies.           |
|     Houses: gambit interpreter, combat resolver, RNG,       |
|     run state, map progression. Produces the turn event    |
|     log that the rendering layer plays back.                |
+-------------------------------------------------------------+
                              ^
                              |  turn event log
                              v
+-------------------------------------------------------------+
|                      RENDERING LAYER                        |
|     React components + plain DOM/CSS. Subscribes to the     |
|     turn event log emitted by the logic layer and plays it  |
|     back as visuals at the player's chosen speed.           |
+-------------------------------------------------------------+
```

### Strict rules

- Logic layer **never** imports React, DOM APIs, browser globals, or anything from `ui/` or `render/`.
- Logic layer **never** calls `Math.random()` — all randomness goes through the seeded RNG (banned by lint).
- Logic layer **never** mutates state in place. Public API functions return new state.
- UI layer reads game state and dispatches intents. It does not contain rules or combat logic.
- Render layer reads the turn event log and renders it. It does not compute outcomes.
- UI layer **only** imports from `src/render/CombatScene/index.ts` — never from render internals.

## 3. The turn event log

The interface between the logic layer and the rendering layer is an **append-only log of typed events**.

Current v0.1 implementation (`src/logic/combat/events.ts`):

```ts
type CombatEvent =
  | { kind: 'round_started'; round: number }
  | { kind: 'turn_started'; unitId: UnitId }
  | { kind: 'rule_fired'; unitId: UnitId; ruleIndex: number }
  | { kind: 'action_used'; unitId: UnitId; action: Action; targets: UnitId[] }
  | { kind: 'damage_dealt'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_destroyed'; unitId: UnitId }
  | { kind: 'turn_ended'; unitId: UnitId }
  | { kind: 'round_ended'; round: number }
  | { kind: 'combat_ended'; winner: 'player' | 'enemy' }
```

Future events (v0.3+, not yet implemented): `unit_repaired`, `status_applied`, `unit_moved`.

The renderer plays the log back at the player's chosen speed, mapping each event to a visual change. Tests assert against this log — "given gambits G and seed S, the event log matches snapshot X."

## 4. Gambit interpreter

The gambit interpreter is a small deterministic VM: given a unit and a battlefield snapshot, it returns the action the unit will take this turn (`src/logic/gambits/interpreter.ts`).

**Current v0.1 vocabulary** (fully implemented):

```ts
type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }

type Action =
  | { kind: 'attack'; target: TargetSelector }
  | { kind: 'idle' }

type TargetSelector = 'self' | 'nearest_enemy' | 'any_enemy'

type Rule = { condition: Condition; action: Action }
type GambitList = Rule[]   // ordered, top to bottom
```

**Planned v0.3+ vocabulary additions** (not yet implemented): `target_hp_below`, `cooldown_ready`, `self_in_row`, `ally.count`, `target.distance`, `target.has_status`; actions: `repair`, `advance`, `retreat`, `swap_with`, `use_ability`.

The vocabulary will grow. The shape (discriminated unions, top-to-bottom fallthrough, `idle` default) will not.

## 5. Folder layout

`*` = exists now. Everything else is planned for v0.4+.

```
bytewars/
├── doc/                          # design + architecture docs
├── public/                       # static assets served as-is
├── scripts/                      # * pnpm-mediated scripts (run as Vitest tests)
├── src/
│   ├── logic/                    # LAYER 1 — pure TS, no React/DOM
│   │   ├── state/                # * run/combat state types
│   │   ├── gambits/              # * interpreter, condition/action types
│   │   ├── combat/               # * turn resolver, event log types
│   │   ├── map/                  # (v0.4) RunState, MapGraph, generateMap, applyBattleResult
│   │   ├── content/              # * walking-skeleton fixture; (v0.4) player-squad JSON loader
│   │   ├── rng.ts                # * seeded RNG (mulberry32)
│   │   └── index.ts              # * public API: createCombat, resolveRound, isCombatOver + all types
│   ├── ui/                       # LAYER 2 — React
│   │   ├── App.tsx               # * screen routing
│   │   ├── state.ts              # * subscribe-bridge to logic layer
│   │   ├── screens/
│   │   │   ├── Combat/           # * CombatScreen with play/pause/step/speed controls
│   │   │   ├── GambitEditor/     # * per-unit gambit authoring (v0.2)
│   │   │   ├── RunMap/           # (v0.4) horizontal node-graph map screen
│   │   │   ├── GameOver/         # (v0.4) run-failed screen
│   │   │   ├── Victory/          # (v0.4) boss-beaten screen
│   │   │   ├── Inventory/        # (planned)
│   │   │   └── RunSummary/       # (planned)
│   │   ├── components/           # (planned) shared widgets
│   │   └── hooks/
│   │       └── useGameState.ts   # * React hook for game state + dispatch
│   ├── render/                   # LAYER 3 — DOM+CSS combat playback
│   │   ├── CombatScene/          # * plays back the turn event log; index.ts is the only public entry
│   │   ├── units/                # * Vacuum.tsx, Butler.tsx, QaRig.tsx; (v0.4) Overseer.tsx
│   │   ├── animations/           # (planned) shared CSS keyframe helpers
│   │   └── playback.ts           # * event-log → timed visual schedule
│   ├── audio/                    # * Web Audio API engine + synthesized sounds (v0.3)
│   │   ├── engine.ts             # * lazy AudioContext init, playSound dispatcher
│   │   └── sounds.ts             # * SoundId type + synthesis functions
│   ├── content/                  # (v0.4) JSON content data
│   │   ├── player-squad.json     # (v0.4) editable starting squad definition
│   │   └── schema/               # (v0.4) Zod schemas
│   ├── styles/                   # * global CSS + unit shading rules
│   └── main.tsx                  # * Vite entry
├── tests/
│   ├── logic/                    # * headless logic tests (node env)
│   ├── ui/                       # * UI component tests (jsdom)
│   └── integration/              # * end-to-end pipeline tests (jsdom)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 6. State management

- The game state is a single plain TypeScript object.
- The logic layer exposes pure functions that take state + an intent and return new state plus an event log (when applicable).
- The UI layer subscribes to state changes via `useSyncExternalStore` (`src/ui/state.ts`). React components re-render when their slice changes.
- No Redux, no Zustand, no XState.

## 7. Content data

Classes, modules, enemies, and encounters are **data, not code**. They will live as JSON files in `src/content/` and be loaded at startup, validated by Zod schemas. The player starting squad (`player-squad.json`) lands in v0.4. Full content data (enemy rosters, modules, encounter tables) lands in v0.5+.

## 8. RNG and determinism

- All randomness pulls from a seeded PRNG (`src/logic/rng.ts`, mulberry32).
- `Math.random()` is banned in `src/logic/` by lint rule.
- Same seed + same gambits + same content = identical fight, every time.
- Consequence: tests can assert exact event-log snapshots with pinned seeds.

## 9. Testing strategy

```
pnpm test    # Vitest: logic (node) + ui (jsdom) + integration (jsdom)
pnpm e2e     # Playwright: full browser smoke tests
pnpm check   # both of the above + typecheck
```

**Logic layer** (heaviest coverage):
- Gambit interpreter: every condition and action kind, priority-list fallthrough, idle default.
- Combat resolver: golden tests with pinned seeds asserting exact event-log shapes.

**UI layer** (lighter):
- Component tests for the gambit editor (v0.2).
- Smoke tests for main screens.

**Integration:**
- `tests/integration/walking-skeleton.test.ts` — renders `<App />`, clicks Start Combat, asserts `combat_ended` in the event log.

Logic tests run in Node env. UI and integration tests use jsdom (per-file `// @vitest-environment jsdom` directive).

## 10. What's deferred

- **PixiJS / Canvas rendering.** Only added if combat juice demands effects DOM/SVG/CSS cannot deliver.
- **Audio expansion.** Web Audio synthesis is live (v0.3). Volume/mute controls and music variety are deferred.
- **Save / resume of in-progress runs.** Reasonable to add but not required for v1.
- **i18n.** English-only for v1.
- **Accessibility audit.** Keyboard navigation in the gambit editor and color choices should be considered from the start, but a formal pass is deferred.
- **HUD/CCTV framing layer** (Q-S6). Deferred until combat scene and gambit editor have shipped in plain form.
