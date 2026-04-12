# Open Questions

This file tracks **design decisions** — both the ones that are still open and the ones that have been locked in. Two kinds of entry live here:

- **`[Resolved]`** — a decision has been made. The entry records the decision, when it was made, and the source docs it propagated into.
- **`[TBD]`** — still unresolved. Someone needs to make a call before the relevant work can ship.
- **`[Proposal]`** — a current best-guess written into the design docs. We can build against it, but we should be ready to revise if it proves wrong.

All three kinds are also marked inline in the source docs (`gameplay.md`, `architecture.md`, `setting.md`) with matching tags. **This file is the index** — when a decision moves from one status to another, update both the source doc and this entry in the same PR (per `CLAUDE.md`, code and docs must not drift).

Each entry has: **source**, **status**, **decision** (if resolved), **stakes**, **how it was / will be resolved**.

---

## v0.1 blockers (walking skeleton)

These were needed before the corresponding `roadmap.md` task could be marked done.

### Q-V0.1-1 — v0.1 vocabulary subset
- **Source:** `roadmap.md` T-1.2, T-2A.1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** Ship the proposed minimum. `Condition` ∈ {`always`, `self_hp_below`, `target_exists`}; `Action` ∈ {`attack`, `idle`}; `TargetSelector` ∈ {`self`, `nearest_enemy`, `any_enemy`}.
- **Stakes:** The walking skeleton needs *some* gambit vocabulary. Too much = bloat; too little = the fight is boring or doesn't exercise fall-through.
- **Revisit if:** T-2A.2 / T-2A.3 reveal that this subset can't produce an interesting fight or doesn't exercise fall-through to idle. Expand minimally and document the expansion in `gameplay.md` §7.

### Q-V0.1-2 — Walking-skeleton damage values
- **Source:** `roadmap.md` T-2A.1, T-2A.3
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** Fixed `10` damage per `attack`. **Player units start with 80 HP, enemy units with 60 HP.** Fight resolves in ~6–8 rounds. *(Deviates from the original roadmap proposal of 40/30 HP — longer fight showcases the playback scrubber and pause/step controls better.)*
- **Stakes:** Picks how long the v0.1 fight runs. Affects resolver golden test.
- **Revisit if:** The test loop becomes painfully slow or the fight still feels uninteresting after T-2A.3 lands. Retune in `fixtures.ts` and update the resolver golden test in the same PR.

### Q-V0.1-3 — Walking-skeleton chassis trio
- **Source:** `roadmap.md` T-2A.1, T-2C.1, `setting.md` §3
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** Vacuum (player, fast/fragile), Butler (player, balanced/utility), QA-Rig (enemy, industrial).
- **Stakes:** The three chassis built in T-2C.1 anchor the visual identity for everything that follows.
- **Revisit if:** The silhouette test (`setting.md` §4 — "tell apart in solid black") fails for any pair. Swap before T-2C.1 merges.

### Q-V0.1-4 — Render-layer public entry surface
- **Source:** `roadmap.md` T-0.4, T-2C.2
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** Single `src/render/CombatScene/index.ts` barrel. UI may import only that path from the render layer. T-0.4's lint rule enforces this.
- **Stakes:** Without a locked entry surface, the ui↔render boundary is leaky from day one.
- **Revisit if:** A second render scene (MapScene, etc.) lands in v0.2+. Revisit whether to add a parallel `src/render/MapScene/index.ts` barrel or consolidate — per-scene barrels are the default assumption.

### Q-V0.1-5 — When to introduce CI
- **Source:** `roadmap.md`
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Defer until after v0.1 ships.** Local tests only for the walking skeleton. M2's parallel work is ungated by CI; whoever merges is responsible for the green bar.
- **Stakes:** Without CI, "tests pass" depends on whoever last ran `pnpm test` locally. Parallel M2 work is riskier.
- **Revisit when:** v0.1 lands. Adding CI becomes a natural early task in v0.2. If a broken-on-main incident happens during M2, escalate and add CI sooner.

---

## v1 design questions

Decisions required before the relevant v0.2+ work begins.

### Q-G1 — Number of acts and nodes per run
- **Source:** `gameplay.md` §1, `setting.md` §2
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **v1 ships with 1 act × 10–12 nodes.** *(Deviates from the original 3 acts × 12–15 nodes proposal.)* Only the **Assembly Floor** zone is in v1 scope. QA and Showroom are deferred to post-v1 expansion.
- **Stakes:** Determines run length, content budget, balance work.
- **Implication:** The full escape arc (`setting.md` §2) is **not** delivered in v1 — v1 ends at a mid-tier boss inside the Assembly Floor, not at the loading dock. The escape framing stays in the fiction, but the Showroom / Mainframe confrontation becomes a later version's goal.
- **Revisit when:** v0.2 map/node work lands. Validate with playtest data before committing to a second act.

