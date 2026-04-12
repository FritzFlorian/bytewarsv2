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

## v0.5 — Named Attacks, Cooldowns, and Per-Attack Sound (done)

v0.5 replaced the generic `attack` action with 6 named attacks across 4 chassis (`quick_jab`, `sweep`, `taser`, `overload`, `clamp`, `suppression`), each defined in Zod-validated `src/content/attacks.json` with its own damage, cooldown, initial cooldown, and synthesized Web Audio sound. Cooldowns are tracked in `CombatState` and gate reuse; the gambit interpreter falls through blocked rules silently. The gambit editor shows only chassis-valid attacks with damage/cooldown info and a round-1 warning where `initialCooldown > 0`, and the combat log displays human-readable attack names. All tasks done, `pnpm check` passes.

---

## v0.6 — Rewards, Elite & Repair Bay, Two New Chassis Per Side

v0.6 delivers the run's growth loop. Today the squad is fixed at whatever `player-squad.json` declares and never changes across a run; v0.6 replaces that with a **starter preset pool** (players start with 2 random, deliberately weak presets at 50 HP / 2 rule slots) and a **3-pick reward screen** after every combat and elite node. It also introduces the **Elite** and **Repair Bay** node types, two new player chassis (**Lawnbot**, **Security-drone**), and two new enemy chassis (**Swarmer** in the regular pool and **Siege** in elite encounters only). Full decision log in `open-questions.md` Q-R1 through Q-R8.

**Scope summary:**
- Reward categories shipping: heal (two subtypes), +1 rule slot (cap 6), new unit (from starter pool). Modules and vocabulary unlock deferred.
- Offer format: 3 random draws from the pool, pick 1, no skip, no filtering for usefulness (Q-R1).
- Elite: ~2 per map, 4 hand-authored fixtures, Siege appears in 2 of them, reward pool weighted toward +unit / +rule-slot.
- Repair Bay: partial-heal-all on entry, shares its effect with the "partial-heal all living units" reward subtype.
- Boss: unchanged — no reward, victory screen as in v0.4.
- Post-reward flow: always return to map; never auto-route to editor (Q-R8).

### M1 — Content foundation

Content schema and data come first. Everything else depends on the new chassis ids, the starter preset pool, and the expanded `attacks.json`.

#### T-6.1 — New chassis registration
- **Status:** todo
- **Track:** foundation
- **Depends on:** v0.5 done
- **Inputs:** `src/logic/state/types.ts` (`Chassis` type), `src/content/schema/attack.ts`, `src/content/schema/playerSquad.ts`
- **Outputs:**
  - `Chassis` extended with `'lawnbot' | 'security_drone' | 'swarmer' | 'siege'`.
  - Zod chassis enum updated everywhere it appears; compile errors surface every place that switches on chassis exhaustively.
  - Unit test in `tests/logic/chassis.test.ts` asserting all 8 chassis round-trip through the schemas.
- **Acceptance:** `pnpm check` passes. No TypeScript exhaustiveness warnings.

#### T-6.2 — New attacks in `attacks.json`
- **Status:** todo
- **Track:** foundation
- **Depends on:** T-6.1
- **Inputs:** `src/content/attacks.json`, `src/content/schema/attack.ts`
- **Outputs:**
  - New entries (tentative ids, damage/cooldown to tune): `mow` (lawnbot), `bash` (lawnbot), `dart` (security_drone), `pulse_shot` (security_drone), `bite` (swarmer), `siege_cannon` (siege — high damage, long cooldown, `initialCooldown: 1`).
  - `AttackId` Zod enum extended; loader tests updated.
- **Acceptance:** `getAttacksForChassis('siege')` returns `siege_cannon`. `getAttackDef('siege_cannon').damage >= 40` (approximate intent — devastating). `pnpm check` passes.

#### T-6.3 — Starter preset pool
- **Status:** todo
- **Track:** foundation
- **Depends on:** T-6.1, T-6.2
- **Inputs:** existing `src/content/player-squad.json` (to retire), `src/content/schema/`
- **Outputs:**
  - `src/content/starter-presets.json` — array of player-unit presets. Each entry: `id`, `name`, `chassis`, `hp` (baseline 50), `ruleSlots` (baseline 2), `gambits` (pre-authored). Author enough presets to cover Vacuum, Butler, Lawnbot, Security-drone with 1–2 variants each (≥6 presets total).
  - `src/content/schema/starterPreset.ts` — Zod schema + loader `getAllStarterPresets(): StarterPreset[]`, `drawStarterSquad(rng, n): StarterPreset[]` (random without replacement).
  - `src/content/player-squad.json` removed; its callers migrate to `drawStarterSquad`.
  - Tests in `tests/logic/starterPresets.test.ts`: schema validates all presets; `drawStarterSquad(rng, 2)` returns 2 distinct presets; every preset's gambits reference only attacks valid for its chassis.
