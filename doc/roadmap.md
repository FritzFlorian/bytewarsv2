# Roadmap

This file is the **execution plan** for Bytewars. The other docs say *what* the game is; this one says *what we build next, in what order, and when we know it's done.*

It is a living document. Update task status as work progresses. If a task changes a decision the docs record, update the docs in the same PR — per `CLAUDE.md`, code and docs must not drift.

## How to read this file

- Work is grouped into **versions** (v0.1, v0.2, …). A version ships when all its milestones are done.
- Each version contains **milestones** (M1, M2, …). Milestones within a version run in **sequence** unless noted otherwise.
- Each milestone contains **tasks**. Tasks marked **(parallel)** can be picked up independently at the same time.
- Each task has: **status**, **track**, **depends on**, **inputs**, **outputs**, **acceptance**, and optional **notes**.
- **Status** values: `todo` · `in-progress` · `blocked` · `done`.
- **Track** values: `foundation` · `logic` · `ui` · `render` · `integration`.

---

## v0.1 — Walking Skeleton (done)

v0.1 established the three-layer architecture (logic / ui / render), proved the end-to-end pipeline (gambits → resolver → event log → DOM playback), and shipped a hardcoded 2v2 fight visible in the browser. All tasks are done.

---

## v0.2 — Gambit Editor + Visual Combat Feedback (done)

v0.2 shipped a per-unit gambit editor (searchable dropdowns, drag-to-reorder, unit tabs) wired to the combat resolver, plus combat visual feedback (active unit highlight, target indicator projectile, idle state visual, scrolling combat log). The one-shot flow editor → fight shipped; no map or rewards. All tasks done, `pnpm check` passes.

---

## v0.3 — Audio (done)

v0.3 added a Web Audio API synthesis layer (`src/audio/`): synthesized sounds for attack, damage, and destroy events; a looping background beat during combat; win/lose stingers at fight end. No audio asset files. Audio is wired to combat playback from `CombatScreen` — the render layer stays audio-free. All tasks done, `pnpm check` passes.

---

## v0.4 — Map + Multi-Battle Run

**Goal.** The player fights a full run: a seeded, branching horizontal map of 10–12 nodes leading to a boss. Squad HP carries between fights. Losing wipes the run; beating the boss wins it. Gambits are editable before every fight.

**Scope.** Node types: Combat and Boss only (no Elite, no Repair Bay). No reward selection screen. No meta-progression. One new chassis (Overseer boss). Player starting squad loaded from an editable JSON file. Dead units sit out one fight and return at 42% HP.

**Done bar.** All milestones done. `pnpm check` passes. A human can boot `pnpm dev`, load a starting squad from JSON, navigate a branching map, fight multiple combats, edit gambits between each, and either beat the boss (victory screen) or wipe (game-over screen).

### M1 — Foundation (parallel)

All four tasks in M1 are **(parallel)** — they have no inter-dependencies.

#### T-4.1 — Player squad JSON schema + loader
- **Status:** todo
- **Track:** foundation
- **Depends on:** v0.3 done
- **Inputs:** `src/logic/gambits/types.ts`, `src/logic/content/fixtures.ts` (existing player fixture)
- **Outputs:**
  - `src/content/player-squad.json` — editable file defining the player's starting units: chassis, name, grid slot (row 0–2, col 0–2), and starting gambit list. Supports 1–9 units.
  - `src/content/schema/playerSquad.ts` — Zod schema validating the JSON. Fails loudly on malformed input.
  - Loader function in `src/logic/content/` that reads + validates the JSON and returns typed `Unit[]`. Replaces the hardcoded player units in the walking-skeleton fixture.
- **Acceptance:** Editing a unit's chassis or gambits in `player-squad.json` and running `pnpm dev` produces a different starting squad. Invalid JSON (bad chassis name, missing field) throws a descriptive Zod error at startup. `pnpm check` passes.

#### T-4.2 — Run state types + map generation
- **Status:** todo
- **Track:** logic
- **Depends on:** v0.3 done
- **Inputs:** `src/logic/rng.ts`, `src/logic/state/`
- **Outputs:**
  - `src/logic/map/types.ts` — `NodeType` (`'combat' | 'boss'`), `MapNode` (id, type, column, lane), `MapEdge` (from → to), `MapGraph` (nodes + edges), `RunState` (graph, current node id, unit HP snapshot keyed by unit id, sitting-out set of unit ids, `status: 'active' | 'won' | 'lost'`).
  - `src/logic/map/generate.ts` — `generateMap(rng: Rng): MapGraph`. Produces 10–12 columns; 1–3 nodes per column (max 3 lanes); last column is always a single Boss node; edges are generated so every node is reachable and every non-boss node has at least one forward edge.
  - `src/logic/map/navigation.ts` — `getReachableNodes(run: RunState): MapNode[]`, `selectNode(run: RunState, nodeId: string): RunState`.
  - Tests in `tests/logic/map.test.ts` asserting: map always has exactly one boss at the end; every non-boss node has at least one outgoing edge; no node has more than 3 lanes per column; `selectNode` rejects unreachable nodes.
- **Acceptance:** Tests pass. `pnpm check` passes.

#### T-4.4 — Overseer boss chassis + fixture
- **Status:** todo
- **Track:** render + logic
- **Depends on:** v0.3 done
- **Inputs:** `src/render/units/` (Vacuum, Butler, QaRig for reference), `src/logic/content/fixtures.ts`
- **Outputs:**
  - `src/render/units/Overseer.tsx` — a visually distinctive boss chassis: larger footprint than the standard units, heavy industrial silhouette (think factory floor manager — wide base, articulated arms, sensor cluster on top). Uses the same DOM/SVG/CSS approach as existing chassis.
  - Boss enemy fixture in `src/logic/content/fixtures.ts`: 2–3 Overseer units, 120 HP each, gambit list that uses all v0.1 vocabulary in an aggressive priority order (`target_exists → attack nearest_enemy`, fallthrough to `always → attack any_enemy`).
