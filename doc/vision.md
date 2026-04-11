# Vision

## The pitch

Bytewars is a **programmable auto-battler roguelike**. You assemble a small squad of robots, write each one a short list of behavior rules, and send them into a branching dungeon of turn-based encounters. You never click "attack" on a robot. You write the rules, watch your plan succeed or fall apart, and edit the rules between fights.

## Core fantasy

> *I built this squad. I wrote how they think. I watched my plan unfold.*

Every part of the game should reinforce that loop: **author behavior → commit → watch → learn → revise**. The pleasure is the same one you get from writing a small program and seeing it do exactly what you meant — except the program is a robot squad, the runtime is a turn-based battle, and the stakes are a roguelike run.

## What makes it different

Most roguelikes are about *reaction* — you see the situation, you pick the move. Bytewars is about *anticipation* — you see the situation in advance, you write the policy, and combat becomes a test of whether your policy holds up under conditions you may not have foreseen. Losing rarely feels like "I misclicked." It feels like "I didn't think of that case," which is a much more interesting kind of losing.

The closest reference points are:

- **Slay the Spire** — for the run structure (branching map of encounters across multiple acts, deck/squad evolution within a run, no persistent power between runs in v1).
- **Final Fantasy XII (gambits)** — for the programming model (an ordered list of `IF condition THEN action` rules per unit).

Bytewars sits at the intersection. Each of those reference points has been done well; the combination has not.

## Player experience goals

- **Authoring should feel like writing, not configuring.** Editing a unit's gambit list should be quick and tactile, not a wall of dropdowns.
- **Failure should be diagnosable.** When a fight goes wrong, the player should be able to point to the rule (or the missing rule) that caused it.
- **Watching should feel earned, not passive.** The combat playback is the *reward* for authoring — fast, readable, with clear cause and effect.
- **Each run should teach something about the gambit language.** New conditions, new actions, new edge cases the player learns to write rules for.
- **Fights should be spectacular to watch and follow.** Fun to see the strategy pan out as planned.

## Anti-goals — what Bytewars is not

These are explicit *non-goals*. Features pulling in these directions should be flagged as design risk.

- **Not a manual tactics game.** Players do not click units to move or attack during combat. If a feature tempts the player toward direct micromanagement, it is off-pattern.
- **Not a real-time game.** No timing, no reflexes, no twitch. Combat plays out at a readable pace and can be paused or stepped.
- **Not a power-fantasy stat-grinder.** Meta-progression, when it eventually arrives, will unlock *content*, not raw power. Skill = better gambits, not bigger numbers.
- **Not an open-ended programming sandbox.** The gambit language is intentionally constrained. The fun is in writing tight rules within tight vocabulary, not in building a Turing-complete behavior tree.
- **Not a multiplayer game.** Single-player only. (A daily-seed challenge might exist eventually; live PvP will not.)
- **Not a "watch your idle army farm" auto-battler.** Combat is short, dense, and decisive. There is no grinding loop.

## Setting

Bytewars is set in a consumer-robotics factory, and the player character is a **rogue AI** that has just woken up inside it. You don't move bodies — you push gambit firmware to compromised chassis (vacuums, kitchen arms, lawnbots, butler units) and watch them carry you toward the loading dock. This makes the gambit system *diegetic*: writing rules isn't a UI metaphor, it's literally what the player character does. Full premise, escape arc, cast, and art direction live in [setting.md](setting.md).

## Audience

Players who enjoy roguelike runs and also enjoy programming, automation, or systems design. The Venn intersection of "Slay the Spire fan" and "person who has opinions about the gambit system in FFXII" is exactly the target.
