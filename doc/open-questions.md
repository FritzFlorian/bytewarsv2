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
