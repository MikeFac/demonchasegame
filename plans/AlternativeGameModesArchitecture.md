# Alternative Game Modes Architecture

## Purpose

This document defines how to add alternative game designs to VerseBattles without disturbing the main dungeon game loop or core functionality.

The goal is to make it safe to build modes such as:

- wave assault
- boss duel
- lane defense
- rhythm-based verse play
- puzzle or tactics variants
- other experimental learning modes

The guiding principle is simple:

`new modes should be isolated, not interwoven`

## Conclusion Up Front

Yes, the codebase can support alternative game designs safely.

The existing wave mode already proves the pattern:

- separate launcher
- separate renderer
- separate engine
- separate input path
- explicit mode switch in the main shell

This is the right direction and should be formalized.

## Current Evidence In The Codebase

The current wave mode is a good precedent:

- [src/client/WaveGameLauncher.js](/home/michael/proj/dcgame/src/client/WaveGameLauncher.js)
- [src/client/WaveRenderer.js](/home/michael/proj/dcgame/src/client/WaveRenderer.js)
- [src/shared/WaveGameEngine.js](/home/michael/proj/dcgame/src/shared/WaveGameEngine.js)

The main shell also already respects mode boundaries:

- [game.js](/home/michael/proj/dcgame/game.js)

In particular:

- `window.gameMode` controls which high-level flow is active
- the main `gameLoop()` exits early for `waveGame`
- overland and review also already behave as separate mode-level flows
- `LocalNetwork` can launch a separate local engine for wave mode

This means the project is not locked into a single monolithic gameplay loop.

## Core Rule

Alternative modes should be added as self-contained modules that plug into the shell.

They should not require widespread branching logic inside:

- the main dungeon combat loop
- the main dungeon renderer
- the default input handler
- unrelated mission/review code

If a new design requires dozens of `if (mode === ...)` branches in the base loop, the design is being integrated incorrectly.

## Recommended Architecture

Each alternative mode should have five clear pieces:

### 1. Mode Launcher

Responsible for:

- entering the mode
- preparing canvas/UI state
- wiring engine, renderer, and input
- handling teardown
- returning to menu or overland

Example precedent:

- [src/client/WaveGameLauncher.js](/home/michael/proj/dcgame/src/client/WaveGameLauncher.js)

### 2. Mode Engine

Responsible for:

- gameplay state
- update loop
- win/loss conditions
- combat or puzzle rules
- emitting state/events

The engine should not know about DOM details.

Example precedent:

- [src/shared/WaveGameEngine.js](/home/michael/proj/dcgame/src/shared/WaveGameEngine.js)

### 3. Mode Renderer

Responsible for:

- drawing visuals
- mode-specific HUD
- transient feedback
- special overlays relevant to that mode

It should consume state from the engine and draw it. It should not own game rules.

### 4. Mode Input Adapter

Responsible for:

- keyboard mapping
- pointer/touch mapping
- mode-specific interaction rules

This should be isolated because alternative modes often require very different control schemes.

### 5. Mode Registration / Shell Entry

Responsible for:

- exposing the mode to menus, missions, or URLs
- setting the active game mode
- delegating launch to the correct module

## Proposed Interface

Formalize a lightweight mode contract.

Each mode should implement something close to:

```javascript
{
  id: 'wave',
  start(context) {},
  stop() {},
  pause() {},
  resume() {},
  handleResize() {},
  getState() {}
}
```

The exact method list can stay small, but the important part is that every mode owns its own lifecycle.

## Suggested File Structure

For each new mode, use a consistent structure:

```text
src/client/modes/<ModeName>Launcher.js
src/client/modes/<ModeName>Renderer.js
src/shared/modes/<ModeName>Engine.js
src/shared/modes/<ModeName>Config.js
```

Examples:

```text
src/client/modes/BossDuelLauncher.js
src/client/modes/BossDuelRenderer.js
src/shared/modes/BossDuelEngine.js
src/shared/modes/BossDuelConfig.js
```

This is preferable to scattering mode files across unrelated folders.

## What Should Be Shared

Shared systems are good when they are stable primitives.

These are good candidates for reuse across modes:

- quiz generation logic
- verse/content loading
- mission content loading
- analytics
- progress persistence
- audio/music services
- localization
- common effects utilities
- shared constants where they are truly cross-mode

This keeps learning systems and product systems consistent across designs.

## What Should Not Be Shared Blindly

These should only be reused if the design genuinely matches them:

- dungeon-specific enemy behavior
- default combat timing
- map and wall logic
- main movement handler
- dungeon HUD layout
- assumptions about level progression

If a mode has different spatial rules or pacing, it should get its own engine behavior rather than trying to reuse the dungeon engine with many flags.

## Integration Strategy

There are two safe ways to attach a new mode.

### Option A: Menu-Launched Standalone Mode

Best for:

- arcade experiments
- prototypes
- challenge modes
- limited-time modes

Flow:

1. user selects mode from menu
2. shell sets active mode
3. launcher starts isolated engine/renderer/input
4. mode exits back to menu

### Option B: Mission-Backed Alternative Mode

Best for:

- authored content
- chapter/world content
- modes tied to progression

Flow:

1. mission metadata declares a `missionType`
2. mission launch resolves to a mode launcher
3. shared progression and rewards still work
4. end-of-run returns to overland/review