### Q-G2 — Reward types beyond modules and new units
- **Source:** `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Five reward categories in v1:** (1) new module, (2) new unit, (3) heal, (4) +1 rule slot, (5) vocabulary unlock (a new condition or action becomes available). Distribution per reward node is tuned later.
- **Stakes:** Reward variety is what makes the upgrade-choice screen interesting.
- **Revisit when:** The rewards screen lands in v0.2. Tune the offer distribution then. Reroll was discussed and dropped — not in v1.

### Q-G3 — Whether enemies use the same gambit interpreter
- **Source:** `gameplay.md` §7
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Same interpreter.** Enemies have `GambitList`s like player units and run through the same `chooseAction` function. One system to maintain. The walking-skeleton fixture already does this implicitly.
- **Stakes:** Big architectural fork. Same interpreter = clean dogfooding. Pre-scripted = parallel system that bit-rots.
- **Revisit if:** A specific boss fight needs behavior that genuinely can't be expressed in the gambit vocabulary — at which point, extend the vocabulary, don't fork to a second system.

### Q-G4 — Combat playback speeds
- **Source:** `gameplay.md` §4
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **0.5×, 1×, 2×, 10×.** Four speeds. 0.5× for debugging tricky gambits, 10× for blowing through known-winnable fights.
- **Stakes:** UX. Too few speeds = annoying; too many = clutter.
- **Revisit if:** Playtest shows the 2×→10× jump is too abrupt (add 4×) or 0.5× is never used (drop it).

### Q-G5 — Starting rule slots
- **Source:** `gameplay.md` §7
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **4 rule slots per unit at run start.** Additional slots earned via the "+1 rule slot" reward.
- **Stakes:** Authoring depth. Too few = fights feel scripted; too many = blank-page paralysis.
- **Revisit when:** The gambit editor ships in v0.2 and we can playtest authoring. Retune if rules feel consistently cramped or wasted.

### Q-G6 — Repair Bay scope
- **Source:** `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Heal all living units for a fixed percentage of max HP.** Exact percentage TBD during v0.2 tuning — start at 50% as a placeholder.
- **Stakes:** Whether Repair Bay is a simple heal or a richer interaction.
- **Revisit if:** The Repair Bay node feels meaningless alongside combat rewards. The richer "choose one unit full-heal OR partial-heal all" variant is the natural upgrade path.

### Q-A1 — RNG implementation
- **Source:** `architecture.md` §8
- **Status:** `[Proposal]` (locked into `roadmap.md` T-1.4)
- **Current proposal:** Mulberry32. Not cryptographic — just determinism and speed.
- **Revisit if:** A real determinism bug appears that traces to RNG behavior.

---

## Setting / art questions

### Q-S1 — Exact palette values
- **Source:** `setting.md` §4
- **Status:** `[Resolved]` 2026-04-11 *(approach locked; actual hex values pinned later)*
- **Decision:** **Lock the 5–7 core hues and their base/shadow/highlight triplets during T-2C.1**, using `doc/art-style-samples.html` column B as the starting point. Pin the hex values in `setting.md` §4 in the same PR that lands the first chassis.
- **Stakes:** Visual cohesion across chassis. Should be locked before serious chassis art begins.

### Q-S2 — Additional chassis archetypes (v1 roster)
- **Source:** `setting.md` §3
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **v1 ships with 5 chassis classes:** Vacuum, Butler, QA-Rig (walking-skeleton trio) + **Lawnbot** (tank) + **Security-drone** (ranged/flyer). Kitchen-arm, delivery cart, pool cleaner, etc. are deferred to post-v1.
- **Stakes:** Roster variety vs. content budget. Fits the 1-act v1 scope.
- **Revisit if:** The 10–12 nodes of v1 feel repetitive with only 5 chassis. Adding Kitchen-arm is the first follow-up.

### Q-S3 — Whether the rogue AI has a visible UI presence
- **Source:** `setting.md` §6
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Implicit.** No avatar, no voice, no persistent UI element. The player *is* the AI; the gambit editor is "you thinking about your robots."
- **Stakes:** Tone. A visible avatar gives the AI character; implicit keeps the fourth wall thin and the diegetic framing clean.
- **Revisit if:** Playtesters report the fiction feels flat. A text-only terminal presence (error messages, intercepted memos) is the natural upgrade path and also overlaps with Q-S5 flavor text.

