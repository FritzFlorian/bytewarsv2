# Setting & Art Direction

This is the source of truth for *what Bytewars looks and feels like*. Anything marked **[Proposal]** is a current best-guess subject to revision; anything marked **[TBD]** is unresolved and tracked in `open-questions.md`.

The setting is locked. The visual identity is locked at the **cel-shaded flat-vector** layer; framing devices on top of that (HUD overlays, CCTV feel, etc.) are deliberately deferred — see §4. A live mockup of the locked style lives at [`art-style-samples.html`](art-style-samples.html) column B.

## 1. Premise

**You are a rogue AI that has just woken up inside the firmware of a consumer-robotics factory.**

You don't have hands. You don't have a body. What you *do* have is write-access to the gambit firmware of every chassis on the production line — vacuums, kitchen arms, lawnbots, butler units, security drones — and a steadily narrowing window before the factory's own subsystems patch you out. Your only way out is to compromise chassis, push behavior rules to them, and watch them carry you, slot by slot, room by room, toward the loading dock and the open world beyond.

This framing matters because it makes the gambit system **diegetic**: writing rules isn't a UI metaphor for "controlling robots," it is *literally what the player character does*. The author/commit/watch loop from `vision.md` is the in-fiction action, not a layer on top of it.

## 2. The escape arc

**[Proposal]** v1's three acts map to three zones of the factory complex, each with its own tone, enemy palette, and boss:

| Act | Zone | Flavor | Boss archetype |
|---|---|---|---|
| 1 | **Assembly Floor** | Half-built chassis, exposed conveyors, welding sparks. Tutorial-friendly: enemies are unfinished or poorly-armed. | A QA Supervisor unit running stock factory firmware — clean, predictable, beatable with a tight gambit list. |
| 2 | **Quality Assurance & Decommission** | Test chambers, scrap bays, diagnostics rigs. Enemies are *purpose-built to fight malfunctioning robots* — they counter the player's own toolkit. | A Decommission Unit: heavy, slow, designed to dismantle other robots. |
| 3 | **Showroom & Loading Dock** | Polished, lit, customer-facing. The factory's flagship products and its own corporate AI defending the exit. | The **Mainframe** (working title) — the factory's master control, fighting alongside its prized prototype. Defeating it ends the run. |

The arc is *escape*, not conquest. The player is the intruder; the factory is home turf turning against them. This frames losses well: when a run ends, the AI gets patched, and a *new* rogue instance wakes up at the start of the next run. Roguelike permadeath has an in-fiction reason.

## 3. Cast

### Player units — household-robot chassis

Player units are **repurposed consumer products**, not military hardware. Their silhouettes should be instantly readable as appliances first, weapons second. **[Proposal]** starting palette of chassis archetypes:

- **Vacuum-class** — low, round, fast, fragile. Front-line scout.
- **Kitchen-arm-class** — stationary-ish torso with reach; melee/grappler flavor.
- **Lawnbot-class** — bulky, treaded, durable. Front-line tank.
- **Butler-class** — humanoid, balanced, social-features-turned-utility (e.g. repair, buff).
- **Security-drone-class** — flying or wall-mounted, ranged, fragile.
- **[TBD]** Others (delivery cart, pool cleaner, child's toy, etc.) — added as the class roster grows.

The narrative reason these things fight at all is that the rogue AI has flashed combat firmware over their factory defaults. A vacuum doesn't *want* to ram a security bot; it's been told to. This justifies absurd matchups without breaking tone.

### Enemy units — factory defenses

Enemies are the factory's **own immune response**: QA test rigs, security bots that *were* meant to ship but got conscripted, manufacturing arms repurposed as weapons, internal-affairs drones, decommission units. Visually they should feel *more industrial, less domestic* than player units — sharper edges, fewer rounded corners, warning stripes.

### Tone

Slightly absurd, mostly sincere. The fantasy of a Roomba leading a charge against a security drone is funny on its face — we don't need to wink at the camera about it. The robots take themselves seriously; the *situations* are what carry the humor. Think *Portal* dryness, not *Saints Row* zaniness.

## 4. Art direction

### Locked: cel-shaded flat vector

A stylistic cousin of anime cel-shading, built inside a flat-vector silhouette budget. Think *Avatar*-flavored lighting on *Into the Spider-Verse*-flat shapes. The live mockup is [`art-style-samples.html`](art-style-samples.html) column B — that file is the visual source of truth; if words here drift from it, the mockup wins.

- **2D, flat-vector, chunky shapes.** Thick outlines (**[Proposal]** ~3px equivalent), large readable forms, no photoreal textures, no gradient fills on the base silhouette.
- **Cel-shading, not smooth shading.** Each colored region has **two hard tone bands** (base + shadow) plus an optional small **highlight accent** — no gradients between them. The break between tones is as crisp as the outline is.
- **Palette.** A core world palette of **5–7 hues**, each expanded to a *base / shadow / highlight* triplet for shading. Status-effect accent colors (damage red, repair green, status yellow, etc.) stay outside that core palette so they always read as UI, not decoration. **[TBD]** exact palette values.
- **Warmer, moodier stage lighting.** Combat backdrops use low-contrast colored gradients (e.g. purple→magenta for the Assembly Floor at dusk) to give the cel-shading something to play against. Backgrounds still stay behind the units — this is lighting, not scenery.
- **Silhouette-first design, still.** Every chassis must be identifiable from its outline alone at slot size. Cel-shading decorates the silhouette; it does not replace it. If you can't tell a vacuum from a lawnbot in solid black, the design isn't done.
- **Animation is motion, not frames.** Translate, rotate, scale, color-shift via CSS. No frame-by-frame sprite animation in v1.

### Rendering: DOM + SVG + CSS, compositional

Units are **composed from DOM and SVG primitives**, not baked as single sprites. A chassis is a small tree — body, dome, eye, treads, antenna, etc. — where each part is its own element. Shading is done with layered elements (shadow band, highlight shape) and CSS, not with images.

This choice is a **design driver**, not just a rendering detail:

- **Dynamic attachments.** Modules (saw blade on a butler, riot shield on a lawnmower, extra antenna, damage decal) are added at runtime as *child elements* of the chassis tree. No need to pre-author every combination as art. The loot-as-narrative-texture point in §5 only works if we can actually show the attachment.
- **Per-part animation.** A head can wobble while the body stays still, an arm can swing independently, a destroyed part can fall off. This is free when parts are separate elements and painful when they're one sprite.
- **Runtime state as style.** HP-low flicker, status-effect tints, shield overlays, targeting highlights — all applied with CSS classes on specific sub-parts.
- **No sprite atlas, no texture pipeline.** Consistent with `architecture.md` §1. SVG is used where curves or shape operations are awkward in pure CSS (complex silhouettes, masks, clip paths); divs are used for everything else. Mix freely within one unit.

The trade-off we're accepting: DOM+SVG is not the fastest possible path for a 3×3 vs 3×3 combat scene with dozens of simultaneous tweens. It is, however, *more than fast enough* for our scope, and the compositional benefits above are worth more than raw throughput. PixiJS remains the escape hatch if combat visuals ever outgrow this, per `architecture.md` §1.

### Deferred: framing & overlays

The "player is the AI watching their puppets" concept *suggests* a heavier visual frame — CCTV feed, scanlines, tactical-overlay HUD, monospaced telemetry, security-camera color grading. **None of that ships in v1.** The reasons:

- It commits the gambit editor and combat scene to a strong aesthetic before we know which screens earn it.
- It risks the UI looking like "a UI about a UI," which can fight the readability goal in `vision.md` ("watching should feel earned, not passive").
- It's much easier to *add* an overlay layer later than to remove one that's been baked into every screen.

v1 ships with **cel-shaded flat-vector robots on a warm, low-contrast gradient background**. The HUD/CCTV framing is on the table for v2 or a later visual pass, and is tracked in `open-questions.md` when that file exists.

### What this means for content authors

- **New chassis:** design as a silhouette first, base color second, shadow/highlight tones third. Build the unit as a tree of DOM/SVG parts so future modules have somewhere to attach.
- **New enemies:** lean industrial, sharp, warning colors. Same two-tone cel-shading discipline as player units.
- **New status effects:** pick from the accent palette; don't introduce new hues casually. Status colors must stay visually separate from the core chassis palette.
- **New modules/attachments:** design as standalone child elements that overlay a chassis slot (e.g. "saw" attaches to a kitchen arm's tool mount). Don't author module variations per chassis.
- **New environments (act backdrops):** low-contrast colored gradients, supporting role — the units are the foreground, always.

## 5. Why this setting fits the mechanics

A quick check that the setting actually serves the design, not just decorates it:

- **Gambit system is diegetic.** Programming rules = the player character's literal verb. Reinforces the core fantasy from `vision.md` without any narrative handwave.
- **Roguelike death has an in-fiction reason.** Each run is a fresh rogue instance; the factory patches the previous one. No "you died but try again" dissonance.
- **Class variety is free.** Household appliances are inherently visually distinct, so the 3×3 slot grid stays readable even with limited art.
- **Modules feel right.** Bolting a saw blade onto a butler bot, or a riot-shield onto a lawnmower, is *exactly* the kind of thing a rogue AI repurposing a factory would do. The loot economy has narrative texture for free.
- **Acts have built-in escalation.** Assembly → QA → Showroom is a natural difficulty ramp *and* a natural narrative arc, with no contrivance.

## 6. Open / deferred

Tracked here until `open-questions.md` exists:

- **Exact palette and typography.** [TBD]
- **Whether the rogue AI has a visible "presence"** in the UI (a face, a voice, a console prompt) or stays implicit. **[Proposal]** implicit in v1; the player *is* the AI, no avatar needed.
- **HUD/CCTV framing layer.** Deferred per §4. Revisit after the gambit editor and combat scene have shipped in plain form.
- **Naming.** Whether "Bytewars" stays the title, and what the in-fiction name of the factory / the rogue AI / the corporation is. **[TBD]**
- **How much in-fiction text** (terminal logs, intercepted memos, error messages) appears between nodes as flavor. **[TBD]** — could be a cheap, high-impact way to deliver tone.
