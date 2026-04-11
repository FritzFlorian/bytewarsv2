# Gameplay Spec

This is the source of truth for *how the game works*. Anything marked **[Proposal]** is a current best-guess subject to revision; anything marked **[TBD]** is unresolved and tracked in `open-questions.md`.

## 1. Run structure

A **run** is a single attempt from the first encounter to the final boss. Runs are short, repeatable, and self-contained. v1 has no persistence between runs.

### Map

Each run takes the player through one or more **acts**. Each act is a branching directed map of **nodes**, in the style of Slay the Spire: the player starts at the bottom, picks a path upward, and each node on the chosen path is an encounter.

- **v1 ships with 1 act × 10–12 nodes**, ending in a boss. The full three-act escape arc (Assembly → QA → Showroom) described in `setting.md` §2 is *not* delivered in v1 — only the **Assembly Floor** zone. QA and Showroom are deferred to post-v1 versions. See `open-questions.md` Q-G1.
- Paths fork and merge — choosing which path to take is a meaningful decision because different node types appear on different routes.
- Once a node is committed to and resolved, the player moves on. No backtracking.

### Node types

v1 supports the following node types. Distribution is tuned per act.

| Node | What happens |
|---|---|
| **Combat** | Standard encounter against an enemy squad. Most common node type. |
| **Elite** | Harder combat encounter against a tougher enemy squad. Better rewards. |
| **Boss** | Act-ending encounter. Unique enemy composition. |
| **Repair Bay** | Heal all living units for a fixed percentage of max HP (starting at 50%, tuned during v0.2). See `open-questions.md` Q-G6. |


### Rewards

After most nodes (especially combat), the player is offered a **choice of upgrade** drawn from a pool. **v1 has five reward categories** (see `open-questions.md` Q-G2):

1. A **new module** for one of their existing units (class-locked — see §5).
2. A **new unit** added to the squad (up to the cap of 9). This should be rare (a boss always drops this, elite fights may drop it).
3. A **heal** — restore HP to one or more units.
4. **+1 rule slot** for a chosen unit.
5. A **vocabulary unlock** — a new condition or action becomes available to write in gambits.

The rewards menu is the primary place where the player decides whether to grow wide (more bodies) or grow deep (stronger existing units).

## 2. Squad and roster

- The player commands **up to 9 robot units**, filling the 3×3 slot grid on their side of the battlefield.
- **No bench, no reserves, no swap-in.** Every owned unit is on the field.
- The player **starts a run with 2 units**.
- New units are acquired during the run as one of several competing reward choices. "+1 unit" is never automatic — it always costs an upgrade slot.
- Units lost during a fight skip the next fight (deactivated) and then come back with 42% hp next fight. 

## 3. Combat layout

Combat is fought on a battlefield of **two facing 3×3 slot grids** — the player's squad on one side, the enemy squad on the other.

```
                 enemy side
              [ ][ ][ ]   back row
              [ ][ ][ ]   middle row
              [ ][ ][ ]   front row
              -----------
              [ ][ ][ ]   front row
              [ ][ ][ ]   middle row
              [ ][ ][ ]   back row
                player side
```

- A unit occupies exactly one slot. Empty slots are normal.
- **Front, middle, and back rows have meaning** — for example: melee actions may only reach the front row; ranged actions may reach any row; front-row units may absorb hits intended for those behind them. Exact rules per class/weapon are defined in content data.
- **Columns may matter** for some actions (e.g., a piercing shot hits the entire column it targets).
- **Exact placement is not a core mechanic.** Players think in terms of "front line vs back line," not coordinates. Movement actions are coarse: `Advance`, `Retreat`, `Swap with adjacent ally`. There is no "step one tile."

The player places its units on this grid manually before battle. The last configuration is kept by default.
NO active movement during combat as dedicated action, but some attacks / buffs may change unit positions, e.g. a knock-back effect.

## 4. Turn structure

- Combat proceeds in **rounds**. Each round, every living unit acts once.
- **One action per unit per turn.** No action-point loops, no "move and shoot in the same turn." Powerful actions are gated by **cooldowns** (see §6).
- Turn order within a ronud is based on the players units. They have an order set by the player in the configuration phase.
- Within a single turn, each unit gets to act exactly once (both player and oponent). The units of both players act interleaved, e.g. "player unit 1 acts", "enemy unit 1 acts", "player unit 2 acts", ...
- A unit's action each turn is determined entirely by walking that unit's gambit list top-to-bottom and executing the first rule whose condition is satisfied. If no rule fires, the unit performs a default `Idle` action (no-op for the round).