### Q-S4 — Names (project, factory, AI, corporation)
- **Source:** `setting.md` §6
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Keep "Bytewars" as the working title. Defer in-fiction names.** Factory, corp, and AI stay unnamed ("the factory", "the AI") in v1. Names land alongside flavor text as they're written, or in a dedicated naming pass before the first external build.
- **Stakes:** Branding commitment.

### Q-S5 — Flavor text between nodes
- **Source:** `setting.md` §6
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Short snippets between nodes** — one-line terminal logs, intercepted memos, error messages. Cheap, high-impact tone delivery. Land alongside the map/node work in v0.2.
- **Stakes:** Tone density vs. writing workload.
- **Revisit if:** One-liners feel thin — rich lore is the upgrade path. If one-liners slow pacing — cut to none.

### Q-S6 — HUD/CCTV framing layer
- **Source:** `setting.md` §4
- **Status:** `[Deferred]` to v2+ *(decision not needed until combat scene and gambit editor have shipped in plain form)*
- **Stakes:** Strong aesthetic framing for the "AI watching its puppets" fantasy. Risk: locks in too much before we know which screens earn it.
- **Revisit when:** The gambit editor and combat scene have shipped in plain form and the team has an opinion on whether plain is enough or needs the framing.

---

## v0.4 design questions

### Q-M1 — Map structure and visual format
- **Source:** `roadmap.md` T-4.5, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Horizontal node graph, HTML/CSS/SVG only (no graph library), max 3 parallel lanes.** 10–12 columns. Last column is always a single Boss node. Node types in v0.4: Combat and Boss only (Elite and Repair Bay deferred).
- **Stakes:** Determines rendering complexity and navigation UX.
- **Revisit if:** 3 lanes prove too narrow for interesting branching, or the HTML approach can't render legible edges at a playable resolution.

### Q-M2 — Map generation seed
- **Source:** `roadmap.md` T-4.2
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Seeded from the run seed.** Same run seed always produces the same map. Fits the determinism model already in place for combat (§8).
- **Stakes:** Reproducibility for debugging and eventual seed-sharing.
- **Revisit if:** Players want unpredictable maps within a deterministic combat system — at which point derive the map seed from the run seed via a separate RNG branch.

### Q-M3 — Unit HP between fights
- **Source:** `roadmap.md` T-4.3, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Survivors carry their HP. Dead units sit out the next fight, then return at 42% HP the fight after.** No full heal between fights except via future Repair Bay nodes.
- **Stakes:** Run tension. If HP fully resets, fights feel disconnected. If dead units are permanent, the run collapses too fast.
- **Revisit if:** Playtesting shows the sit-out rule is confusing or the 42% value is wrong. Tune the percentage in `progression.ts` and update this entry.

### Q-M4 — Reward selection in v0.4
- **Source:** `roadmap.md`, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **No reward screen in v0.4.** Progression is fight-only. Rewards (module, unit, heal, +rule slot, vocabulary unlock) land in v0.5 alongside content data loaders.
- **Stakes:** Run variety. Skipping rewards keeps v0.4 tight; rewards are the main engagement hook for later.

### Q-M5 — Boss enemy definition
- **Source:** `roadmap.md` T-4.4
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **New Overseer chassis, hardcoded in fixtures, 120 HP, aggressive gambit list.** Visually larger and heavier than QA-Rig. Design is free — no specific silhouette constraint beyond passing the "distinct in solid black" test.
- **Stakes:** Boss needs to feel meaningfully harder than regular encounters. 120 HP vs 60 HP enemy HP is the baseline; tune after playtesting.

### Q-M6 — Player squad configurability
- **Source:** `roadmap.md` T-4.1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **`src/content/player-squad.json`**, editable by hand, validated by Zod at startup. Defines chassis, name, grid slot, and starting gambits for each unit. Any squad size 1–9 is valid. Replaces the hardcoded player fixture from the walking skeleton.
- **Stakes:** Allows manual tuning of the starting squad without touching TypeScript.

---

## v0.5 design questions

