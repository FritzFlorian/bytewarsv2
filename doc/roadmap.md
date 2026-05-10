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

## v0.6 — Rewards, Elite & Repair Bay, Two New Chassis Per Side (done)

v0.6 shipped the run's growth loop. The fixed `player-squad.json` was replaced with a Zod-validated **starter preset pool** (`src/content/starter-presets.json`, 70 HP / 2 rule slots baseline post-balance) drawn at run start via seeded `drawStarterSquad`. After every combat and elite node a **3-pick reward screen** offers heal-one / partial-heal-all / +1 rule slot (cap 6) / new unit (re-drawn from the same starter pool). Two new node types landed: **Elite** (~2 per map, 4 hand-authored fixtures, reward pool tilted toward +unit / +rule-slot) and **Repair Bay** (~1 per map, partial-heal-all on entry, no fight). Two new player chassis (**Lawnbot**, **Security-drone**) and two new enemy chassis (**Swarmer** in the regular pool, **Siege** in elite encounters only) shipped with cel-shaded silhouettes and per-attack synthesized sounds. Map nodes got distinct shapes / colors / icons per type. Per-unit `ruleSlots` is honored throughout the gambit editor with locked placeholder rows up to the cap. The v0.6 balance pass tuned HP / damage / cooldowns so an auto-pilot full-run lands in a fair 30–80% win-rate band, gated by `tests/logic/balanceSimulation.test.ts` and a full-run e2e (`tests/e2e/full-run.spec.ts`). Decision log in `open-questions.md` Q-R1 through Q-R8. All tasks done, `pnpm check` passes.

---

## v0.7 — Module System + Starter Draft (done)

v0.7 replaced fixed chassis attacks with a chassis-agnostic **module system** and added a **starter draft** at run start. Chassis became pure vessels (base HP + active/passive slot counts + silhouette, no inherent attacks). **Active modules** (12 attacks + 3 heals) slot into active slots and provide one-per-turn gambit actions; **passive modules** (6 types: +HP, +damage, +active slot, +rule slot) slot into passive slots for always-on effects. Both are chassis-agnostic. The `UnitInstance` class replaced the old `Unit` interface, carrying `ActiveModuleInstance[]` / `PassiveModuleInstance[]` with computed getters for all derived stats. Content moved to per-file JSON catalogs (`src/content/chassis/`, `src/content/modules/`) validated by Zod schemas with an `availability` field (`player` | `enemy` | `both`) enforced by unit tests. The gambit interpreter resolves actions from installed modules; heal actions (`any_ally`, `weakest_ally`, `self` target selectors) and the `unit_healed` combat event shipped. The **starter draft** screen shows two sequential 1-of-3 picks with chassis silhouettes and module stats. A separate **recruitment pool** feeds mid-run "new unit" rewards. The **reward pool** was reworked: module drops (~45%), remove-module, new-unit, heal-one, heal-all — weighted by a 4-tier rarity system with node-type-scaled exponents. The reward screen handles module install (slot-aware unit picker) and remove (two-step picker, ≥1 active enforced). The **gambit editor** shows only installed active modules in the action picker (context-sensitive target selectors: enemy targets for attacks, ally targets for heals) alongside a read-only **module panel** (slot counts, stats, computed totals). All player chassis have 4 active slots; every starter preset includes ≥1 zero-cooldown attack. The v0.7 **balance pass** tuned enemy HP down (regular 25, boss 45, elites proportional) and enemy-only module damage (bite 7, siege_cannon 30), landing auto-pilot win rate at ~34% (30–80% band). All tasks done, `pnpm check` passes.

---

## v0.8 — Status Effects & Action Variety (done)

