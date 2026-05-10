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

## v0.7 — Module System + Starter Draft

v0.7 replaces fixed chassis attacks with a chassis-agnostic module system and adds a starter-draft pick at run start.

**Core design decisions (settled):**
- A chassis is a *vessel*: base HP + starting active slots (1–4) + starting passive slots (1–6) + silhouette. No inherent attacks.
- **Active modules** slot into active slots and provide actions (attack or heal for v0.7). One fires per turn via the gambit system. Chassis-agnostic — any active module fits any active slot.
- **Passive modules** slot into passive slots and grant always-on effects: +HP, +damage, +1 active slot, +1 rule slot, etc. Chassis-agnostic.
- No hard cap on active slots — stacking beyond ~3 has diminishing returns (only one fires per turn), so the soft cap is mechanical. "+1 active slot" is a passive module effect.
- "+1 rule slot" is a passive module (no longer a standalone reward).
- **Reward pool** is dominated by module drops. Heals stay. "New unit" stays but draws from a **recruitment pool** (distinct from the starter pool; may share content in v0.7).
- **Starter draft:** At run start, draw 3 random starter squads; player picks one. Every starter unit ships with ≥1 pre-installed active module.

### M1 — Module system design (interactive)

Interactive design phase: iterate on schemas, slot rules, module catalog, starter/recruitment pools, reward integration, and gambit editor changes. **No implementation until design is aligned.**

- T-7.1: Design active/passive slot model and module data schema — status: `done`, track: `foundation`
  - **Settled:** Two slot types — active (1–4, expandable via passive modules, no hard cap) and passive (1–6, fixed). Chassis is a vessel: `baseHp`, `baseRuleSlots`, `activeSlots`, `passiveSlots`, silhouette. No inherent attacks.
  - **Content layout:** One JSON file per chassis (`src/content/chassis/<id>.json`), one JSON file per module (`src/content/modules/<id>.json`). Module `type` field discriminates active vs passive.
  - **Availability:** All modules and chassis carry `availability: "player" | "enemy" | "both"`. Strict constraint — enforced by a unit test on all fixtures and presets.
  - **Active modules:** Union type on `actionKind` (v0.7: `"attack"` | `"heal"`). Per-kind nested properties block (`attackProperties`, `healProperties`). `sound` at top level. No `chassis[]` — chassis-agnostic.
  - **Passive modules:** `effects[]` array, each `{ kind, value }`. v0.7 kinds: `bonus_hp`, `bonus_damage`, `extra_active_slot`, `extra_rule_slot`.
  - **Runtime unit:** `UnitInstance` class. `ActiveModuleInstance` carries `cooldownRemaining` (replaces `CooldownMap`). `PassiveModuleInstance` carries `{ defId }` (extensible for future stateful effects). Computed getters for `maxHp`, `effectiveActiveSlots`, `ruleSlots`, `bonusDamage` — always derived from chassis base + passive effects, never stored.
  - **Heal target selectors:** `any_ally` and `weakest_ally` ship in v0.7. Future selectors (positional, percentage-based) planned as unlocks via targeting passive modules.
  - Full schema documented in `gameplay.md` §6.
- T-7.2: Design module catalog (initial set of active + passive modules) — status: `done`, track: `logic`
  - **Availability field:** All modules and chassis carry an `availability` field: `"player"` | `"enemy"` | `"both"`. This is a **strict constraint** — fixtures and presets must only reference modules/chassis matching their side's availability. A unit test validates all fixtures and presets against this rule.
  - **Chassis availability:** Player chassis (`vacuum`, `butler`, `lawnbot`, `security_drone`) = `"player"`. Enemy chassis (`qa-rig`, `overseer`, `swarmer`, `siege`) = `"enemy"`.
  - **Active attack modules (12, converted from existing attacks.json):** `quick_jab` (8 dmg, CD 0/0, `both`), `sweep` (18 dmg, CD 2/0, `both`), `taser` (7 dmg, CD 0/0, `both`), `overload` (30 dmg, CD 3/1, `both`), `clamp` (10 dmg, CD 1/0, `both`), `suppression` (12 dmg, CD 2/0, `both`), `mow` (10 dmg, CD 0/0, `both`), `bash` (22 dmg, CD 2/0, `both`), `dart` (9 dmg, CD 0/0, `both`), `pulse_shot` (24 dmg, CD 2/1, `both`), `bite` (12 dmg, CD 0/0, `enemy`), `siege_cannon` (45 dmg, CD 3/1, `enemy`).
  - **Active heal modules (3, new):** `patch_kit` (15 heal, CD 2/0, `player`), `emergency_repair` (35 heal, CD 4/1, `player`), `quick_patch` (8 heal, CD 2/0, `both`).
  - **Passive modules (6, new):** `reinforced_plating` (bonus_hp +15, `both`), `heavy_armor` (bonus_hp +30, `both`), `damage_amplifier` (bonus_damage +5, `both`), `overclocked_core` (bonus_damage +10, `both`), `expansion_bay` (extra_active_slot +1, `both`), `logic_co_processor` (extra_rule_slot +1, `both`).
  - All passive modules are `both` — enemies can have them too (visible on unit when rendered). Duplicate passive stacking is allowed; slot cost is the natural limit.
  - Exact stats are draft values; balance tuned in M6.
  - **Validation test:** Unit test checks that all fixtures (walking skeleton, boss, elites) and presets (starter, recruitment) only use modules and chassis whose `availability` matches the unit's side (`player` or `enemy`; `both` matches either).
