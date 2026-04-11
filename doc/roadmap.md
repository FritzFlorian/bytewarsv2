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

## v0.4 — Map + Multi-Battle Run (done)

v0.4 shipped the full run loop: player squad loaded from editable `src/content/player-squad.json` (Zod-validated), seeded branching map (horizontal SVG graph, max 3 lanes, 10–12 combat + boss nodes), HP carry-over between fights (dead units sit out one fight and return at 42%), Overseer boss chassis, game-over and victory screens, and the complete `map → gambit-editor → combat → result` state machine in App.tsx. All tasks done, `pnpm check` passes.

---

## v0.5 — Named Attacks, Cooldowns, and Per-Attack Sound

**Goal.** Replace the single generic `attack` action with a roster of named attacks. Each attack has distinct damage, cooldown, and synthesized sound. Available attacks are chassis-specific. The gambit editor only shows attacks valid for the selected unit. Higher-damage attacks have longer cooldowns; some have an initial warmup before they're usable.

**Scope.** 6 attacks across 4 chassis (see T-5.1). Cooldowns tracked in combat state; the interpreter falls through a rule silently if the attack is on cooldown. No new conditions or target selectors. No modules or reach rules.

**Done bar.** All milestones done. `pnpm check` passes. A fight shows distinct named attacks, each with its own sound and damage value. Cooldowns visibly gate reuse. The gambit editor only offers attacks valid for the selected chassis.

### Attack roster

| ID | Chassis | Damage | Cooldown | Initial cooldown |
|---|---|---|---|---|
| `quick_jab` | Vacuum | 8 | 0 | 0 |
| `sweep` | Vacuum | 18 | 2 | 0 |
| `taser` | Butler | 7 | 0 | 0 |
| `overload` | Butler | 30 | 3 | 1 |
| `clamp` | QA-Rig | 15 | 1 | 0 |
| `suppression` | Overseer | 20 | 1 | 0 |

### M1 — Foundation

#### T-5.1 — Attack content JSON + Zod schema + loader
- **Status:** todo
- **Track:** foundation
- **Depends on:** v0.4 done
- **Inputs:** `src/content/schema/` (existing pattern from playerSquad), `src/logic/content/`
- **Outputs:**
  - `src/content/attacks.json` — array of attack definitions, one entry per attack in the roster table above. Each entry: `id`, `name`, `damage`, `cooldown` (rounds after use before available again), `initialCooldown` (rounds unavailable at battle start), `sound` (matches `id`), `chassis` (array of chassis strings that can use it).
  - `src/content/schema/attack.ts` — Zod schema. Exports `AttackDef` type and `AttackId` (z.enum of all attack id strings, e.g. `z.enum(['quick_jab', 'sweep', ...])`).
  - `src/logic/content/attackLoader.ts` — loads and Zod-validates `attacks.json` at startup. Exports: `getAllAttacks(): AttackDef[]`, `getAttackDef(id: AttackId): AttackDef`, `getAttacksForChassis(chassis: Chassis): AttackDef[]`.
  - Tests in `tests/logic/attackLoader.test.ts`: every chassis in the roster has at least one attack; `getAttacksForChassis` returns only valid entries; loader throws on malformed JSON.
- **Acceptance:** `getAttacksForChassis('vacuum')` returns quick_jab and sweep. `getAttackDef('overload').damage === 30`. `pnpm check` passes.

### M2 — Core refactor (parallel)

M2 begins after T-5.1 is done. T-5.2 and T-5.5 are **(parallel)**.

#### T-5.2 — Gambit type refactor: named attack discriminants
- **Status:** todo
- **Track:** logic
- **Depends on:** T-5.1
- **Inputs:** `src/logic/gambits/types.ts`, `src/content/schema/attack.ts`, `src/logic/gambits/interpreter.ts`, all tests referencing `{ kind: 'attack' }`
- **Outputs:**
  - `src/logic/gambits/types.ts`: remove `{ kind: 'attack'; target: TargetSelector }`. Import `AttackId` from `src/content/schema/attack.ts`. New `Action` type: `{ kind: AttackId; target: TargetSelector } | { kind: 'idle' }`. Export `isAttackAction(action: Action): action is { kind: AttackId; target: TargetSelector }` helper (checks `action.kind !== 'idle'`).
  - `src/logic/gambits/interpreter.ts`: replace `action.kind === 'attack'` checks with `isAttackAction(action)`.
  - `src/logic/index.ts`: re-export `AttackId` and `isAttackAction`.
  - All existing tests updated to use named attack IDs instead of `{ kind: 'attack' }`.
- **Acceptance:** No TypeScript errors. `pnpm check` passes (tests still reference valid action kinds).

#### T-5.5 — Per-attack sound synthesis
- **Status:** todo
- **Track:** ui
- **Depends on:** T-5.1
- **Inputs:** `src/audio/sounds.ts`, `src/audio/engine.ts`, existing synthesis files for reference
- **Outputs:**
  - `src/audio/sounds.ts`: remove `'attack'`; add one entry per attack id: `'quick_jab' | 'sweep' | 'taser' | 'overload' | 'clamp' | 'suppression'`. `SoundId` updated accordingly.
  - Six new synthesis files in `src/audio/`: `quickJab.ts` (short sharp click), `sweep.ts` (whooshing glide), `taser.ts` (electrical zap), `overload.ts` (building surge + burst), `clamp.ts` (heavy mechanical thud), `suppression.ts` (sustained low pulse).
  - `src/audio/engine.ts`: add dispatch cases for all six; remove old `'attack'` case.
