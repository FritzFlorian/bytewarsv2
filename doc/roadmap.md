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

## v0.2 — Gambit Editor + Visual Combat Feedback

**Goal.** A player can author gambits for each of their units on a dedicated editor screen, click Run, and watch the fight play out with clear visual feedback (active unit highlight, target indicators, idle state) and a persistent scrolling combat log.

**Scope.** Gambit editor for player units only (Vacuum + Butler). Enemy gambits remain hardcoded in fixtures. v0.1 gambit vocabulary only. One-shot flow: editor → fight → done (no way back). No map, no rewards, no content loaders.

**Done bar.** Both milestones done. `pnpm check` passes. A human can boot `pnpm dev`, navigate to the editor, set custom gambits for each unit, click Run, and watch the fight with clear per-turn visual feedback and a readable scrolling log.

### M1 — Gambit Editor

#### T-1.1 — Editor screen shell + unit tabs
- **Status:** done
- **Track:** ui
- **Depends on:** v0.1 done
- **Inputs:** `src/ui/App.tsx`, `src/logic/gambits/types.ts`
- **Outputs:**
  - `src/ui/screens/GambitEditor/GambitEditorScreen.tsx` — top-level editor screen with a tab bar (one tab per player unit: Vacuum, Butler). Selecting a tab shows that unit's gambit list below.
  - `src/ui/screens/GambitEditor/GambitEditorScreen.module.css`
  - `src/ui/App.tsx` updated so the editor screen is the landing page; the combat screen is navigated to after clicking Run.
- **Acceptance:** `pnpm dev` lands on the editor screen with two unit tabs. Switching tabs shows the correct unit name. No gambit editing yet — slots can be empty placeholders.

#### T-1.2 — Gambit slot component (searchable dropdowns)
- **Status:** done
- **Track:** ui
- **Depends on:** T-1.1
- **Inputs:** `src/logic/gambits/types.ts` (v0.1 vocabulary), `GambitEditorScreen.tsx`
- **Outputs:**
  - `src/ui/screens/GambitEditor/GambitSlot.tsx` — one rule slot: condition picker + action picker + target picker (where applicable). Each picker is a searchable dropdown (type to filter). Vocabulary is constrained to v0.1 types; TS enforces this at the prop boundary.
  - `src/ui/screens/GambitEditor/GambitList.tsx` — renders 4 slots for the active unit (4 rule slots per Q-G5).
  - `tests/ui/GambitSlot.test.tsx` — renders a slot, selects a condition, asserts the dependent pickers update correctly.
- **Acceptance:** Selecting `self_hp_below` shows a numeric `pct` input. Selecting `target_exists` shows a target selector. Selecting `always` shows neither. Selecting `idle` as action hides the target picker. All picker states compile under strict TS.

#### T-1.3 — Drag-to-reorder slots
- **Status:** done
- **Track:** ui
- **Depends on:** T-1.2
- **Inputs:** `GambitList.tsx`
- **Outputs:** Drag-and-drop reordering of rule slots within a unit's gambit list. Use the HTML5 drag-and-drop API — no new library dependency.
- **Acceptance:** Dragging slot 3 above slot 1 reorders the list. The new order is reflected in the `GambitList` state that will be read by T-1.4. Works in a `pnpm dev` browser check.

#### T-1.4 — Wire "Run" → createCombat → transition to combat screen
- **Status:** done
- **Track:** integration
- **Depends on:** T-1.3
- **Inputs:** editor output (`GambitList` per player unit), `createCombat` / `resolveRound` / `isCombatOver` from `src/logic/index.ts`, `src/ui/screens/Combat/CombatScreen.tsx`
- **Outputs:**
  - "Run" button in `GambitEditorScreen` reads the current gambit lists, merges them into the walking-skeleton fixture (enemy units stay hardcoded), resolves the full fight, and passes the accumulated `CombatEvent[]` to `CombatScreen` / `CombatScene`.
  - App navigates to the combat screen and begins playback automatically.
- **Acceptance:** Changing a player gambit (e.g. switching the target from `nearest_enemy` to `any_enemy`) produces a different fight observable in the event log. `pnpm check` passes.

### M2 — Combat Visual Feedback

M2 begins after T-1.4 is done. Tasks T-2.1, T-2.2, and T-2.3 are **(parallel)**. T-2.4 depends on T-2.1.

#### T-2.1 — Active unit highlight (parallel)
- **Status:** todo
- **Track:** render
- **Depends on:** T-1.4
- **Inputs:** `src/render/CombatScene/CombatScene.tsx`, `src/render/playback.ts`, `turn_started` / `turn_ended` events
- **Outputs:**
  - The unit whose turn is currently playing has a visible highlight (glow, ring, or border). Advances in sync with `turn_started` / `turn_ended` events.
  - CSS keyframe for highlight on/off transition.
- **Acceptance:** Watching the fight in `pnpm dev`, the active unit is always clearly identified. Highlight disappears at `turn_ended`. Works at all four playback speeds.

#### T-2.2 — Idle state visual distinction (parallel)
- **Status:** todo
- **Track:** render
- **Depends on:** T-1.4
- **Inputs:** `CombatScene.tsx`, `rule_fired` event (action kind `idle`)
- **Outputs:** A visually distinct indicator on a unit when its action is `idle` (no rule fired) — e.g. a brief dim pulse or "…" badge. Must contrast clearly with the attack animation.
- **Acceptance:** In a fight where a unit idles (no rule matches the current battlefield), the idle indicator appears and is distinguishable from an attack. Confirmed with a hand-edited fixture if needed.

#### T-2.3 — Target indicator: arrow / projectile (parallel)
- **Status:** todo
- **Track:** render
- **Depends on:** T-1.4
- **Inputs:** `CombatScene.tsx`, `action_used` event (includes target slot), unit slot positions in the DOM
- **Outputs:**
  - On `attack`: an arrow SVG or CSS projectile animates from the attacker's slot to the target's slot, timed to land before `damage_dealt` is shown.
  - CSS keyframe for projectile travel.
- **Acceptance:** Every `attack` in the fight shows an indicator traveling to the correct target. No indicator on `idle`. Works at all four playback speeds.

#### T-2.4 — Scrolling combat log side panel
- **Status:** todo
- **Track:** render
- **Depends on:** T-2.1
- **Inputs:** `CombatScene.tsx`, `CombatEvent[]`, playback timing from `playback.ts`
- **Outputs:**
  - A scrolling log panel rendered as part of `CombatScene`. Sits alongside the battle grid.
  - Entries are appended in sync with playback. Each entry is a short readable line, e.g.: `Round 1 · Vacuum → attack → QA-Rig #1 (10 dmg)` / `Butler → idle` / `QA-Rig #2 destroyed`.
  - After `combat_ended`, the full log stays visible and is scrollable for review.
- **Acceptance:** Log entries appear in time with animations during the fight. After the fight ends, the full log is scrollable. `pnpm check` passes.

---

## v0.3 and beyond

To be planned after v0.2 ships. Likely themes: content data + Zod loaders, vocabulary expansion, modules, cooldowns, reach rules, run map + node progression, reward selection screen, additional chassis (Lawnbot, Security-drone), Repair Bay node, flavor text, status effects.
