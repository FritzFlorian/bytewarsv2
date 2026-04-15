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
| **Elite** | Harder combat encounter against a tougher enemy squad (v0.6: 4 hand-authored fixtures). The elite-only **Siege** enemy appears in 2 of the 4. Reward pool is weighted toward +unit and +rule slot. Map gen places ~2 per map. |
| **Boss** | Act-ending encounter. Unique enemy composition. Awards no reward — victory screen only. |
| **Repair Bay** | Heal all living units for a fixed percentage of max HP (starting at 50%, tuned during v0.6). See `open-questions.md` Q-G6. |


### Rewards

After most nodes (especially combat), the player is offered a **choice of upgrade** drawn from a pool. **v1 has five reward categories** (see `open-questions.md` Q-G2):

1. A **new module** for one of their existing units (class-locked — see §6). *Post-v0.6.*
2. A **new unit** added to the squad (up to the cap of 9). Drawn from the starter preset pool; player picks the empty grid slot.
3. A **heal** — two subtypes: **full-heal one chosen unit** or **partial-heal all living units**.
4. **+1 rule slot** for a chosen unit, up to a cap of 6.
5. A **vocabulary unlock** — a new condition or action becomes available to write in gambits. *Post-v0.6.*

v0.6 ships categories 2, 3, and 4; modules and vocabulary unlocks land in later versions. After a combat or elite node, the player is shown **3 random options from the enabled pool** and must pick one (no reroll, no skip — see `open-questions.md` Q-R1). The reward pool is **not filtered for usefulness** — a full-HP squad can still be offered a heal. The boss node awards no reward; beating it ends the run with the victory screen.

The rewards menu is the primary place where the player decides whether to grow wide (more bodies) or grow deep (stronger existing units).

## 2. Squad and roster

- The player commands **up to 9 robot units**, filling the 3×3 slot grid on their side of the battlefield.
- **No bench, no reserves, no swap-in.** Every owned unit is on the field.
- The player **starts a run with 2 units**, each drawn randomly from a hand-authored **starter preset pool** (one preset per draw; presets define chassis, starting HP, rule slot count, and opening gambits). Presets are deliberately *weak* — the reward loop is what makes the squad grow.
- Starter baseline: **70 HP** and **2 rule slots** per unit (post-T-6.16 balance pass). Rewards push both upward (heal, +1 rule slot).
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
- Turn order within a round is based on the player's units. They have an order set by the player in the configuration phase.
- Within a single turn, each unit gets to act exactly once (both player and opponent). The units of both players act interleaved, e.g. "player unit 1 acts", "enemy unit 1 acts", "player unit 2 acts", ...
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

## 5. Chassis and classes

A **chassis** is the physical body a unit inhabits. It determines silhouette, base stats, and (currently) the pool of attacks that unit can use. "Class" and "chassis" are used interchangeably.

### Roster

**v1 roster — 4 player chassis + 4 enemy chassis** (see `setting.md` §3 and `open-questions.md` Q-S2, Q-R7):

| Role | Chassis | Status | Flavor |
|---|---|---|---|
| Player | **Vacuum** | v0.1 | Low, round, fast, fragile. Front-line scout. |
| Player | **Butler** | v0.1 | Humanoid, balanced, social-features-turned-utility. |
| Player | **Lawnbot** | v0.6 | Bulky, treaded, durable. Front-line tank. |
| Player | **Security-drone** | v0.6 | Flying/wall-mounted, ranged, fragile. |
| Enemy | **QA-Rig** | v0.1 | Industrial test rig; Assembly Floor baseline. |
| Enemy | **Overseer** | v0.4 | Larger, heavier; Assembly Floor boss. |
| Enemy | **Swarmer** | v0.6 | Low-HP pressure unit; appears in groups. |
| Enemy | **Siege** | v0.6 (elite-only) | Heavy frame with a long-cooldown devastating attack. |

Additional chassis (Kitchen-arm, delivery cart, pool cleaner, etc.) are deferred to post-v1 per `setting.md` §3.

### What a chassis provides

- **Base stats**: starting HP, rule-slot count (starter baseline 2, cap 6 — see §7).
- **Silhouette and render**: each chassis has its own render component (`src/render/units/*.tsx`) per the cel-shaded flat-vector style in `setting.md` §4.
- **Attack pool**: *current model* (v0.5\u2013v0.6) — each attack declares which chassis it's valid for via a `chassis[]` whitelist in `src/content/attacks.json`. The gambit editor filters attacks per unit's chassis. *Future model* (v0.7+, see `roadmap.md` idea bucket) — chassis provide only base stats + slot counts; attacks come from chassis-agnostic modules. §6 describes the future model.

## 6. Modules

> **Status:** Modules are **post-v0.6**. The v0.7+ idea bucket in `roadmap.md` reworks the module system (chassis-agnostic attack modules, base+max slots growing via buff modules, vocabulary unlocks as a buff-module kind). The section below captures the original v1 intent and is kept as design context; expect revision when modules actually land.

A **module** is an upgrade installed on a single unit. Modules are the run's loot economy and the main way the player customizes.

A module does one of two things:

1. **Buff Module** — more damage, more range, extra target, status effect, lower cooldown, etc. 
2. **Action Module** — adds an ability slot to the unit, giving a new action.

Rules:

- A chassis has a **limited number of module slots**. This makes it important to also replace chassis (units) in the run if needed; the chassis itself is fixed once the unit joins.
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

A unit starts with **2 rule slots** and can earn additional slots through the "+1 rule slot" reward up to a **cap of 6** per unit (see §1 Rewards and `open-questions.md` Q-G5, Q-R2).

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

Hand-authored encounter gambits live in `src/logic/content/fixtures.ts` (walking-skeleton + boss fixtures today; Elite fixtures land in v0.6).

## 8. Win and loss

- **Win condition for a run:** defeat the final boss of the final act.
- **Loss condition for an encounter:** all of the player's units are destroyed in combat. The run ends.
- **Loss condition for a run:** any encounter loss ends the run. There is no continue, no checkpoint. Roguelike rules.

## 9. Out of scope for v1

To keep v1 shippable, the following are explicitly **not** in scope and live in `roadmap.md` as deferred:

- Meta-progression / between-run unlocks of any kind.
- True grid (sub-slot) positioning.
- A tutorial system (initial onboarding will be tooltips and a fixed easy first encounter).
