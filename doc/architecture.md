# Architecture Spec

This is the technical source of truth: stack, layering, folder layout, key interfaces, and testing strategy. Anything marked **[Proposal]** is current best-guess; anything marked **[TBD]** is unresolved and tracked in `open-questions.md`.

## 1. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Package manager | **pnpm** | Fast, disk-efficient, strict by default. |
| Build tool | **Vite** | Dev server, bundling, asset handling. |
| Language | **TypeScript** | Strict mode. The gambit interpreter especially benefits from types. |
| UI framework | **React** | Used for all menus, the gambit editor, the map screen, inventory, and the combat scene's DOM tree. |
| Combat rendering | **DOM + SVG + CSS** | Units composed from DOM and SVG primitives (divs for rectangles, SVG for curves/masks), animated with CSS transitions/transforms/keyframes. Compositional so modules and attachments can be added as runtime child elements — see `setting.md` §4. Same React tree as the rest of the UI. **No Canvas/WebGL in v1.** |
| Tests | **Vitest** | Vite-native, jest-compatible. |
| Schema validation | **Zod** | For loading content data (classes, modules, enemies) from JSON safely. Added when content loaders land. |

### Explicitly not in the stack

- **No game framework** (no Phaser, no Babylon, no Three). Phaser would fight the React/Vite structure and bring its own scene/state/loop.
- **No Canvas/WebGL renderer in v1.** PixiJS is the planned escape hatch *only if* combat visuals later demand effects DOM/SVG/CSS cannot deliver. Default answer is "do it in DOM/SVG/CSS."
- **No state management library.** No Redux, Zustand, XState. The game state is a plain object; React state plus a small subscribe pattern is enough.
- **No ECS library.** Bytewars has at most 18 units on a slot grid — ECS is overkill.
- **No physics engine.** None needed.

## 2. Three-layer architecture

The codebase is split into **three strictly separated layers**. The separation is enforced socially (and ideally by lint rules / import boundaries) — *the goal is that the logic layer can be unit-tested in a Node process with no DOM, no React, and no rendering code in scope.*

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

### Why this split

- **The gambit interpreter is the heart of the game.** It must be testable in isolation. Coupling it to React or DOM APIs would be painful.
- **Determinism is enforceable** — same seed + same gambits + same content = identical fight, every time. This is huge for debugging player-authored gambits, for replays, and for daily-seed challenges if we ever add them.
- **The rendering layer is swappable.** Start with DOM+CSS; add PixiJS later for combat juice without touching rules code.
- **The logic layer is headless-runnable**, which means we can write tests like "given these gambits and this enemy comp, after 10 rounds the player should win in N events" — and run them in CI without any browser.

### Strict rules

- Logic layer **never** imports React, DOM APIs, browser globals, or anything from `ui/` or `render/`.
- Logic layer **never** mutates state in place from outside. State updates go through the public API (`src/logic/index.ts`) which returns new state.
- RNG lives **only** in the logic layer and is **always seeded explicitly**. No `Math.random()` anywhere in `src/logic/`.
- The UI layer reads game state and dispatches intents (`commitGambits`, `startCombat`, `pickReward`, etc.). It does not contain rules.
- The rendering layer reads the turn event log and renders it. It does not compute combat outcomes itself.

## 3. The turn event log

The interface between the logic layer and the rendering layer is a single data structure: an **append-only log of events** describing what happened during a combat round.

**[Proposal]** Each event is a discriminated union:

```ts
type CombatEvent =
  | { kind: 'round_started'; round: number }
  | { kind: 'turn_started'; unitId: UnitId }
  | { kind: 'rule_fired'; unitId: UnitId; ruleIndex: number }
  | { kind: 'action_used'; unitId: UnitId; action: ActionRef; targets: UnitId[] }
  | { kind: 'damage_dealt'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_repaired'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_destroyed'; unitId: UnitId }
  | { kind: 'status_applied'; targetId: UnitId; status: StatusRef; duration: number }
  | { kind: 'unit_moved'; unitId: UnitId; from: SlotRef; to: SlotRef }
  | { kind: 'turn_ended'; unitId: UnitId }
  | { kind: 'round_ended'; round: number }
  | { kind: 'combat_ended'; winner: 'player' | 'enemy' };
```

The renderer plays the log back at the player's chosen speed, with each event mapped to a visual change (HP bar tween, damage number, sprite shake, slot swap, etc.).

This shape is also what tests assert against — "after running combat C with seed S, the resulting event log contains X."

## 4. Gambit interpreter

The gambit interpreter is a small, deterministic VM that, given a unit and a battlefield snapshot, returns the action that unit will take this turn.

**[Proposal]** Approximate shape:

```ts
type Condition =
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_hp_below'; target: TargetSelector; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }
  | { kind: 'cooldown_ready'; action: ActionRef }
  | { kind: 'self_in_row'; row: Row }
  | { kind: 'always' }
  // ... extensible

type Action =
  | { kind: 'attack'; target: TargetSelector }
  | { kind: 'use_ability'; ability: AbilityRef; target: TargetSelector }
  | { kind: 'repair'; target: TargetSelector }
  | { kind: 'advance' }
  | { kind: 'retreat' }
  | { kind: 'swap_with'; target: TargetSelector }
  | { kind: 'idle' }

type Rule = { condition: Condition; action: Action }
type GambitList = Rule[]   // ordered, top to bottom

function chooseAction(unit: Unit, battlefield: Battlefield): Action {
  for (const rule of unit.gambits) {
    if (evaluate(rule.condition, unit, battlefield)) {
      return rule.action
    }
  }
  return { kind: 'idle' }
}
```