- T-7.3: Design starter pool, recruitment pool, and starter-draft UX — status: `done`, track: `ui`
  - **Starter draft:** Two sequential picks. Pick 1: show 3 random presets from the starter pool (no duplicates within the 3), player picks one. Pick 2: show 3 random presets (no duplicates within the 3, but can repeat presets from pick 1 including the chosen one). Fully random, no exclusion logic. Run begins with the 2 chosen units.
  - **Starter preset format:** Updated to reference module IDs. Fields: `id`, `name`, `chassis`, `activeModules: string[]`, `passiveModules: string[]`, `gambits`. `hp` and `ruleSlots` removed — derived from chassis definition. Every preset must have ≥1 active module.
  - **Draft screen UX:** Each pick shows 3 unit cards side by side. Each card displays: chassis name + silhouette, HP (from chassis), installed modules (each module lists what it does — damage/cooldown for attacks, heal amount for heals, effect for passives).
  - **Recruitment pool:** Same data structure as the starter pool, separate file so pools can diverge later. For v0.7, content is identical to the starter pool. Used for mid-run "new unit" reward draws.
- T-7.4: Design reward pool rework (module drops, updated categories) — status: `done`, track: `logic`
  - **Reward categories (v0.7):** Module drop (active or passive), remove module, new unit (from recruitment pool), heal-one, partial-heal-all. "+1 rule slot" is gone as a standalone category — absorbed into passive module drops (`logic_co_processor`).
  - **Reward generation:** After combat/elite node, draw 3 rewards. Approximate weights: 45% module drop, 15% new unit, 15% heal-one, 15% partial-heal-all, 10% remove module. Elite nodes tilt further toward modules and new units. No filtering for usefulness — RNG is RNG.
  - **Remove module card:** When picked, player chooses a unit, then chooses which installed module to remove. The module is destroyed (not transferred). Cannot remove the last active module on a unit (≥1 active enforced). Frees up a slot for future drops — a flexibility reward, not a power reward.
  - **Module drop card:** Pre-rolled — shows a specific module with name, type, and stats. When picked, player chooses which unit to install on (must have a free slot of the matching type). If no unit has a free slot, the card is shown but **visually marked as "no space" and unselectable** (option B — player must pick one of the other rewards).
  - **Rarity system:** Each module has a `rarity` integer (1–4). Drop weight = `1 / rarity ^ exponent`, where exponent varies by node type: regular combat ~1.5 (super-linear, rare items extra unlikely), elite ~1.0 (linear), boss ~0.5 (sub-linear, tilted toward rare drops). Exact exponents tuned in M6.
  - **Rarity assignments:** 1 = basic (`quick_jab`, `taser`, `mow`, `dart`, `quick_patch`, `reinforced_plating`). 2 = solid (`sweep`, `clamp`, `bash`, `suppression`, `patch_kit`, `damage_amplifier`). 3 = strong (`overload`, `pulse_shot`, `heavy_armor`, `logic_co_processor`). 4 = powerful (`emergency_repair`, `overclocked_core`, `expansion_bay`). Enemy-only modules have no rarity (never drop).
  - **Boss rewards:** Defined with favorable rarity scaling (exponent ~0.5). Currently the single-boss run ends on victory with no reward screen; boss rewards activate when multi-act runs land.
