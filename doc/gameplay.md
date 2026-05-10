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

After most nodes (especially combat), the player is offered a **choice of upgrade** drawn from a pool. **v1 reward categories** (see `open-questions.md` Q-G2):

1. A **module drop** — an active or passive module for one of the player's existing units (chassis-agnostic — see §6). *v0.7.*
2. **Remove module** — choose a unit, then choose an installed module to destroy, freeing the slot for a future drop. Cannot remove the last active module (≥1 enforced). A flexibility reward, not a power reward. *v0.7.*
3. A **new unit** added to the squad (up to the cap of 9). Drawn from a **recruitment pool** (distinct from the starter pool; may share content initially). Player picks the empty grid slot.
4. A **heal** — two subtypes: **full-heal one chosen unit** or **partial-heal all living units**.
5. A **vocabulary unlock** — a new condition or action becomes available to write in gambits. *Post-v0.7.*

**v0.6 note:** v0.6 shipped categories 2, 3, and a standalone "+1 rule slot" reward. In v0.7, "+1 rule slot" becomes a passive module drop (category 1), module drops dominate the reward pool, and "remove module" (category 2) adds slot management.

After a combat or elite node, the player is shown **3 random options from the enabled pool** and must pick one (no reroll, no skip — see `open-questions.md` Q-R1). The reward pool is **not filtered for usefulness** — a full-HP squad can still be offered a heal. If a module drop is offered but no unit has a free slot of the matching type, the card is shown but **marked as "no space" and unselectable** — the player must pick one of the other rewards.

Module drops are weighted by a **rarity system**: each module has a `rarity` integer (1–4). Drop weight = `1 / rarity ^ exponent`, where the exponent varies by node type — regular combat uses super-linear scaling (rare items extra unlikely), elite uses linear scaling (fair chance), boss uses sub-linear scaling (tilted toward rare drops). See §6 for the `rarity` field on module definitions.

The boss node currently awards no reward (beating the final boss ends the run). Boss reward scaling is defined for future multi-act runs.

The rewards menu is the primary place where the player decides whether to grow wide (more bodies) or grow deep (stronger existing units).

## 2. Squad and roster

- The player commands **up to 9 robot units**, filling the 3×3 slot grid on their side of the battlefield.
- **No bench, no reserves, no swap-in.** Every owned unit is on the field.
- The player **starts a run by drafting 2 units** (v0.7 starter draft). Two sequential picks: each round shows 3 random presets from the starter pool (no duplicates within the 3 shown), player picks one. The second draw is independent — presets from round 1 (including the chosen one) can reappear. Each preset defines chassis, pre-installed modules, and opening gambits. Presets are deliberately *weak* — the reward loop is what makes the squad grow.
- Starter baseline: **70 HP** and **2 rule slots** per unit (post-T-6.16 balance pass; v0.7 makes both per-chassis via `baseHp` and `baseRuleSlots`). Every starter unit ships with ≥1 active module pre-installed.
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

At run start the player drafts 2 units via two sequential picks (v0.7 starter draft). Each pick shows 3 random presets from the **starter pool**; the player picks one. Draws are independent — the second round can show any preset, including ones from round 1. Starter presets are hand-crafted — each defines chassis, pre-installed active/passive modules, and opening gambits. They differ in HP, slot counts, and module loadout, and include lore and consistency (not randomly generated). The **recruitment pool** (used for mid-run "new unit" rewards) is distinct from the starter pool, though they may share content initially (v0.7: identical).

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

- **Base stats**: `baseHp`, `baseRuleSlots`, `activeSlots`, `passiveSlots` (defined in `src/content/chassis/<id>.json`, v0.7). Chassis differentiate by their stat spread — e.g., a brawler might have high HP and active slots but few passive slots.
- **Silhouette and render**: each chassis has its own render component (`src/render/units/*.tsx`) per the cel-shaded flat-vector style in `setting.md` §4.
- **No inherent attacks** (v0.7+): actions come from chassis-agnostic **active modules** installed in the unit's active slots. See §6. *(v0.5–v0.6 legacy: attacks declared valid chassis via a `chassis[]` whitelist in `attacks.json`.)*

## 6. Modules

> **Status:** The module system lands in **v0.7**. See `roadmap.md` for the full milestone breakdown. Design settled in T-7.1 (2026-05-10).

A **module** is an upgrade installed on a single unit. Modules are chassis-agnostic — any module fits any chassis that has a free slot of the right type. Modules are the run's primary loot economy and the main way the player customizes their squad.

### Slot types

Each chassis has two kinds of slots:

1. **Active slots (1–4 per chassis):** Hold modules that provide actions usable in combat — attacks or heals (v0.7). One active module fires per turn via the gambit system. More active slots = more tactical options, but with diminishing returns since only one fires per turn. The count can be increased by a passive module ("+1 active slot"), with no hard cap.
2. **Passive slots (1–6 per chassis):** Hold modules that grant always-on effects: +HP, +damage, +1 active slot, +1 rule slot, etc. The count is fixed — passive slots cannot be increased.

### Content data layout

Each module is a **single JSON file** in `src/content/modules/<id>.json`. Each chassis is a single JSON file in `src/content/chassis/<id>.json`. This keeps files lean and the folder directly shows available content.

#### Chassis definition (`src/content/chassis/<id>.json`)

```json
{
  "id": "vacuum",
  "name": "Vacuum",
  "availability": "player",
  "baseHp": 70,
  "baseRuleSlots": 2,
  "activeSlots": 2,
  "passiveSlots": 3
}
```