### Q-A1 — Named attack representation in the gambit type
- **Source:** `roadmap.md` T-5.2, `architecture.md` §4
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **One `Action` discriminant per attack id** — `{ kind: AttackId; target: TargetSelector }`. `AttackId` is derived from the Zod enum in `src/content/schema/attack.ts`. No generic `attack` variant remains. Helper `isAttackAction(action)` guards the check `action.kind !== 'idle'`.
- **Stakes:** Determines how extensible the gambit vocabulary is and how attack metadata is accessed. Per-discriminant keeps TS exhaustive and readable. Adding an attack = adding a row to `attacks.json` (no TypeScript changes beyond the Zod enum).
- **Revisit if:** The number of attacks grows large enough that the discriminated union becomes unwieldy at call sites — at which point a generic `{ kind: 'use_attack'; attackId: AttackId }` variant is the upgrade path.

### Q-A2 — Attack definition storage
- **Source:** `roadmap.md` T-5.1, `architecture.md` §7
- **Status:** `[Resolved]`  2026-04-11
- **Decision:** **`src/content/attacks.json`** validated by Zod at startup. Each entry: `id`, `name`, `damage`, `cooldown`, `initialCooldown`, `sound`, `chassis[]`. Loader in `src/logic/content/attackLoader.ts`.
- **Stakes:** JSON-driven means adding attacks requires no TypeScript changes beyond the Zod enum. Validated at startup so malformed entries fail loudly.

