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

## v0.7 and beyond

Likely themes: modules (buff + action modules per `gameplay.md` §6), vocabulary expansion (new conditions + target selectors + movement actions), reach rules (front/middle/back row targeting), status effects, flavor text between nodes, meta-progression / unlocks.

### Rough idea bucket (unscheduled)

Captured to not be lost; scope, version, and ordering TBD.

- **Visual + audio fidelity pass.** Today's combat is readable but flat — synthesized sounds are minimal, animations are mostly translate/scale tweens, and units look identical regardless of loadout. Raise the bar: **more distinct per-attack sounds** (character and texture, not just tone differences), **richer attack animations** (clear wind-up, impact, follow-through per attack kind so the player instantly reads what happened), and **visually attached modules** — a rocket-launcher module literally appears mounted on the chassis, a shield module overlays a visible plate, etc. Leans on the compositional DOM+SVG unit trees already set up in `setting.md` §4 (modules as runtime child elements). The diegetic payoff: the fact that the loot you picked changed your robot's body is *visible* during combat, not hidden in a menu.
- **Action variety expansion.** Today's actions are single-target direct damage only. Add meaningful mechanical variety: **AoE** (hit multiple slots by row/column/radius), **multi-target** (chain or split damage across several units), **piercing** (damage passes through front-row to back-row), **burning / lingering effects** (damage-over-time, persistent zones), **debuffs** (reduce damage, slow, disable, apply status), **buffs** (raise damage, shield, haste on allies), and **heals** (restore HP on allies, potentially with conditions). Requires extending the combat event log (`status_applied`, `unit_repaired`, area-effect events), the gambit vocabulary (new conditions like `self.has_status`, new targeting selectors like `all_enemies_in_row`), and the render layer (visual language for AoE markers, status icons, lingering zones). Lands alongside or after the module system — most new actions ship as attack-module entries in the catalog.
- **Module system replaces fixed chassis attacks.** Rework unit composition: a chassis becomes a *vessel* with base stats only (HP, starting attack/buff slots, max attack/buff slots, silhouette). **Actions are no longer inherent to a chassis** — they come from **Attack Modules** slotted into attack slots, making them the primary loot economy. **Buff Modules** slot separately and grant flat stats, passive effects, extra slot capacity (up to the chassis max), or **unlock new gambit conditions / targeting rules** on that unit. Attack modules are **chassis-agnostic** — any module fits any attack slot — so every drop is potentially useful. Starter presets ship with 1–2 pre-installed attack modules so round 1 is playable. This replaces today's `attacks.json` chassis[] whitelist with a module catalog; the reward pool shifts from "new unit + heal + rule slot" to being dominated by module drops. Effects cascade: gambit editor shows the unit's installed modules instead of chassis-fixed attacks, and vocabulary unlocks (see Q-G2 category 5) become a kind of buff module rather than a global run-level unlock.
- **Top-bar scene navigation with popover editors.** Replace the current screen-swap state machine with a persistent top bar containing **Map**, **Units** (gambit editor), and **Battle** icons. Clicking an icon opens that view as a popover layered on the current scene, usable at any time — including *during* combat. Opening the gambit editor or map during combat **auto-pauses** the playback; closing resumes it. The gambit editor and map are **read-only during a fight** (inspection only, no edits or path changes), but fully editable between fights. The Battle icon, when no fight is active, either stays disabled or enters a **review mode** showing the last fight's event log for replay/scrubbing — decide which when building. Goal: let the player cross-check "why did my unit idle in round 3?" against its gambit list without losing combat context.