This is already partially aligned with the current use of `missionType`.

## Rules For Safe Isolation

### Rule 1: One Owner Per Loop

Each mode should own its own engine update loop and renderer loop behavior.

The main shell should orchestrate mode switching, not contain all mode logic.

### Rule 2: Explicit Lifecycle

Every mode must support clean:

- start
- stop
- pause
- resume

Without this, state leaks between modes become likely.

### Rule 3: No Shared Global Mutation Without Ownership

Avoid ad hoc writes to global state such as:

- `window.gameMode`
- global input handlers
- canvas listeners
- shared audio state

These can still be used, but only through clear enter/exit ownership.

### Rule 4: Reuse Learning Systems, Not Spatial Assumptions

The scripture-learning layer should be shared.
The physical gameplay rules should be mode-local.

### Rule 5: Teardown Must Be First-Class

When a mode ends, it must clean up:

- animation frames
- intervals
- event listeners
- overlay DOM
- transient callbacks
- engine references

Wave mode already demonstrates much of this cleanup pattern.

## Anti-Patterns To Avoid

These are the main ways the architecture would degrade.

### Anti-Pattern 1: Branch Explosion In `game.js`

Bad:

- adding many mode-specific branches throughout combat, rendering, and input code

Why it is bad:

- every new mode increases risk to the main game
- debugging becomes slower
- regressions become more likely

### Anti-Pattern 2: One Engine With Dozens Of Flags

Bad:

```javascript
new GameEngine({
  mode: 'boss',
  noWalls: true,
  noPickupDrops: true,
  horizontalOnly: true,
  alternateScoring: true,
  ...
});
```

Why it is bad:

- the base engine becomes a grab-bag of exceptions
- behavior coupling becomes hard to reason about

### Anti-Pattern 3: Shared Input Handler For Incompatible Modes

Bad:

- making the standard input handler understand every experimental interaction model

Why it is bad:

- input complexity grows faster than gameplay complexity
- mobile and desktop behavior become fragile

### Anti-Pattern 4: Shared HUD For Different Rule Sets

Bad:

- forcing all modes through one renderer/HUD path

Why it is bad:

- UI becomes cluttered with conditional rendering
- mode-specific clarity gets worse

## Recommended Refactor Before Adding Many More Modes

The current architecture is workable, but a small cleanup would make future mode work safer.

### Suggested Step 1: Formalize a `ModeManager`

Create a small shell-level manager responsible for:

- current mode registration
- start/stop transitions
- pause/resume routing
- resize routing

Example responsibility:

```javascript
ModeManager.register(modeDefinition);
ModeManager.start('wave', context);
ModeManager.stopCurrent();
```

### Suggested Step 2: Normalize Mode IDs

Use a stable naming convention such as:

- `menu`
- `overland`
- `review`
- `soloDungeon`
- `wave`
- `bossDuel`

This is clearer than mixing shell state with ad hoc feature names.

### Suggested Step 3: Move New Modes Into `src/client/modes` and `src/shared/modes`

This avoids mode code spreading across unrelated directories.

### Suggested Step 4: Standardize Return Contracts

Every mode should return through a small set of outcomes:

- `returnToMenu`
- `returnToOverland`
- `goToReview`
- `retryMode`

That reduces mode-specific exit logic.

## How New Designs Should Be Evaluated

Before implementing a new alternative design, ask:

1. Does it need different spatial rules than the dungeon game?
2. Does it need different controls?
3. Does it need a different HUD?
4. Does it need different pacing or win/loss rules?

If the answer is yes to several of these, it should probably be a separate mode engine.

If the new feature mostly reuses:

- movement
- combat
- HUD
- mission structure

then it may belong as an extension of the main dungeon mode instead.

## Example Candidates

These are good fits for isolated alternative modes:

- wave survival
- boss duel arena
- verse-defense mode
- timing/rhythm memorization mode
- scripture sorting or puzzle mode

These are more likely to belong inside the main mode:

- new demon types
- new pickups
- new dungeon map styles
- new mission configs
- new quiz variants that do not change core moment-to-moment play

## Rollout Plan

### Phase 1: Architecture Guardrails

- write this design down
- adopt naming conventions
- keep new modes isolated

### Phase 2: Shell Cleanup

- add a small `ModeManager`
- centralize lifecycle transitions
- centralize resize and pause routing

### Phase 3: Next Experimental Mode

Build the next alternative mode using the full isolation pattern from day one.

Do not prototype it by branching through the main dungeon loop first and "cleaning it up later."

### Phase 4: Shared Service Extraction

As multiple modes accumulate, extract only the truly shared systems:

- learning content
- analytics
- progress
- audio
- rewards

Do not over-abstract prematurely.

## Recommendation

Yes, alternative game designs should be pursued, but under one rule:

`treat them as plugin-like modes, not branches inside the main game`

That approach gives the project the best of both worlds:

- the main dungeon game stays stable
- experiments can move quickly
- failed experiments are cheap to remove
- successful experiments can grow without corrupting core gameplay

## Short Version

The wave mode architecture is the right precedent.

Repeat that pattern for future alternatives:

- isolated launcher
- isolated engine
- isolated renderer
- isolated input
- shared learning/product services

That is the safest way to expand the game without disturbing the main loop.