`baseRuleSlots` is the starting number of gambit rule slots (previously a global constant of 2; now per-chassis so chassis can differentiate on programmability). `availability` is `"player"`, `"enemy"`, or `"both"` — a **strict constraint** on which side can use this chassis. Player chassis: `vacuum`, `butler`, `lawnbot`, `security_drone`. Enemy chassis: `qa-rig`, `overseer`, `swarmer`, `siege`.

#### Active module definition (`src/content/modules/<id>.json`)

Active modules are a **union type** discriminated by `actionKind`. Each kind has its own nested properties block, keeping the schema extensible for future action kinds (AoE, debuff, shield, etc.).

```json
{
  "id": "quick_jab",
  "name": "Quick Jab",
  "type": "active",
  "availability": "both",
  "rarity": 1,
  "actionKind": "attack",
  "attackProperties": {
    "damage": 8,
    "cooldown": 0,
    "initialCooldown": 0
  },
  "sound": "quick_jab"
}
```

```json
{
  "id": "patch_kit",
  "name": "Patch Kit",
  "type": "active",
  "availability": "player",
  "rarity": 2,
  "actionKind": "heal",
  "healProperties": {
    "healAmount": 15,
    "cooldown": 2,
    "initialCooldown": 1
  },
  "sound": "patch_kit"
}
```

`sound` is top-level (not inside the properties block) because every active module produces a sound regardless of kind. No `chassis[]` field — fits any active slot.

#### Passive module definition (`src/content/modules/<id>.json`)

```json
{
  "id": "reinforced_plating",
  "name": "Reinforced Plating",
  "type": "passive",
  "availability": "both",
  "rarity": 1,
  "effects": [
    { "kind": "bonus_hp", "value": 15 }
  ]
}
```

v0.7 passive effect kinds: `bonus_hp`, `bonus_damage`, `extra_active_slot`, `extra_rule_slot`. Most passive modules have one effect; the `effects` array allows future multi-effect modules.

All modules carry a `rarity` integer (1–4). Higher rarity = less likely to drop. Enemy-only modules (`availability: "enemy"`) omit `rarity` since they never appear in the reward pool. See §1 Rewards for the drop-weight formula.

### Runtime unit model

Units are **instantiated** from static content at run start (or recruitment) and carry all state as a `UnitInstance` class. No external cooldown maps — cooldowns live on the module instances themselves.

```ts
/** Instance of an active module on a specific unit — carries runtime state */
interface ActiveModuleInstance {
  defId: ActiveModuleId
  cooldownRemaining: number    // 0 = ready to fire
}

/** Instance of a passive module — carries runtime state (empty in v0.7) */
interface PassiveModuleInstance {
  defId: PassiveModuleId
}

class UnitInstance {
  readonly id: UnitId
  readonly side: Side
  slot: SlotRef
  readonly chassis: ChassisId
  hp: number                   // current HP (mutable during combat)
  activeModules: ActiveModuleInstance[]
  passiveModules: PassiveModuleInstance[]
  gambits: GambitList

  // --- Computed stats (derived live from chassis base + passive effects) ---
  get maxHp(): number
  get effectiveActiveSlots(): number
  get ruleSlots(): number
  get bonusDamage(): number

  // --- Module management ---
  canInstallActive(): boolean
  installActive(defId: ActiveModuleId): void
  installPassive(defId: PassiveModuleId): void

  // --- Combat helpers ---
  getAvailableActions(): ActiveModuleInstance[]
  tickCooldowns(): void
}
```

**Key design principles:**
- **No stored derived stats.** `maxHp`, `ruleSlots`, `effectiveActiveSlots`, and `bonusDamage` are always computed by iterating the unit's passive modules against the chassis base. This cleanly supports stacking, mid-run module changes, and future stateful effects (e.g., "+1 HP per round" as passive module instance state).
- **Cooldowns on the instance.** `ActiveModuleInstance.cooldownRemaining` replaces the old `CooldownMap`. Each unit fully represents its own state.
- **Passive instance state is extensible.** `PassiveModuleInstance` is just `{ defId }` in v0.7. Future stateful passives (poison counters, stacking buffs, duration tracking) add fields here without restructuring.

### Heal target selectors

v0.7 ships with ally target selectors: `any_ally` (random alive ally) and `weakest_ally` (lowest current HP). Additional selectors (e.g., `weakest_ally_pct`, positional selectors) are planned as future unlocks — potentially gated behind targeting-upgrade passive modules.

### Availability

All modules and chassis carry an `availability` field: `"player"`, `"enemy"`, or `"both"`. This is a **strict constraint**:

- A player-side unit may only use `"player"` or `"both"` modules and chassis.
- An enemy-side unit may only use `"enemy"` or `"both"` modules and chassis.
- The reward pool only draws from modules available to the player (`"player"` or `"both"`).
- A **unit test** validates all fixtures and presets against this rule to catch authoring errors.

This enables deliberate design: some modules are boss-exclusive (e.g., `siege_cannon`), some are player-exclusive (e.g., `emergency_repair`), and shared modules (`"both"`) create a consistent world where enemies visibly use the same equipment the player can find.

### Rules

- Modules are **chassis-agnostic**: any active module fits any active slot, any passive module fits any passive slot (within availability constraints).
- A chassis has a **fixed number of passive slots** and a **starting number of active slots** (expandable via passive modules).
- Modules are persistent for the duration of the run only — no cross-run carryover in v1.
- Every unit must have ≥1 active module installed at all times (enforced by starter presets and recruitment pool).
- Duplicate passive modules are allowed on the same unit (e.g., two `reinforced_plating` for +30 HP). Slot cost is the natural limit.

### Core feedback loop

Adding a new active module *literally expands the gambit vocabulary on that specific unit*: the player gains a new action to write rules around. This is the core feedback loop between the loot layer and the programming layer — better loot = a richer set of rules you can write.

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
