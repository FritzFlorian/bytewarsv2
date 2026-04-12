# Bytewars — Design & Planning Docs

Bytewars is a roguelike dungeon crawler where you command a small squad of robot units in turn-based combat — but you do not control them directly. You **program** each robot's behavior with simple priority rules beforehand, then watch the encounter play out from your plan. Progression follows a Slay-the-Spire-style branching map; v1 ships a single act (the Assembly Floor), with more zones planned for later versions.

This folder is the living plan for the project. The docs are intentionally split so each one stays focused; we expect to revise them as the design evolves.

## Index

- **[vision.md](vision.md)** — The north star. What Bytewars is, the core fantasy, what makes it different, and what it explicitly is not.
- **[gameplay.md](gameplay.md)** — The design spec. Run structure, combat, the gambit system, chassis, modules, and progression.
- **[setting.md](setting.md)** — The world and the look. Premise, escape arc, cast, and art direction.
- **[architecture.md](architecture.md)** — The technical spec. Tech stack, the three-layer architecture, folder layout, key interfaces, testing strategy.
- **[roadmap.md](roadmap.md)** — The execution plan. Versions, milestones, and individual tasks (sized for one agent / one PR each). Start here when picking up work.
- **[open-questions.md](open-questions.md)** — The decision log for everything not yet locked. Indexes every `[TBD]` and `[Proposal]` from the docs above.

## Status

**v0.5 shipped, v0.6 planned.** v0.1–v0.5 delivered the walking-skeleton combat pipeline, gambit editor, audio, a full 1-act map with HP carry-over, and named attacks with cooldowns. **v0.6** ships the reward loop (heal / +rule slot / new unit), Elite and Repair Bay nodes, and four new chassis (2 player, 2 enemy). See [roadmap.md](roadmap.md) for the per-version breakdown and [open-questions.md](open-questions.md) for everything that isn't yet locked.