- **Acceptance:** `pnpm check` passes. No references to `player-squad.json` remain outside the removal.

### M2 — Render: new chassis components (parallel)

M2 starts after T-6.1. Four tasks are **(parallel)** — each adds one chassis render component. These cannot be done before T-6.1 because the `Chassis` dispatch in `src/render/units/` must know about the new ids.

#### T-6.4 — Lawnbot render component
- **Status:** todo
- **Track:** render
- **Depends on:** T-6.1
- **Outputs:** `src/render/units/Lawnbot.tsx` — DOM/SVG tree, cel-shaded flat-vector per `setting.md` §4, silhouette test passes ("tell apart from Vacuum, Butler, QA-Rig, Overseer in solid black"). Debug page `_DebugUnits.tsx` renders it.
- **Acceptance:** Visible in `pnpm dev` debug route. Silhouette distinct from all existing chassis.

#### T-6.5 — Security-drone render component
- **Status:** todo
- **Track:** render
- **Depends on:** T-6.1
- **Outputs:** `src/render/units/SecurityDrone.tsx` — flying/wall-mounted silhouette, smaller footprint than Vacuum. Debug page updated.
- **Acceptance:** Visible in debug page. Silhouette distinct.

#### T-6.6 — Swarmer render component
- **Status:** todo
- **Track:** render
- **Depends on:** T-6.1
- **Outputs:** `src/render/units/Swarmer.tsx` — low-profile, aggressive-looking enemy silhouette, industrial per `setting.md` §3. Debug page updated.
- **Acceptance:** Visible in debug page. Silhouette distinct.

#### T-6.7 — Siege render component
- **Status:** todo
- **Track:** render
- **Depends on:** T-6.1
- **Outputs:** `src/render/units/Siege.tsx` — heavy, imposing enemy silhouette; visually clearly an elite-tier threat. Debug page updated.
- **Acceptance:** Visible in debug page. Silhouette distinct.

#### T-6.8 — Per-attack sounds for new attacks
- **Status:** todo
- **Track:** ui (audio)
- **Depends on:** T-6.2
- **Outputs:**
  - New synthesis files in `src/audio/`: one per new attack id from T-6.2. Follow the v0.5 pattern — distinct character per attack.
  - `src/audio/sounds.ts` `SoundId` union extended; `src/audio/engine.ts` dispatch cases added.
- **Acceptance:** Every new attack plays a distinct synthesized sound in the browser. `pnpm check` passes.

### M3 — Logic: rewards, nodes, run state (parallel after M1)

M3 starts after M1 (T-6.1, T-6.2, T-6.3) is done. Tasks are **(parallel)** except where noted.

#### T-6.9 — Reward pool + draw + application
- **Status:** todo
- **Track:** logic
- **Depends on:** T-6.3
- **Inputs:** `src/logic/state/` (RunState), `src/logic/map/progression.ts`
- **Outputs:**
  - `src/logic/rewards/types.ts` — `Reward` discriminated union: `{ kind: 'heal_one' } | { kind: 'heal_all' } | { kind: 'rule_slot' } | { kind: 'new_unit'; presetId: StarterPresetId }`.
  - `src/logic/rewards/pool.ts` — `drawRewardOffers(rng, context: 'combat' | 'elite'): Reward[]` returning 3 rewards, weighted per Q-R1/Q-R6 (combat = uniform; elite = weighted toward rule_slot + new_unit).
  - `src/logic/rewards/apply.ts` — `applyReward(state: RunState, reward: Reward, selection: RewardSelection): RunState`. `RewardSelection` carries player-provided choices (target unit id, grid slot, heal target). Enforces rule-slot cap of 6; applying to a capped unit is a no-op (per Q-R4).
  - RunState extended with a `pendingRewardOffers?: Reward[]` field so the UI knows when to show the screen.
  - Tests: pool draw is deterministic with a seed; elite weighting differs from combat; rule-slot cap enforced; new-unit preset drawn from same pool as starters.
- **Acceptance:** `pnpm check` passes. Tests cover weighting, cap, and each reward kind's state delta.

#### T-6.10 — Elite node type + 4 fixtures + map-gen integration
- **Status:** todo
- **Track:** logic
- **Depends on:** T-6.1, T-6.2 (needs siege attack)
- **Inputs:** `src/logic/content/fixtures.ts`, `src/logic/map/generateMap.ts`, `src/logic/map/types.ts` (`NodeKind`)
- **Outputs:**
  - `NodeKind` union extended with `'elite'`.
  - `fixtures.ts`: 4 new enemy-squad fixtures tuned harder than regular combat. Siege chassis appears in exactly 2 of the 4.
  - `generateMap`: places ~2 Elite nodes on the graph (Q-R6). Exact placement rule: no Elite on the first column, no two Elites in the same column.
  - `createCombat` resolves an Elite node by drawing a random fixture from the 4-fixture pool using the run RNG.
  - Tests: Elite placement rules hold across 100 seeds; 2 of 4 fixtures contain Siege; total Elite count per map is 2 ± 0.