- T-7.5: Design gambit editor changes (show installed modules, module management) — status: `done`, track: `ui`
  - **Action picker:** Dropdown lists only the unit's installed active modules (replaces `getAttacksForChassis()` filtering). Each entry shows module name, damage/heal amount, cooldown. Round-1 warning for `initialCooldown > 0` stays.
  - **Module panel:** Added alongside the gambit list in a side-by-side layout within each unit tab. Shows: active modules with slot count (used/effective), passive modules with slot count (used/fixed), each module listing its key stats/effects. Computed stats summary at the bottom (maxHp with breakdown, bonusDamage, ruleSlots, active slot count).
  - **Module install flow:** Happens on the reward screen when the player picks a module drop — choose unit, install into free slot. No separate inventory screen.
  - **Module removal flow:** Happens on the reward screen when the player picks a "remove module" reward — choose unit, choose module to remove. Module is destroyed. Cannot remove last active module (≥1 enforced).
  - **Read-only between fights:** The module panel in the gambit editor is read-only (inspect only). All module changes happen through rewards.

### M2 — Core module infrastructure

Implement the module data model, catalog, slot system, and wire into the logic layer. Replaces `attacks.json` chassis whitelist.

- T-7.6: Implement module + chassis schemas (Zod), module catalog JSON — status: `done`, track: `foundation`, depends on: M1
  - Zod schemas for chassis JSON (including `availability`), active module JSON (union on `actionKind`, including `availability`), passive module JSON (including `availability`). Content loaders that scan `chassis/` and `modules/` directories. Validate all JSON at startup. **Availability validation test:** unit test that checks all fixtures and presets only reference modules and chassis whose `availability` matches the unit's side.
- T-7.7: Rework unit state to carry installed modules instead of chassis-fixed attacks — status: `done`, track: `logic`, depends on: T-7.6
  - Implement `UnitInstance` class with `ActiveModuleInstance[]`, `PassiveModuleInstance[]`, computed getters. Replace current `Unit` interface and `CooldownMap`. Update `createCombat` to instantiate `UnitInstance` from starter presets / fixtures.
- T-7.8: Update gambit interpreter to resolve actions from installed active modules — status: `todo`, track: `logic`, depends on: T-7.7
  - Interpreter resolves available actions from `unit.getAvailableActions()` (active modules with `cooldownRemaining === 0`). `Action` type references module IDs instead of `AttackId`. `tickCooldowns()` called per round on each unit instance.
- T-7.9: Update combat resolver for heal actions — status: `todo`, track: `logic`, depends on: T-7.8
  - New `unit_healed` combat event. Heal resolves against target ally, restores HP up to `maxHp`. Add `any_ally` and `weakest_ally` target selectors.

### M3 — Starter draft + recruitment pool

Run-start picker (choose 1 of 3 starter squads) and recruitment pool for mid-run unit rewards.

- T-7.10: Implement starter-draft screen (two sequential unit picks) — status: `todo`, track: `ui`, depends on: T-7.6
  - New screen before the map screen. Two sequential picks: each shows 3 random presets (seeded, no duplicates within each draw of 3), player picks one per round. Cards show chassis silhouette + name, HP, installed modules with stats. Wire into App.tsx state machine (new state before `map`). Second draw is independent (can repeat presets from first draw including the chosen one).
- T-7.11: Implement recruitment pool (separate from starter pool) — status: `todo`, track: `logic`, depends on: T-7.6
  - Recruitment pool data file + loader (same format as starter presets). For v0.7 content is identical to starter pool. "New unit" reward draws from this pool. Recruited units come with pre-installed modules (≥1 active).

### M4 — Reward pool rework

Module drops as rewards, updated reward screen.

- T-7.12: Add module-drop and remove-module reward types, integrate into reward generation — status: `todo`, track: `logic`, depends on: T-7.7
  - New reward types: module drop (active or passive) and remove module. Module drop generation: draw from eligible modules (`availability` = `player` or `both`), weighted by rarity (`weight = 1 / rarity ^ exponent`; exponent varies by node type — combat ~1.5, elite ~1.0, boss ~0.5). Remove module: player picks unit then module to destroy (cannot remove last active module). Remove standalone "+1 rule slot" reward — it is now a passive module (`extra_rule_slot`). Category weights: ~45% module drop, ~15% new unit, ~15% heal-one, ~15% partial-heal-all, ~10% remove module (elite tilts toward modules + new units).
