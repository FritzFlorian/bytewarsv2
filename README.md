# Bytewars

A roguelike auto-battler where you program robot squads with gambit-style priority rules, then watch the fights unfold. No manual control — write the plan, commit, watch it execute.

**[Play now →](https://fritzflorian.github.io/bytewarsv2/)**

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit/integration tests (Vitest, node + jsdom) |
| `pnpm typecheck` | TypeScript type-check without emitting |
| `pnpm e2e` | Run browser tests (Playwright, headless Chromium — auto-starts dev server) |
| `pnpm check` | Full check: `test` + `typecheck` + `e2e` |
| `pnpm lint` | Run ESLint |
| `pnpm pages` | Build and deploy to GitHub Pages (`gh-pages` branch) |

## Current State

<!-- CURRENT_STATE:START -->
The full run loop is playable end-to-end with rewards, elite encounters, repair bays, and eight chassis.

**Map screen** — a seeded branching node graph with distinct shapes, colors, and icons per node type: regular **Combat** (⚔), **Elite** (♦, ~2 per map, harder hand-authored fixtures), **Repair Bay** (+, ~1 per map, partial-heal-all on entry, no fight), and **Boss** (★).

![Map screen](doc/screenshots/readme/map.png)

**Gambit editor** — author priority rules for each unit before every fight. Conditions and actions are searchable dropdowns; the action picker shows only attacks valid for the selected unit's chassis with damage and cooldown info. Slots drag to reorder. Each unit's `ruleSlots` cap is honored: rows beyond the unit's current cap render as locked placeholders, unlockable via the **+rule-slot** reward (cap 6).

![Gambit editor](doc/screenshots/readme/editor.png)

**Combat screen** — fights resolve automatically from your gambit lists. Each chassis has its own named attacks (Quick Jab, Sweep, Taser, Overload, Clamp, Suppression, Dart, Pulse Shot, …) with per-attack damage, cooldowns, and synthesized sounds; the interpreter falls through silently when a rule's attack is on cooldown. Active unit is highlighted, target indicators animate between attacker and target, a scrolling log tracks every action. Play, pause, step, or fast-forward at 0.5×–10×.

![Combat screen](doc/screenshots/readme/combat.png)

**How to play:**
1. `pnpm install && pnpm dev`
2. Open [http://localhost:5173](http://localhost:5173)
3. The map loads automatically — click a reachable node to enter the gambit editor (combat/elite) or apply the heal (repair bay)
4. Author rules for each unit, click **Run**
5. Watch the fight play out; when it ends click **Continue →**, then pick one of three rewards (heal-one / heal-all / +rule-slot / new-unit drawn from the starter pool) before returning to the map
6. Reach and defeat the boss (★) to win the run — or lose all units and get a game-over

**Squad persistence:** surviving units carry their HP between fights. A unit destroyed in fight N sits out fight N+1 and returns at 42% HP for fight N+2.

**Eight chassis** ship today: five players (**Vacuum**, **Butler**, **QA-Rig**, **Lawnbot**, **Security-drone**), the **Overseer** boss, **Swarmer** (regular pool), and **Siege** (elite encounters only). See the [Chassis](#chassis) section below for per-chassis attack stats.

**Starter preset pool:** each new run draws 2 random starters at 70 HP / 2 rule slots from `src/content/starter-presets.json`. Attack stats live in `src/content/attacks.json`. Both are Zod-validated and editable to add, remove, or retune content.

**Debug pages** (dev server only):
- `/?debug=units` — renders all chassis components side-by-side
- `/?debug=scene` — plays a hand-written fixture through the render layer
- `/?debug=audio` — synth playground for per-attack sounds and music
- `/?preview=chassis` — chassis overview page used to regenerate the cards below

<sub>Screenshots and description auto-maintained — run `/refresh-readme` to refresh.</sub>
<!-- CURRENT_STATE:END -->

## Chassis

<!-- CHASSIS:START -->
<table>
  <tr>
    <td><img src="doc/screenshots/chassis/vacuum.png" alt="Vacuum" width="430"/></td>
    <td><img src="doc/screenshots/chassis/butler.png" alt="Butler" width="430"/></td>
  </tr>
  <tr>
    <td><img src="doc/screenshots/chassis/qa-rig.png" alt="QA-Rig" width="430"/></td>
    <td><img src="doc/screenshots/chassis/overseer.png" alt="Overseer" width="430"/></td>
  </tr>
  <tr>
    <td><img src="doc/screenshots/chassis/lawnbot.png" alt="Lawnbot" width="430"/></td>
    <td><img src="doc/screenshots/chassis/security_drone.png" alt="Security-drone" width="430"/></td>
  </tr>
  <tr>
    <td><img src="doc/screenshots/chassis/swarmer.png" alt="Swarmer" width="430"/></td>
    <td><img src="doc/screenshots/chassis/siege.png" alt="Siege" width="430"/></td>
  </tr>
</table>

<sub>Stats are rendered inside each card. Auto-generated — run `/refresh-readme` to refresh.</sub>
<!-- CHASSIS:END -->

## What's Next (v0.5)

- **Named attacks** — replace the generic `attack` action with a roster of chassis-specific named attacks (Quick Jab, Sweep, Taser, Overload, Clamp, Suppression), each with distinct damage values and synthesized sounds
- **Cooldowns** — attacks with higher damage have longer cooldowns; some have an initial warmup before they're available; the gambit interpreter falls through silently to the next rule when an attack is on cooldown
- **Chassis-filtered editor** — the action picker only shows attacks valid for the selected unit's chassis

See `doc/roadmap.md` for the full task breakdown.