- **Acceptance:** Calling `playSound('overload')` in a browser produces a recognizably different sound from `playSound('quick_jab')`. All six are distinct. No audio files used. `pnpm check` passes.

### M3 — Logic, content, and display (parallel)

M3 begins after T-5.2 is done. All four tasks are **(parallel)**. T-5.7 also requires T-5.5 to be done before it can wire sounds.

#### T-5.3 — Cooldown tracking in CombatState + resolver
- **Status:** todo
- **Track:** logic
- **Depends on:** T-5.2
- **Inputs:** `src/logic/state/types.ts`, `src/logic/combat/resolver.ts`, `src/logic/content/attackLoader.ts`
- **Outputs:**
  - `src/logic/state/types.ts`: add `cooldowns: ReadonlyMap<UnitId, ReadonlyMap<AttackId, number>>` to `CombatState` (rounds remaining before attack is available; 0 = available).
  - `src/logic/combat/resolver.ts`:
    - `createCombat`: initialize `cooldowns` for every unit — for each attack available to that unit's chassis, set its cooldown to `attackDef.initialCooldown`.
    - `resolveRound`: at the start of each round, decrement all non-zero cooldown counters by 1 for every unit.
    - Gambit interpreter call: if the chosen action is an attack and its cooldown > 0, skip that rule and continue evaluating the next rule (fall-through). This loop continues until a non-cooldown-blocked action is found or the list is exhausted (idle).
    - After executing an attack action: record `cooldown = attackDef.cooldown` for that unit + attack pair.
    - Damage amount: `getAttackDef(action.kind).damage` — no more hardcoded `ATTACK_DAMAGE`.
  - Tests in `tests/logic/cooldowns.test.ts`: initialCooldown of 1 means attack unavailable in round 1, available in round 2; cooldown of 2 means attack unavailable for 2 rounds after use; unit falls through to next rule when blocked; damage values match attack definitions.
- **Acceptance:** Tests pass. `pnpm check` passes.

#### T-5.4 — Update fixtures + player-squad.json
- **Status:** todo
- **Track:** foundation
- **Depends on:** T-5.2
- **Inputs:** `src/logic/content/fixtures.ts`, `src/content/player-squad.json`, `src/content/schema/playerSquad.ts`
- **Outputs:**
  - `src/logic/content/fixtures.ts`: update all gambit lists in the walking-skeleton fixture and boss fixture to use named attack IDs (`quick_jab`, `sweep`, `taser`, `clamp`, `suppression`). Remove any reference to `{ kind: 'attack' }`.
  - `src/content/player-squad.json`: update action entries to use named attack IDs valid for each unit's chassis.
  - `src/content/schema/playerSquad.ts`: update action Zod validation to accept `AttackId` values (import from `src/content/schema/attack.ts`).
- **Acceptance:** `pnpm dev` loads without errors. All gambit entries reference valid named attacks. `pnpm check` passes.

#### T-5.6 — Gambit editor: chassis-filtered attack picker
- **Status:** todo
- **Track:** ui
- **Depends on:** T-5.2
- **Inputs:** `src/ui/screens/GambitEditor/GambitSlot.tsx`, `src/logic/content/attackLoader.ts`, unit chassis information available in editor context
- **Outputs:**
  - Action picker in `GambitSlot` calls `getAttacksForChassis(unit.chassis)` and renders only those attacks as options. No generic "attack" entry.
  - Each option displays: attack name, damage value, cooldown (e.g. "Sweep — 18 dmg, 2-round cooldown"). Initial cooldown noted where applicable.
  - Selecting an attack with an initial cooldown shows a small warning in the slot (e.g. "not available round 1").
- **Acceptance:** Opening the editor for a Vacuum unit shows exactly Quick Jab and Sweep. Opening for a Butler unit shows Taser and Overload. No cross-chassis attacks appear. `pnpm check` passes.

#### T-5.7 — Combat log + playback: named attacks and sounds
- **Status:** todo
- **Track:** render + ui
- **Depends on:** T-5.2, T-5.5
- **Inputs:** combat log component in `src/render/CombatScene/`, `CombatScreen.tsx`, `src/logic/content/attackLoader.ts`
- **Outputs:**
  - Combat log: `action_used` entries show `getAttackDef(action.kind).name` instead of the raw action kind string. Damage entries show the actual amount from the event.
  - `CombatScreen`: replace `playSound('attack')` with `playSound(action.kind)` when dispatching sounds for `action_used` events (action.kind is now always a valid `SoundId` for attack actions).
- **Acceptance:** Watching a fight, the log shows "Quick Jab", "Sweep", etc. Each attack plays its distinct sound. `pnpm check` passes.

---

## v0.6 and beyond

Likely themes: reward selection screen, additional chassis (Lawnbot, Security-drone), vocabulary expansion (new conditions + target selectors), reach rules, modules, Elite node type, Repair Bay node, flavor text between nodes, status effects, meta-progression.