v0.8 landed the status-effect engine (typed effects on `UnitInstance.statusEffects[]` with always-stack semantics, per-unit start/end tick, three kinds: `burning`, `disabled`, `damage_boost`), three new `CombatEvent` variants (`status_applied`, `status_expired`, `status_tick_damage`), and two new `actionKind` values (`buff`, `debuff`) plus optional `appliesStatus` composition on attacks. Three AoE target selectors (`all_enemies`, `all_enemies_in_row`, `all_allies`) extend the existing single-target set; the resolver emits one `damage_dealt` / `status_applied` per resolved target. The gambit vocabulary gained `self_has_status` and `target_has_status`; the editor filters action targets by `actionKind` and offers a status-kind picker. Render layer ships per-status icon badges on every unit card, an AoE side-flash class, a new `status_applied` audio stinger, and combat-log entries for tick / apply / expire events. Ten new modules shipped (`sweep_arc`, `concussion`, `flamethrower`, `pulse_lash`, `corrosion`, `damage_drive`, `war_chant`, `jam_signal`, plus enemy-only `blaze_volley` and `rally_command`); two new starter presets dogfood the system (Pyromancer Vacuum with `target_has_status` + `flamethrower`, Saboteur Butler with `jam_signal`); the Overseer boss runs a `rally_command` commander gambit and the `heavy_line` elite uses `blaze_volley`. Auto-pilot win rate sits at 38% (within the 30-80% band, +4pp vs v0.7 baseline). All tasks done, `pnpm check` passes.

v0.8 breaks out of single-target direct-damage and lands a **status-effect system** that unlocks four categories of action variety in one engine: **AoE**, **buffs**, **debuffs**, and **damage-over-time**. The bet: most variety reduces to *typed effects with duration on a `UnitInstance`* plus a small set of new `actionKind` values that apply, react to, or compose with them. Land the engine once in M1–M2; M3 onward becomes schema + content rather than new combat code per feature.

Out of scope (deferred): reach rules (front/middle/back targeting), piercing, persistent ground zones, broad vocabulary pass. Reach in particular is its own version because it makes placement matter for the first time — orthogonal to the status engine.

### M1 — Design kickoff: status-effect system + schema v2

> Lands the design before any code, mirroring v0.7's T-7.1 kickoff. All decisions logged in `open-questions.md` and propagated to `gameplay.md` §6 in the same PR.

#### T-8.1 — Lock the status-effect design (`status: done` · track: foundation)
- **Depends on:** v0.7 ship.
- **Inputs:** `gameplay.md` §6, `architecture.md` §3, existing module schema (`src/content/schema/module.ts`).
- **Outputs:** Q-V8-1 … Q-V8-8 in `open-questions.md`; `gameplay.md` §6 "Status effects (v0.8)" subsection; `architecture.md` §3 v0.8 event variants block. (Landed 2026-05-10.)
- **Decisions locked** (see `open-questions.md` for full rationale):
  - **Q-V8-1 — Shape & storage:** `StatusEffectInstance { kind, magnitude, durationRemaining, sourceUnitId }` stored on `UnitInstance.statusEffects[]`. No external map.
  - **Q-V8-2 — Stacking:** **Always stack as independent instances** — no merge logic. Two `burning` instances tick separately; two `damage_boost` stack additively.
  - **Q-V8-3 — Tick timing:** **Per-unit, around its own turn.** Start-of-turn tick, end-of-turn decrement. A status applied to an already-acted unit ticks first next round.
  - **Q-V8-4 — Schema extension:** Composition. New `actionKind` values `buff` / `debuff`; attacks gain optional `appliesStatus` on `attackProperties`. **No `dot` actionKind** — DoT is just `burning`.
  - **Q-V8-5 — Status kinds shipped:** **`burning`, `disabled`, `damage_boost`** only. Damage reduction, shielded, hastened deferred. M6 catalog adjusted accordingly.
  - **Q-V8-6 — Stat derivation:** Getters fold active statuses. `bonusDamage` includes `damage_boost`; new `isDisabled()` method drives the gambit interpreter early-out.
  - **Q-V8-7 — Combat events:** `status_applied`, `status_expired`, `status_tick_damage`. AoE reuses existing `damage_dealt` / `unit_destroyed`, emitted per resolved target.
  - **Q-V8-8 — Retrofit:** No retrofit of v0.5–v0.7 modules in v0.8. Revisit per-module post-v0.8.
- **Acceptance:** decision-log entries written; `gameplay.md` §6 contains the StatusEffect contract; `architecture.md` §3 lists the new event variants; `pnpm check` passes (docs-only).

### M2 — Status-effect plumbing in the logic layer

#### T-8.2 — `UnitInstance.statusEffects` + tick step + new events (`status: done` · track: logic)
- **Depends on:** T-8.1.
- **Inputs:** locked design from M1.
- **Outputs:**
  - `statusEffects: StatusEffectInstance[]` on `UnitInstance` with mutation methods (`applyStatus`, `tickStatuses`).
  - Computed-getter folding: `bonusDamage`, `damageMultiplier`, `isDisabled`, `shieldAmount`.
  - Tick step integrated into `resolveRound`: start-of-turn DoT damage → action resolution → end-of-turn duration decrement.
  - New `CombatEvent` variants: `status_applied`, `status_expired`, `status_tick_damage`.
  - Golden tests in `tests/logic/` that author statuses by hand and assert event-log shape across rounds.