- **Acceptance:** `pnpm check` passes. Map generation snapshot test updated.

#### T-6.11 — Repair Bay node type
- **Status:** todo
- **Track:** logic
- **Depends on:** T-6.1
- **Inputs:** `src/logic/map/types.ts`, `src/logic/map/progression.ts`, `src/logic/map/generateMap.ts`
- **Outputs:**
  - `NodeKind` union extended with `'repair_bay'`.
  - Entering a Repair Bay node applies a partial-heal-all effect (50% of max HP, tunable constant) to all living player units.
  - `generateMap` places 1 Repair Bay per map, biased toward the middle third of the path.
  - Tests: heal amount correct; dead units not healed; returning-at-42% units not healed; node count correct.
- **Acceptance:** `pnpm check` passes. Repair Bay reachable on generated maps.

#### T-6.12 — Run bootstrap uses starter preset draw
- **Status:** todo
- **Track:** logic
- **Depends on:** T-6.3
- **Inputs:** `src/logic/state/` run initialization, wherever `player-squad.json` was loaded
- **Outputs:**
  - New-run bootstrap calls `drawStarterSquad(rng, 2)` (count per Q-R3) and instantiates those presets as the player's starting squad.
  - Every owned unit carries a `ruleSlots: number` field (baseline 2, cap 6) so rule-slot rewards can mutate it per-unit.
- **Acceptance:** Running `pnpm dev` and starting a new run produces 2 randomly-drawn starters at 50 HP / 2 rule slots. Reloading with the same seed reproduces the same starters.

### M4 — UI: reward screen + flow (after M3)

M4 starts once T-6.9 through T-6.12 are done. These tasks can run **(parallel)**.

#### T-6.13 — RewardScreen component + flow wiring
- **Status:** todo
- **Track:** ui
- **Depends on:** T-6.9, T-6.12
- **Inputs:** `src/ui/App.tsx` (screen routing), `src/ui/screens/`
- **Outputs:**
  - `src/ui/screens/Reward/RewardScreen.tsx` — shows the 3 offers, handles the selection flow (including sub-pickers: heal target, +rule-slot unit, new-unit grid slot).
  - App.tsx state machine: after combat victory, if the node awarded rewards, route `combat-result → reward → map`. Losing still goes to `game-over`. Boss still goes straight to `victory`.
  - Reward sub-pickers live in `src/ui/screens/Reward/` as small subcomponents.
- **Acceptance:** Running through a combat in `pnpm dev` displays the reward screen, each reward kind can be picked and applied, and the player lands back on the map. `pnpm e2e` includes a spec covering at least one full combat → reward → map cycle.

#### T-6.14 — Gambit editor supports variable rule slot counts
- **Status:** todo
- **Track:** ui
- **Depends on:** T-6.9 (introduces per-unit `ruleSlots`), T-6.12
- **Inputs:** `src/ui/screens/GambitEditor/`
- **Outputs:** Editor reads `unit.ruleSlots` instead of the former constant; adding a rule beyond the unit's current slot count is blocked; the UI clearly distinguishes filled, available, and locked-beyond-cap slots.
- **Acceptance:** A unit with 2 slots shows 2 active + 4 locked (cap 6). After a +rule-slot reward, that unit shows 3 active. `pnpm check` passes.

#### T-6.15 — Map screen: Elite and Repair Bay node visuals
- **Status:** todo
- **Track:** ui
- **Depends on:** T-6.10, T-6.11
- **Inputs:** `src/ui/screens/RunMap/`
- **Outputs:** Distinct iconography/color for Elite nodes and Repair Bay nodes on the horizontal map graph. Tooltip on hover names the node type.
- **Acceptance:** Visual manual check in `pnpm dev`; Elite and Repair Bay are unmistakable on the map.

### M5 — Balance + integration pass

#### T-6.16 — Balance pass + end-to-end smoke
- **Status:** todo
- **Track:** integration
- **Depends on:** T-6.13, T-6.14, T-6.15
- **Outputs:**
  - Tune HP / damage / cooldowns for Lawnbot, Security-drone, Swarmer, Siege and the 4 Elite fixtures based on a few run playthroughs.
  - `pnpm e2e` spec that completes a full run (start → 3 combats → 1 Elite → Repair Bay → boss → victory) with the run RNG seeded.
- **Acceptance:** The full-run e2e passes. `pnpm check` passes. Roadmap's v0.6 status flipped to **done** in the same PR that merges this task.

---

## v0.7 and beyond

Likely themes: modules (buff + action modules per `gameplay.md` §6), vocabulary expansion (new conditions + target selectors + movement actions), reach rules (front/middle/back row targeting), status effects, flavor text between nodes, meta-progression / unlocks.
