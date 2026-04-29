# ModeManager Implementation Plan

## Purpose

This document describes how to introduce a `ModeManager` and a cleaner mode-oriented file structure without implementing gameplay changes yet.

The goal is to make alternative game modes easier to add while reducing risk to:

- the main dungeon loop
- overland flow
- review mode
- future experimental modes

This is a planning document only.

## Problem Statement

The current architecture already supports multiple high-level flows:

- menu
- solo dungeon gameplay
- wave game
- overland
- review

That is good, but mode ownership is still distributed across:

- `game.js`
- individual launcher files
- global state
- ad hoc lifecycle control

This is manageable now, but it will become harder to reason about as more alternative modes are added.

## Target Outcome

After this refactor, mode switching should be explicit and centralized.

The shell should know:

- what the active mode is
- how to start it
- how to stop it
- how to pause/resume it
- how to route resize events
- where to return after completion

Each mode should know only its own lifecycle and behavior.

## Non-Goals

This plan does not aim to:

- redesign existing gameplay
- merge all game loops into one system
- rewrite every current screen immediately
- force all modes into a heavy abstraction

The goal is a small, pragmatic mode shell.

## Success Criteria

The refactor is successful if:

- new modes can be added without major edits to the dungeon loop
- mode enter/exit behavior becomes predictable
- teardown bugs become less likely
- resize/pause behavior is routed consistently
- `game.js` becomes less responsible for mode-specific branching

## Proposed Architecture

### 1. Introduce `ModeManager`

Create a shell-level module responsible for:

- mode registration
- current mode tracking
- mode transitions
- lifecycle calls
- transition guards

Suggested file:

```text
src/client/ModeManager.js
```

### 2. Define a Small Mode Contract

Each mode registered with `ModeManager` should expose a consistent shape.

Suggested contract:

```javascript
{
  id: 'wave',
  start(context) {},
  stop(reason) {},
  pause() {},
  resume() {},
  handleResize(dimensions) {},
  canStart(context) { return true; }
}
```

Not every mode must implement every method, but `ModeManager` should assume a common contract.

### 3. Standardize Mode IDs

Recommended canonical IDs:

- `menu`
- `soloDungeon`
- `wave`
- `overland`
- `review`
- `votdLearn`
- `votdTest`

If more alternative modes are added later:

- `bossDuel`
- `laneDefense`
- `rhythmVerse`

This avoids ambiguous naming such as mixing UI names, internal names, and `window.gameMode` values.

### 4. Move Toward Mode-Oriented File Layout

New and migrated mode files should converge on:

```text
src/client/modes/<ModeName>/<ModeName>Mode.js
src/client/modes/<ModeName>/<ModeName>Renderer.js
src/shared/modes/<ModeName>/<ModeName>Engine.js
src/shared/modes/<ModeName>/<ModeName>Config.js
```

Example:

```text
src/client/modes/Wave/WaveMode.js
src/client/modes/Wave/WaveRenderer.js
src/shared/modes/Wave/WaveEngine.js
src/shared/modes/Wave/WaveConfig.js
```

This does not need to be done all at once.

## Current-State Assessment

### Already Good

- wave mode is already fairly isolated
- review and overland already act like separate shell states
- `LocalNetwork` already supports a separate wave engine path

### Current Weak Points

- `game.js` still owns too much mode transition logic
- mode naming is inconsistent
- lifecycle behavior is partly implicit
- resize and pause handling are not routed through a single mode owner
- mode files are not grouped consistently

## Detailed Plan

## Phase 1: Introduce `ModeManager` Without Behavioral Changes

### Goal

Add a central manager first, but keep existing behavior intact.

### Tasks

- create `src/client/ModeManager.js`
- add registration and transition primitives
- mirror the current active mode state in one place
- keep `window.gameMode` temporarily for compatibility

### Suggested API

```javascript
ModeManager.register(modeDefinition)
ModeManager.start(modeId, context)
ModeManager.stopCurrent(reason)
ModeManager.pauseCurrent()
ModeManager.resumeCurrent()
ModeManager.handleResize(dimensions)
ModeManager.getCurrentModeId()
ModeManager.getCurrentMode()
```

### Notes

- do not immediately rewrite all callers
- first make `ModeManager` an adapter around the current system
- preserve current behavior while gaining a central place to reason about transitions

### Exit Criteria

- one module tracks the active mode
- shell code can ask `ModeManager` what is active
- no visible behavior changes required yet

## Phase 2: Wrap Existing Flows As Mode Definitions

### Goal

Convert the major existing flows into explicit mode objects.

### Initial candidates

- `menu`
- `soloDungeon`
- `wave`
- `overland`
- `review`

### Tasks

- create lightweight mode definitions for current flows
- each definition delegates to existing code rather than rewriting it
- centralize enter/exit ownership

### Example approach

The first version of `WaveMode` can internally call the current wave launcher.
The first version of `ReviewMode` can wrap the current review start/stop behavior.

### Exit Criteria

- each major mode can be started through `ModeManager.start(...)`
- current mode transitions no longer require scattered direct assignments

## Phase 3: Centralize Transition Rules

### Goal

Make mode changes explicit and safe.

### Tasks

- define allowed transitions
- define default return destinations
- centralize cleanup order

### Recommended transition table