The vocabulary will grow. The shape will not.

## 5. Folder layout — [Proposal]

```
bytewars/
├── doc/                          # this folder
├── public/                       # static assets served as-is
├── src/
│   ├── logic/                    # LAYER 1 — pure TS, no React/DOM
│   │   ├── state/                # run state, combat state, types
│   │   ├── gambits/              # interpreter, condition/action types
│   │   ├── combat/               # turn resolver, event log emitter
│   │   ├── map/                  # run map, node progression
│   │   ├── content/              # loaders for class/module/enemy data
│   │   ├── rng.ts                # seeded RNG (mulberry32 or similar)
│   │   └── index.ts              # public API surface
│   ├── ui/                       # LAYER 2 — React
│   │   ├── App.tsx
│   │   ├── screens/
│   │   │   ├── MainMenu/
│   │   │   ├── RunMap/
│   │   │   ├── Combat/           # the React tree for the combat scene
│   │   │   ├── GambitEditor/
│   │   │   ├── Inventory/
│   │   │   └── RunSummary/
│   │   ├── components/           # shared widgets (buttons, modals, lists)
│   │   ├── hooks/                # useGameState, useCombatPlayback, ...
│   │   └── state.ts              # subscribe-bridge to logic layer
│   ├── render/                   # LAYER 3 — DOM+CSS combat playback
│   │   ├── CombatScene/          # plays back the turn event log
│   │   ├── animations/           # CSS keyframes, helpers
│   │   └── playback.ts           # event-log → visual schedule
│   ├── content/                  # JSON content data (classes, modules, ...)
│   │   └── schema/               # Zod schemas for content validation
│   ├── styles/                   # global CSS
│   └── main.tsx                  # Vite entry
├── tests/
│   └── logic/                    # headless tests of the logic layer
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
```

Notes:

- `src/render/` lives alongside `src/ui/` rather than under it. The combat scene's React component lives in `src/ui/screens/Combat/`, but everything specific to *playing back the turn event log* (timing, animation orchestration) lives in `src/render/`. The split keeps "combat UI shell" separate from "combat visuals."
- `src/content/` (the JSON data) is separate from `src/logic/content/` (the loaders). Data is data; loaders are code.
- Tests for the logic layer live in a top-level `tests/` folder so they can be run headlessly without dragging in JSX/CSS.

## 6. State management

- The game state is a single plain TypeScript object (run state, current combat state if any, inventory, map position, etc.).
- The logic layer exposes pure functions that take state + an intent and return new state plus an event log (when applicable).
- The UI layer subscribes to state changes via a tiny custom store (or `useSyncExternalStore`). React components re-render when their slice changes.
- No Redux, no Zustand, no XState. If we ever outgrow this, we revisit — but the slot-grid scope makes it very unlikely.

## 7. Content data

Classes, modules, enemies, and encounters are **data, not code**. They live as JSON files in `src/content/` and are loaded at startup, validated by Zod schemas in `src/content/schema/`.

This means a designer (or future-you) can add a new module by editing a JSON file, not by touching the interpreter.

Validation is loud: a malformed content file fails fast at load time with a useful error.

## 8. RNG and determinism

- A run is seeded with a single seed at start.
- All randomness — map generation, encounter selection, reward rolls, combat damage variance, gambit tie-breaking — pulls from a seeded PRNG (**[Proposal]** mulberry32, or similar).
- The same seed + the same player gambits + the same content = identical run, every time.
- This is enforced by *never* using `Math.random()` in the logic layer. A lint rule should ban it.
- Consequence: replays, daily seeds, debugging, and reproducible test cases all become trivial.

## 9. Testing strategy

The logic layer carries the test weight. Specifically:

- **Gambit interpreter unit tests** — every condition and action type, plus full priority-list resolution under varied battlefield states. This is the most-tested part of the codebase.
- **Combat resolver tests** — given a fixed enemy comp, fixed gambits, and a fixed seed, assert the resulting event log. These are golden tests for combat correctness.
- **Run progression tests** — map generation, reward rolls, node selection, run-state transitions.
- **Content validation tests** — every content file loads cleanly under its Zod schema.

UI tests are deliberately lighter:
- Component-level tests for the gambit editor (the most important UI surface).
- Smoke tests for the main screens.
- No exhaustive snapshot testing.

Tests run with Vitest in a Node environment for the logic layer, and jsdom for the UI layer.

## 10. What's deferred

Tracked in `roadmap.md` under "explicitly out of scope for v1":

- **PixiJS / Canvas rendering.** Only added if and when combat juice demands it.
- **Audio system.** Howler.js when the time comes; v1 ships with at most basic UI sounds.
- **Save / resume of in-progress runs.** Reasonable to add but not required for v1.
- **Asset pipeline.** No texture packing or sprite atlas tooling until we have real art.
- **i18n.** English-only for v1.
- **Accessibility audit.** Some basics (keyboard navigation in the gambit editor, color choices) should be considered from the start, but a formal pass is deferred.
