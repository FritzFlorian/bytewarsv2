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

**What is currently built (v0.1–v0.7 M4):**
- Logic layer: types (`Chassis` includes the 8 v0.6 chassis), RNG, gambit interpreter with cooldown fall-through, combat resolver with per-attack damage / cooldown tracking / heal actions, `UnitInstance` class with active/passive module instances and computed stats, walking-skeleton + boss + elite fixtures, starter-preset pool + seeded `drawStarterSquad`, recruitment pool (separate from starter pool, same format), chassis + module JSON catalogs (`src/content/chassis/`, `src/content/modules/`), attack content loader (`attacks.json`), map generation, navigation, battle-result progression, reward pool with rarity-weighted module drops + remove-module + heals + new-unit (v0.7 M4). Public API exported from `src/logic/index.ts`.
- Render layer: eight chassis components, `CombatScene` with HP bars / damage popups / destroyed-unit fade / active-unit highlight / target indicator / idle visual / `onComplete` callback, `playback.ts`, scrolling combat log with named attack display.
- UI layer: `App.tsx` with full run state machine (`starter-draft → map → gambit-editor → combat → reward → game-over/victory`), `StarterDraftScreen` (two sequential unit picks with chassis silhouette + module stats), `CombatScreen`, `GambitEditorScreen`, `MapScreen`, `RewardScreen` (module drop install + remove-module two-step picker, v0.7 M4), `GameOverScreen`, `VictoryScreen`.
- Audio layer (`src/audio/`): per-attack synthesized sounds, damage / destroy sounds, looping background beat, win/lose stingers.
- Content layer (`src/content/`): `starter-presets.json`, `recruitment-presets.json`, `attacks.json`, chassis + module JSON files, Zod schemas for all.

**What is not built yet (v0.7 M5+):**
- Gambit editor updates (module panel, action picker from installed modules), balance pass + e2e updates.
- Meta-progression / unlocks

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

**Current vocabulary** (v0.1 conditions, v0.5 actions):

```ts
type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }

// AttackId is the union of all attack ids defined in src/content/attacks.json
// and exported from src/content/schema/attack.ts.
// Current set: 'quick_jab' | 'sweep' | 'taser' | 'overload' | 'clamp' | 'suppression'
type Action =
  | { kind: AttackId; target: TargetSelector }  // one discriminant per named attack
  | { kind: 'idle' }

type TargetSelector = 'self' | 'nearest_enemy' | 'any_enemy'

type Rule = { condition: Condition; action: Action }
type GambitList = Rule[]   // ordered, top to bottom
```

**v0.5–v0.6 model:** Attacks are defined in `src/content/attacks.json`. Each has: `id`, `name`, `damage`, `cooldown`, `initialCooldown`, `chassis[]`. Cooldowns tracked in `CombatState.cooldowns`.

**v0.7 model (design settled, not yet implemented):** Actions come from installed active modules on the `UnitInstance`. Cooldowns live on `ActiveModuleInstance.cooldownRemaining` — no external `CooldownMap`. The interpreter resolves available actions from `unit.getAvailableActions()`. Target selectors expand to include `any_ally` and `weakest_ally` for heal modules. See `gameplay.md` §6.

In both models, the interpreter skips a rule silently if the chosen action is on cooldown, falling through to the next rule. Damage/heal amounts come from the module definition, not hardcoded constants.

**Planned v0.6+ vocabulary additions**: `target_hp_below`, `self_in_row`, `ally.count`, `target.distance`, `target.has_status`; actions: `repair`, `advance`, `retreat`, `swap_with`, `use_ability`.

The vocabulary will grow. The shape (discriminated unions, top-to-bottom fallthrough, `idle` default) will not.

## 5. Folder layout

`*` = exists now (through v0.5). Items marked `(planned)` are v0.6+.

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
│   │   ├── map/                  # * RunState, MapGraph, generateMap, applyBattleResult
│   │   ├── content/              # * walking-skeleton + boss fixtures, starter-preset + attack loaders
│   │   ├── rng.ts                # * seeded RNG (mulberry32)
│   │   └── index.ts              # * public API: createCombat, resolveRound, isCombatOver + all types
│   ├── ui/                       # LAYER 2 — React
│   │   ├── App.tsx               # * screen routing
│   │   ├── state.ts              # * subscribe-bridge to logic layer
│   │   ├── screens/
│   │   │   ├── Combat/           # * CombatScreen with play/pause/step/speed controls
│   │   │   ├── GambitEditor/     # * per-unit gambit authoring (v0.2)
│   │   │   ├── RunMap/           # * horizontal node-graph map screen (v0.4)
│   │   │   ├── GameOver/         # * run-failed screen (v0.4)
│   │   │   ├── Victory/          # * boss-beaten screen (v0.4)
│   │   │   ├── Inventory/        # (planned)
│   │   │   └── RunSummary/       # (planned)
│   │   ├── components/           # (planned) shared widgets
│   │   └── hooks/
│   │       └── useGameState.ts   # * React hook for game state + dispatch
│   ├── render/                   # LAYER 3 — DOM+CSS combat playback
│   │   ├── CombatScene/          # * plays back the turn event log; index.ts is the only public entry
│   │   ├── units/                # * Vacuum.tsx, Butler.tsx, QaRig.tsx, Overseer.tsx (v0.4)
│   │   ├── animations/           # (planned) shared CSS keyframe helpers
│   │   └── playback.ts           # * event-log → timed visual schedule
│   ├── audio/                    # * Web Audio API engine + synthesized sounds (v0.3)
│   │   ├── engine.ts             # * lazy AudioContext init, playSound dispatcher
│   │   └── sounds.ts             # * SoundId type + synthesis functions
│   ├── content/                  # * JSON content data
│   │   ├── chassis/              # (v0.7) one JSON per chassis (baseHp, slots, etc.)
│   │   ├── modules/              # (v0.7) one JSON per module (active or passive)
│   │   ├── starter-presets.json  # * pool of starter unit presets drawn at run start (v0.6)
│   │   ├── attacks.json          # * attack definitions — replaced by modules/ in v0.7
│   │   └── schema/               # * Zod schemas (starterPreset.ts, attack.ts, + v0.7 chassis/module)
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

Classes, enemies, encounters, and (later) modules are **data, not code**. They live as JSON files in `src/content/` and are loaded at startup, validated by Zod schemas.

Currently shipped:
- `src/content/starter-presets.json` + `schema/starterPreset.ts` — pool of starter unit presets (v0.6). A new run draws 2 via seeded `drawStarterSquad(rng, n)`; the same pool feeds the "new unit" reward.
- `src/content/attacks.json` + `schema/attack.ts` — attack definitions with per-chassis whitelists (v0.5). **Replaced in v0.7** by the module system (see below).

**v0.7 content layout (design settled, not yet implemented):**
- `src/content/chassis/<id>.json` — one file per chassis (baseHp, baseRuleSlots, activeSlots, passiveSlots).
- `src/content/modules/<id>.json` — one file per module (active or passive, discriminated by `type`). Active modules use a union on `actionKind` with per-kind nested properties. See `gameplay.md` §6 for full schema.
- `src/content/starter-presets.json` — updated to reference module IDs instead of chassis-fixed attacks.

Still in code, not JSON (migration candidates): enemy-squad fixtures (`src/logic/content/fixtures.ts`).

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