- **Acceptance:** `pnpm dev`, navigate to a debug page or force the boss encounter — Overseer renders without errors, is visually larger/heavier than QaRig, and silhouette-tests (distinct in solid black) against all existing chassis.

#### T-4.6 — GameOver + Victory screens
- **Status:** todo
- **Track:** ui
- **Depends on:** v0.3 done
- **Inputs:** `src/ui/App.tsx`
- **Outputs:**
  - `src/ui/screens/GameOverScreen.tsx` + CSS module — shows "Run failed", the round the run ended, and a "Try Again" button that resets to a fresh run.
  - `src/ui/screens/VictoryScreen.tsx` + CSS module — shows "Boss defeated", and a "Try Again" button.
- **Acceptance:** Both screens render without errors. "Try Again" navigates back to the start of a new run. `pnpm check` passes.

### M2 — Logic completion + Map UI (parallel)

M2 begins after T-4.2 is done. T-4.3 and T-4.5 are **(parallel)**.

#### T-4.3 — applyBattleResult (HP carry-over + revival rule)
- **Status:** todo
- **Track:** logic
- **Depends on:** T-4.2
- **Inputs:** `src/logic/map/types.ts`, combat result (winner + per-unit surviving HP from `combat_ended` event chain)
- **Outputs:**
  - `src/logic/map/progression.ts` — `applyBattleResult(run: RunState, result: BattleResult): RunState`. Logic:
    1. Update HP snapshot for all surviving units.
    2. Move newly-dead units into the sitting-out set.
    3. Promote units that were already in sitting-out (i.e., sat out this fight) back to active at 42% of their max HP.
    4. If `result.winner === 'enemy'` → set `run.status = 'lost'`.
    5. If current node was the Boss and `result.winner === 'player'` → set `run.status = 'won'`.
  - `BattleResult` type exported from `src/logic/map/types.ts`.
  - Tests in `tests/logic/progression.test.ts`: unit that dies in fight N is absent fight N+1, returns at 42% fight N+2; survivor HP carries correctly; boss win sets status `'won'`; full wipe sets status `'lost'`.
- **Acceptance:** Tests pass. `pnpm check` passes.

#### T-4.5 — MapScreen UI
- **Status:** todo
- **Track:** ui
- **Depends on:** T-4.2
- **Inputs:** `src/logic/map/types.ts`, `src/logic/map/navigation.ts`, `src/ui/App.tsx`
- **Outputs:**
  - `src/ui/screens/RunMap/MapScreen.tsx` + CSS module. Renders the map as a horizontal node graph:
    - Columns left-to-right representing progression depth.
    - Up to 3 nodes per column arranged in up to 3 vertical lanes.
    - SVG or CSS lines connecting each node to its forward edges.
    - Current node highlighted (distinct border/color).
    - Reachable next nodes are clickable buttons; already-visited and unreachable nodes are dimmed.
    - Node icons: combat (⚙) vs boss (★) or equivalent simple visual distinction.
    - A squad status strip below or beside the map showing each unit's name, chassis, and current HP %.
  - No external graph library — plain HTML/CSS/SVG only.
- **Acceptance:** Map renders for a generated `MapGraph`. Clicking a reachable node calls `selectNode` and updates the highlighted position. Non-reachable nodes are not clickable. `pnpm check` passes.

### M3 — Run flow integration

M3 begins after T-4.1, T-4.3, T-4.5, and T-4.6 are all done.

#### T-4.7 — Wire full run flow in App.tsx
- **Status:** todo
- **Track:** integration
- **Depends on:** T-4.1, T-4.3, T-4.5, T-4.6
- **Inputs:** All outputs from T-4.1 through T-4.6, `src/ui/App.tsx`, `src/ui/screens/GambitEditor/`, `src/ui/screens/Combat/CombatScreen.tsx`
- **Outputs:**
  - `App.tsx` updated with a run-scoped state machine: `'start' | 'map' | 'gambit-editor' | 'combat' | 'game-over' | 'victory'`.
  - Start: load player squad from JSON, generate seeded map (`generateMap`), transition to `'map'`.
  - Map → node selected → transition to `'gambit-editor'` (pre-loaded with current squad gambits and HP).
  - Gambit editor "Run" → resolve combat → transition to `'combat'`.
  - Combat ends → call `applyBattleResult` → if `status === 'lost'` go to `'game-over'`; if `status === 'won'` go to `'victory'`; otherwise go back to `'map'`.
  - Game Over / Victory "Try Again" → fresh run (new seed, reload squad JSON).
  - `useGameState` hook extended (or a new `useRunState` hook) to hold `RunState` alongside combat state.
- **Acceptance:** Full run playable end-to-end in `pnpm dev`: start → map → editor → combat (×N) → boss fight → victory or wipe → game over. HP correctly carries between fights. Dead unit missing from the next fight's editor, returning the fight after at 42%. `pnpm check` passes.

---

## v0.5 and beyond

To be planned after v0.4 ships. Likely themes: reward selection screen, vocabulary expansion, modules, cooldowns, reach rules, additional chassis (Lawnbot, Security-drone), Repair Bay node, Elite node type, flavor text between nodes, status effects, meta-progression.