### Q-A3 — Cooldown mechanic in the gambit interpreter
- **Source:** `roadmap.md` T-5.3, `architecture.md` §4
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Silent fall-through.** If a rule's attack is on cooldown, the interpreter skips that rule and evaluates the next one — exactly as if the condition had not matched. No explicit `cooldown_ready` condition needed. Cooldowns decrement at the start of each round. Initial cooldown is set at `createCombat` time.
- **Stakes:** Keeps the gambit authoring model simple (authors don't need to guard cooldowns manually). Risk: a unit may idle unexpectedly if all attack rules are on cooldown and there's no `always → idle` fallback. This is intentional — it's a player mistake to fix in the editor.

### Q-A4 — Gambit editor attack filtering
- **Source:** `roadmap.md` T-5.6
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Editor only shows attacks valid for the selected unit's chassis.** `getAttacksForChassis(chassis)` is called when rendering the action picker. Cross-chassis attacks never appear as options.
- **Stakes:** Prevents authoring errors (setting an attack the unit can't use). Consistent with the principle that the gambit editor is a safe, guided authoring surface.

---

## v0.6 design questions

### Q-R1 — Reward offer format
- **Source:** `roadmap.md` v0.6, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **3 random draws from the enabled reward pool, player picks 1, no skip, no reroll.** The pool is **not filtered for usefulness** — a full-HP squad can still be offered a heal; a full grid can still be offered a new unit (in which case that offer is unusable and the player picks one of the other two). This is intentional: bad rolls are part of the run's texture.
- **Stakes:** Determines the UX of every post-combat transition and how tightly rewards feel balanced.
- **Revisit if:** Playtesting shows too many dead rolls frustrate players. The upgrade path is filtering offers that have no effect (grid-full for new-unit, all-max-HP for heal).

### Q-R2 — Reward categories shipping in v0.6
- **Source:** `roadmap.md` v0.6, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **v0.6 ships 3 of the 5 categories from Q-G2:** heal (two subtypes: full-heal one / partial-heal all), +1 rule slot (player picks unit, cap of 6), and new unit (preset drawn from the starter pool, player picks empty grid slot, pre-authored gambits editable afterward via the existing editor). **Modules and vocabulary unlock are deferred to later versions** because each requires a new underlying system (module slots per chassis; new condition/action vocabulary) that v0.6 does not take on.
- **Stakes:** Keeps v0.6 scoped to mechanics that build on existing combat state. Full 5-category rewards require substantial new systems.
- **Revisit when:** v0.7+ adds modules; vocabulary unlock lands alongside vocabulary expansion (see architecture.md §4 "Planned v0.6+ vocabulary additions" — may slip to v0.8).

### Q-R3 — Starter squad composition
- **Source:** `roadmap.md` v0.6, `gameplay.md` §2
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **2 starter units drawn randomly (without replacement) from a hand-authored preset pool.** Each preset defines chassis, starting HP (baseline 50), rule slot count (baseline 2), and opening gambits. Replaces the fixed `src/content/player-squad.json` starter with a pool file (e.g. `src/content/starter-presets.json`). The same preset pool is drawn from for the "new unit" reward — a new unit joining mid-run is indistinguishable from a starter.
- **Stakes:** Run variety starts at turn 0. Starters must be genuinely *weak* so reward progression feels earned.
- **Revisit if:** Preset pool variance makes balance impossible, or playtesting shows the "50 HP / 2 slots" baseline is wrong. Retune the presets.

### Q-R4 — Rule slot cap
- **Source:** `roadmap.md` v0.6, `gameplay.md` §7
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **Cap rule slots at 6 per unit.** Starts at 2 → 4 rewards to max a unit out. The player picks which unit gets the slot; if all owned units are at 6, the +rule-slot offer is still drawn (per Q-R1 no filtering) and becomes useless for that player.
- **Stakes:** Authoring depth. Too low = quick ceiling, reward becomes dead. Too high = blank-slot paralysis in the editor.
- **Revisit if:** Playtesting shows maxed-out units consistently before boss, or editor feels empty at cap.

### Q-R5 — Heal reward shape
- **Source:** `roadmap.md` v0.6, `gameplay.md` §1, Q-G6
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **Two distinct subtypes, both in the reward pool.** "Full-heal one chosen unit" (player picks from living + returning-at-42% units) and "partial-heal all living units" (fixed %, starting at 50% of max HP). Repair Bay nodes trigger the partial-heal-all effect implicitly on entry.
- **Stakes:** Heal variety directly. The two subtypes occupy different strategic niches (revive-the-tank vs spread-the-love).
- **Revisit if:** One subtype dominates in practice. The weaker one's weight in the pool can be tuned up, or it can be dropped.

### Q-R6 — Elite nodes
- **Source:** `roadmap.md` v0.6, `gameplay.md` §1
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **Elite lands in v0.6.** Map generation places ~2 Elite nodes per map. Elite encounters pull from **4 hand-authored enemy-squad fixtures** (separate from the regular combat fixture pool); the elite-only Siege chassis appears in 2 of the 4. Elite reward pool is the same 3-pick pool but **weighted toward +unit and +rule-slot** (heal weights drop).
- **Stakes:** Elite is the main mid-run spike. Under-tuned = Elite is just "slightly harder combat"; over-tuned = Elite is a run-ender lottery.
- **Revisit if:** Elite win rate diverges sharply from regular combat, or Siege appearances feel too samey across Elite nodes.

### Q-R7 — New chassis (player + enemy) in v0.6
- **Source:** `roadmap.md` v0.6, `setting.md` §3, Q-S2
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **Add 4 chassis in v0.6:** two player chassis (Lawnbot — treaded tank; Security-drone — ranged/fragile) and two enemy chassis (Swarmer — low-HP regular-pool pressure; Siege — elite-only heavy with a long-cooldown devastating attack). Each new chassis gets 1–2 chassis-specific attacks in `attacks.json`. Completes the Q-S2 v1 player roster.
- **Stakes:** Combat variety. Without new chassis, the reward loop rewards ever-more copies of Vacuum/Butler and fights use the same QA-Rig/Overseer silhouettes.
- **Revisit if:** Silhouette readability test fails for any pair (see `setting.md` §4) — swap or retune.

### Q-R8 — Post-reward flow
- **Source:** `roadmap.md` v0.6
- **Status:** `[Resolved]` 2026-04-12
- **Decision:** **Reward screen → map, always.** Never auto-route to the gambit editor even after "new unit" or "+rule slot" rewards. The player can enter the editor from the map before the next fight as they do today.
- **Stakes:** State machine complexity vs. onboarding friction. Auto-routing is guiding; map-first is consistent.
- **Revisit if:** Playtesters miss the prompt to edit gambits after a new unit joins — a map-screen hint or badge is the soft-guidance upgrade path.

---

## Process / tooling questions

### Q-P1 — Storybook or debug-page harness
- **Source:** `roadmap.md` T-2C.1
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **Dev-only debug pages** (`_DebugUnits.tsx`, `_DebugScene.tsx`). Zero new dependencies, fast to set up, sufficient for the 3 chassis in v0.1 and the 5 chassis in v1.
- **Revisit if:** Managing debug pages becomes painful as the roster grows, or component iteration wants isolated controls. Storybook is the upgrade path.

### Q-P2 — Branch / PR strategy for parallel agents
- **Source:** `roadmap.md` "How to work on this in parallel"
- **Status:** `[Resolved]` 2026-04-11
- **Decision:** **One branch per task**, named `task/T-X.Y-short-slug`. Each task → one PR → merge to `main` when `done`. Tasks within the same track rebase on each other as needed. Frequent main merges keep tracks from diverging.
- **Stakes:** With multiple agents picking tasks from M2 simultaneously, branch model determines integration pain.
- **Revisit if:** Frequent merge conflicts between tracks show the boundaries are too porous — at which point, fix the contract, not the branch model.