### Combat playback

The player does not click during combat. After committing gambits and placement, combat plays automatically:

- The logic layer resolves the round and produces a **turn event log** (see `architecture.md`).
- The rendering layer plays the log back as visual events at a readable pace.
- The player can **pause** and **step** through the playback. Speeds are **0.5×, 1×, 2×, 10×** (see `open-questions.md` Q-G4).
- After combat resolves (one side fully destroyed), the player sees a summary and proceeds to reward selection.
- If all units of the player are dead, the run ends, no reward is offered.

### Starting roster

You start with 2 robots. They are chosen randomly from a pool of robots (similar to new units you can find during a run).
Starter robots differ in their initial HP, number of action slots and modules assigned to them.
These presets are hand crafted to e.g. also include some lore and consistency around them (not only randomly generated).

## 6. Modules

A **module** is an upgrade installed on a single unit. Modules are the run's loot economy and the main way the player customizes.

A module does one of two things:

1. **Buff Module** — more damage, more range, extra target, status effect, lower cooldown, etc. 
2. **Action Module** — adds ability slot of the unit, given actions to the unit.

Rules:

- A unit chassy has a **limited number of module slots**. This makes it important to e.g. also replace chasis (units) in the run if needed. The chasy is fixed.
- Modules are persistent for the duration of the run only — no cross-run carryover in v1.

Adding a new action via a module *literally expands the gambit vocabulary on that specific unit*. This is the core feedback loop between the loot layer and the programming layer: better loot = a richer set of rules you can write.

## 7. The gambit system

Each unit has its own **gambit list** — an ordered list of `IF <condition> THEN <action>` rules. The list is the entirety of that unit's behavior.

### Execution model

Each turn, the unit:

1. Walks its gambit list from top to bottom.
2. Evaluates each rule's condition against the current battlefield state.
3. **Fires the first rule whose condition is true and action can be performed.** Lower rules are not evaluated.
4. Performs the chosen action. The round event log records what happened.

If no rule fires, the unit idles for the turn.

### List size

A unit starts with **4 rule slots** and can earn additional slots through the "+1 rule slot" reward (see §1 Rewards and `open-questions.md` Q-G5).

### Condition vocabulary — [Proposal] v1 starter set

Conditions take a **target** (where applicable) and a **predicate**. Targets are things like *self*, *any enemy*, *nearest enemy*, *lowest-HP ally*, *front-row ally*, etc.

- `self.HP <= X%`
- `target.HP <= X%`
- `target.exists` (e.g., "any enemy in front row exists")
- `target.distance == [close | far]`
- `ally.count <= N` / `enemy.count <= N`
- `self.has_status(<status>)` / `target.has_status(<status>)`
- `always` (unconditional fallback)

### Action vocabulary — [Proposal] v1 starter set

Actions also typically reference a **target**.

- `action(target)` — action on the chosen target. Based on the units actions via modules.

### Cooldowns

Most actions have a **cooldown**: after using the action, it becomes unavailable for N rounds. Strong actions have longer cooldowns.
Actions may affect cooldowns (e.g. buff a different unit).

Cooldowns are how multi-turn impact is delivered without breaking the "one action per turn" rule.

### Authoring UX — [Proposal]

The gambit editor is a list-based UI. For each unit:

- A vertical list of rule slots, ordered by priority.
- Each slot is two pickers: a condition picker and an action picker, each with a target picker where applicable.
- Drag to reorder. Empty slots at the bottom.

The editor is one of the most important pieces of UI in the game and gets significant design attention.

### Enemy gambits

Enemies are driven by the **same gambit interpreter** as player units — they have their own `GambitList`s and run through the same `chooseAction` function (see `architecture.md` §4). One system, authored per-encounter in content data. No parallel AI system. See `open-questions.md` Q-G3.

Hand-authored encounter gambits live alongside the enemy chassis data (in `src/content/` once content loaders land in v0.2).

## 8. Win and loss

- **Win condition for a run:** defeat the final boss of the final act.
- **Loss condition for an encounter:** all of the player's units are destroyed in combat. The run ends.
- **Loss condition for a run:** any encounter loss ends the run. There is no continue, no checkpoint. Roguelike rules.

## 9. Out of scope for v1

To keep v1 shippable, the following are explicitly **not** in scope and live in `roadmap.md` as deferred:

- Meta-progression / between-run unlocks of any kind.
- True grid (sub-slot) positioning.
- Audio beyond basic UI feedback sounds.
- A tutorial system (initial onboarding will be tooltips and a fixed easy first encounter).