- **Acceptance:** logic-layer unit tests green; no UI/render changes yet; `pnpm test` passes.

### M3 — Module schema v2 + new action kinds

#### T-8.3 — Extend module schema and combat resolver (`status: done` · track: logic + foundation)
- **Depends on:** T-8.2.
- **Inputs:** existing `src/content/schema/module.ts`; status engine from T-8.2.
- **Outputs:**
  - Two new active `actionKind` values: `buff` and `debuff`, each with a properties block (`magnitude`, `duration`, `cooldown`, `initialCooldown`, applied `statusKind`).
  - Optional `appliesStatus: { kind, magnitude, duration }` field on `attackProperties` so attacks can inflict status on hit.
  - New `TargetSelector` values for AoE: `all_enemies`, `all_enemies_in_row`, `all_allies`, `enemy_column`. Single-target selectors remain.
  - Combat resolver iterates resolved targets and emits one `damage_dealt` / `status_applied` per target.
  - Zod schemas updated; per-`actionKind` selector filtering rules documented (e.g., `buff` modules can't target enemies).
- **Acceptance:** schema unit tests cover the new variants and reject invalid combinations (e.g., `actionKind: 'buff'` with `target: 'nearest_enemy'`); resolver tests cover multi-target damage events; `pnpm check` passes.

### M4 — AoE wiring + render: status icons & area markers

> Runs in parallel with M5 once M3 lands. (M4 ‖ M5)

#### T-8.4 — Render layer: status icons + AoE flash (`status: done` · track: render)
- **Depends on:** T-8.3.
- **Inputs:** new event-log variants; module catalog with AoE selectors.
- **Outputs:**
  - Status-effect badge component on `UnitInstance` cards in `CombatScene` (small icon + duration count, distinct per status kind).
  - AoE marker: row/column/whole-side highlight flash when an action's `targets.length > 1`, timed to the action's playback step.
  - `playback.ts` schedules new event variants; audio engine plays a status-applied stinger.
- **Acceptance:** integration test renders a multi-target attack and asserts both AoE flash class and per-target HP changes; `pnpm e2e` passes.

### M5 — Gambit vocabulary additions (status-aware)

#### T-8.5 — `target_has_status` / `self_has_status` + editor surface (`status: done` · track: logic + ui)
- **Depends on:** T-8.3.
- **Inputs:** locked condition vocabulary from M1.
- **Outputs:**
  - New conditions: `self_has_status { statusKind }` and `target_has_status { target, statusKind }`. Evaluator in `src/logic/gambits/interpreter.ts`.
  - Gambit editor: condition picker offers the new variants; target picker is filtered by `actionKind` (buff modules show ally selectors, debuff modules show enemy selectors, AoE modules surface only the AoE selectors).
  - Status-kind picker on the new conditions (dropdown of all known kinds).
- **Acceptance:** ui tests cover the filtered selector surface and the new conditions; logic tests cover evaluator behavior across stack/refresh edge cases.

### M6 — Content authoring: 10 new modules across categories

#### T-8.6 — Hand-author the v0.8 module catalog (`status: done` · track: content)
- **Depends on:** T-8.3, T-8.4, T-8.5.
- **Status-kind constraint** (Q-V8-5): only `burning`, `disabled`, `damage_boost` are available. Catalog uses these three across all four feature areas.
- **Outputs:** roughly 8–10 new module JSONs in `src/content/modules/`:
  - **2 AoE attacks** — `sweep_arc` (row-AoE, modest damage), `concussion` (all-enemies, low damage). No status applied.
  - **2 attacks with `appliesStatus`** — `flamethrower` (single-target attack + burning, 2 rounds), `pulse_lash` (single-target attack + brief disable, 1 round). Dogfoods the composition path.
  - **1 pure DoT debuff** — `corrosion` (`actionKind: debuff`, applies burning over 3 rounds; no direct hit). Dogfoods debuff modules.
  - **2 buffs** — `damage_drive` (single ally, +damage_boost magnitude 4 for 2 rounds), `war_chant` (`target: all_allies`, +damage_boost magnitude 2 for 1 round). Dogfoods AoE buff selectors.
  - **1 pure disable debuff** — `jam_signal` (single enemy, disabled 1 round).
  - **1–2 enemy-only variants** — wire into existing enemy fixtures or new elite encounters (e.g., a Siege-style attack that applies burning, an Overseer buff for its own minions).
  - Starter / recruitment presets updated where the new modules are appropriate.
- **Acceptance:** Zod validation passes on all new module files; availability lint passes; each starter preset still ships ≥1 active module and ≥1 zero-cooldown attack.

### M7 — Auto-pilot balance pass

#### T-8.7 — Land back in the 30–80% win-rate band (`status: done` · track: integration)
- **Depends on:** T-8.6.
- **Outputs:**
  - `tests/logic/balanceSimulation.test.ts` updated to exercise the new module catalog.
  - Enemy gambits rewritten where needed so debuffs/AoE are actually used by AI.
  - Magnitudes / durations / cooldowns tuned until full-run auto-pilot lands in 30–80%.
- **Acceptance:** balance test green at the chosen seed band; deltas documented in a v0.8 balance section in `gameplay.md` or a balance log file.

### M8 — Full-run e2e + green `pnpm check`

#### T-8.8 — Ship gate (`status: done` · track: integration)
- **Depends on:** T-8.7.
- **Outputs:** `tests/e2e/full-run.spec.ts` extended to verify a run that uses at least one buff/debuff and one AoE action meaningfully (asserting on the rendered status badge and the AoE flash). README "Current State" section refreshed via the `refresh-readme` skill.
- **Acceptance:** `pnpm check` green; visual check in the browser of a v0.8 run; no regressions.

### Dependency summary

```
T-8.1 → T-8.2 → T-8.3 → (T-8.4 ‖ T-8.5) → T-8.6 → T-8.7 → T-8.8
```

### Risks called out in advance

- **Enemy AI authoring difficulty.** The existing interpreter has no `ally.lacks_status` condition — authoring "buff the ally that doesn't already have it" gambits is awkward. If T-8.7 hits this wall, a follow-up vocabulary expansion (`ally.lacks_status`, `enemy.count`) becomes v0.8.5 / v0.9 scope rather than retrofitting it mid-balance.
- **Schema fragility around AoE selectors.** Some selectors (`enemy_column`) only make sense once column membership is decided — defer until M3 if it bogs down the schema; whole-side and row AoE are sufficient to ship the system.
- **Retrofitting existing modules.** Tempting to "improve" taser/clamp/etc. with `appliesStatus` while the iron is hot. Default to *not* doing this in v0.8 to keep balance scope bounded; revisit per-module post-v0.8.

---

## v0.9 and beyond

Likely themes: reach rules (front/middle/back row targeting + melee/ranged module reach), piercing & column mechanics, broader vocabulary expansion (movement actions, ally-status-aware conditions), flavor text between nodes, meta-progression / unlocks.

### Rough idea bucket (unscheduled)

Captured to not be lost; scope, version, and ordering TBD.

- **Visual + audio fidelity pass.** Today's combat is readable but flat — synthesized sounds are minimal, animations are mostly translate/scale tweens, and units look identical regardless of loadout. Raise the bar: **more distinct per-attack sounds** (character and texture, not just tone differences), **richer attack animations** (clear wind-up, impact, follow-through per attack kind so the player instantly reads what happened), and **visually attached modules** — a rocket-launcher module literally appears mounted on the chassis, a shield module overlays a visible plate, etc. Leans on the compositional DOM+SVG unit trees already set up in `setting.md` §4 (modules as runtime child elements). The diegetic payoff: the fact that the loot you picked changed your robot's body is *visible* during combat, not hidden in a menu.
- **Top-bar scene navigation with popover editors.** Replace the current screen-swap state machine with a persistent top bar containing **Map**, **Units** (gambit editor), and **Battle** icons. Clicking an icon opens that view as a popover layered on the current scene, usable at any time — including *during* combat. Opening the gambit editor or map during combat **auto-pauses** the playback; closing resumes it. The gambit editor and map are **read-only during a fight** (inspection only, no edits or path changes), but fully editable between fights. The Battle icon, when no fight is active, either stays disabled or enters a **review mode** showing the last fight's event log for replay/scrubbing — decide which when building. Goal: let the player cross-check "why did my unit idle in round 3?" against its gambit list without losing combat context.