- T-7.13: Update reward screen UI for module drops and remove-module — status: `todo`, track: `ui`, depends on: T-7.12
  - **Module drop card:** Show module name, type, effects/stats. When selected, prompt player to choose which unit to install on (show available slots). Highlight units with a compatible free slot. If no unit has a free slot of the matching type, card is shown but **marked "no space" and unselectable**.
  - **Remove module card:** When selected, show unit picker, then module picker on the chosen unit. Grey out last active module (cannot remove). Module is destroyed, slot freed.

### M5 — Gambit editor + UI updates

Editor shows installed modules; module management surfaces.

- T-7.14: Gambit editor shows actions from installed active modules (replaces chassis-filtered list) — status: `todo`, track: `ui`, depends on: T-7.7
  - Action picker dropdown lists only the unit's `activeModules` (by name, with damage/cooldown info). No more `getAttacksForChassis()` filtering. Show cooldown/initialCooldown info and round-1 warning where applicable.
- T-7.15: Module management UI (view/install modules on units between fights) — status: `todo`, track: `ui`, depends on: T-7.14
  - Unit detail view showing installed active + passive modules and their effects. Computed stats displayed (maxHp, bonusDamage, effectiveActiveSlots, ruleSlots). Passive effects summarized.

### M6 — Balance + E2E

Balance pass, update balance simulation, full-run e2e.

- T-7.16: Balance pass (HP / damage / slot counts / module stats) — status: `todo`, track: `logic`, depends on: M5
  - Tune chassis baseHp and slot spreads across all 8 chassis. Tune module stats (damage, heal amounts, cooldowns, passive effect values). Target: auto-pilot full run lands in 30–80% win-rate band.
- T-7.17: Update balance simulation test and full-run e2e — status: `todo`, track: `integration`, depends on: T-7.16
  - Update `balanceSimulation.test.ts` to work with module-based units. Update `full-run.spec.ts` to exercise starter draft, module rewards, and heal actions.

---

## v0.8 and beyond

Likely themes: action variety expansion (AoE, debuffs, buffs, multi-target, piercing, DoT), vocabulary expansion (new conditions + target selectors + movement actions), reach rules (front/middle/back row targeting), status effects, flavor text between nodes, meta-progression / unlocks.

### Rough idea bucket (unscheduled)

Captured to not be lost; scope, version, and ordering TBD.

- **Visual + audio fidelity pass.** Today's combat is readable but flat — synthesized sounds are minimal, animations are mostly translate/scale tweens, and units look identical regardless of loadout. Raise the bar: **more distinct per-attack sounds** (character and texture, not just tone differences), **richer attack animations** (clear wind-up, impact, follow-through per attack kind so the player instantly reads what happened), and **visually attached modules** — a rocket-launcher module literally appears mounted on the chassis, a shield module overlays a visible plate, etc. Leans on the compositional DOM+SVG unit trees already set up in `setting.md` §4 (modules as runtime child elements). The diegetic payoff: the fact that the loot you picked changed your robot's body is *visible* during combat, not hidden in a menu.
- **Action variety expansion.** Today's actions are single-target direct damage only. Add meaningful mechanical variety: **AoE** (hit multiple slots by row/column/radius), **multi-target** (chain or split damage across several units), **piercing** (damage passes through front-row to back-row), **burning / lingering effects** (damage-over-time, persistent zones), **debuffs** (reduce damage, slow, disable, apply status), **buffs** (raise damage, shield, haste on allies), and **heals** (restore HP on allies, potentially with conditions). Requires extending the combat event log (`status_applied`, `unit_repaired`, area-effect events), the gambit vocabulary (new conditions like `self.has_status`, new targeting selectors like `all_enemies_in_row`), and the render layer (visual language for AoE markers, status icons, lingering zones). Lands alongside or after the module system — most new actions ship as attack-module entries in the catalog.
- **Top-bar scene navigation with popover editors.** Replace the current screen-swap state machine with a persistent top bar containing **Map**, **Units** (gambit editor), and **Battle** icons. Clicking an icon opens that view as a popover layered on the current scene, usable at any time — including *during* combat. Opening the gambit editor or map during combat **auto-pauses** the playback; closing resumes it. The gambit editor and map are **read-only during a fight** (inspection only, no edits or path changes), but fully editable between fights. The Battle icon, when no fight is active, either stays disabled or enters a **review mode** showing the last fight's event log for replay/scrubbing — decide which when building. Goal: let the player cross-check "why did my unit idle in round 3?" against its gambit list without losing combat context.