- `menu -> soloDungeon`
- `menu -> wave`
- `menu -> overland`
- `soloDungeon -> review`
- `overland -> soloDungeon`
- `overland -> review`
- `wave -> menu`
- `review -> overland`
- `review -> menu`

Some transitions may also allow context, for example:

- `review` returns to the mode that launched it
- `overland` returns to `menu`

### Exit Criteria

- transition logic is discoverable in one place
- return behavior becomes consistent

## Phase 4: Centralize Pause / Resume / Resize Routing

### Goal

Move shell events to the active mode owner instead of handling them inconsistently.

### Tasks

- route window resize through `ModeManager.handleResize(...)`
- route visibility pause/resume to active mode when relevant
- centralize `beforeunload` risk checks by mode

### Why this matters

Alternative modes will differ in:

- animation loops
- engine timers
- input handling
- overlays

These should all respond through one active mode contract.

### Exit Criteria

- resize handling no longer depends on scattered knowledge
- pause/resume ownership is mode-specific

## Phase 5: Reduce `game.js` Branching

### Goal

Make `game.js` more shell-like and less mode-specific.

### Tasks

- replace direct mode checks where practical with `ModeManager` ownership
- keep the main dungeon loop focused on dungeon gameplay
- move non-dungeon mode branching out of the central loop where possible

### Important constraint

Do this incrementally.

Do not attempt a giant rewrite where:

- wave
- review
- overland
- menu

all change at once.

### Exit Criteria

- `game.js` is meaningfully smaller in responsibility
- alternative modes no longer depend on special-casing deep in the dungeon loop

## Phase 6: Folder Refactor

### Goal

Move mode code toward a clearer layout without breaking everything at once.

### Recommended target structure

```text
src/client/ModeManager.js
src/client/modes/Menu/MenuMode.js
src/client/modes/SoloDungeon/SoloDungeonMode.js
src/client/modes/Wave/WaveMode.js
src/client/modes/Wave/WaveRenderer.js
src/client/modes/Overland/OverlandMode.js
src/client/modes/Review/ReviewModeAdapter.js

src/shared/modes/Wave/WaveEngine.js
src/shared/modes/Wave/WaveConfig.js
```

### Migration rule

Prefer wrappers first, moves second.

That means:

1. create mode wrapper files
2. register them with `ModeManager`
3. migrate internals only after behavior is stable

This minimizes churn.

### Exit Criteria

- new modes have an obvious home
- developers do not need to guess where mode-specific files belong

## Compatibility Plan

The refactor should preserve compatibility during transition.

### Temporary compatibility measures

- keep `window.gameMode` during migration
- keep current launchers callable directly until replaced
- let `ModeManager` delegate to existing code paths initially

### When to remove compatibility shims

Only after:

- all major mode launches flow through `ModeManager`
- teardown paths are verified
- resize/pause behavior is stable

## Risks

### Risk 1: Breaking Existing Launch Paths

Current entry points are spread across:

- menu buttons
- mission starts
- review launches
- VOTD paths

Mitigation:

- migrate entry points one family at a time
- verify every path after each migration step

### Risk 2: Partial Ownership Confusion

During transition, responsibility may be split between `game.js` and `ModeManager`.

Mitigation:

- document which transitions are owned by `ModeManager`
- keep the transition surface small at first

### Risk 3: Over-Abstraction

It is possible to create a mode framework heavier than the product needs.

Mitigation:

- keep the contract small
- avoid generic factories or plugin systems until there is real pressure

## Verification Plan

This plan should be validated with smoke coverage, not just code inspection.

### Core checks

- main menu still loads
- solo dungeon still starts
- wave mode still starts and exits
- overland still opens and launches missions
- review mode still opens and returns correctly
- resize still behaves correctly in active modes
- pause/resume still works in offline/local modes

### Transition checks

- `menu -> soloDungeon`
- `menu -> wave`
- `menu -> overland`
- `overland -> mission`
- `mission -> review`
- `review -> return target`

## Recommended Implementation Order

1. add `ModeManager` with no behavioral change
2. wrap `wave` mode first, since it is already isolated
3. wrap `review` and `overland`
4. wrap `soloDungeon`
5. centralize transition rules
6. centralize resize/pause routing
7. reduce `game.js` branching
8. migrate file layout gradually

## Why This Order

- wave mode is already closest to the target architecture
- review and overland are also mode-like already
- solo dungeon is the most sensitive path and should move later

This keeps risk low while making steady progress.

## Open Questions

These should be resolved before implementation begins:

1. Should `VOTD` become its own top-level mode or remain a review-related flow?
2. Should `menu` be modeled as a formal mode or remain a shell default state?
3. How much backward compatibility is needed for `window.gameMode` during migration?
4. Should mission-specific alternative gameplay launch through `missionType`, direct mode IDs, or both?

## Recommendation

Proceed with a small, compatibility-first `ModeManager`.

Do not start by moving many files.

Start by:

- centralizing active mode ownership
- wrapping existing isolated modes
- preserving behavior

Then migrate structure only after the transition model is stable.

## Short Version

The correct plan is:

1. introduce `ModeManager`
2. wrap existing modes without rewrites
3. centralize transitions
4. centralize resize/pause behavior
5. reduce `game.js` branching
6. migrate files gradually

That gives the project a safer foundation for future alternative game designs without destabilizing the current game.
