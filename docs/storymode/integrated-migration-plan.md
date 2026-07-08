# Integrated Story Mission Migration Plan

## Goal

Move David and Goliath story gameplay out of the standalone story combat loop and into the existing game loop. Story code should direct normal missions; it should not duplicate movement, rendering, camera, combat, collision, or monster updates.

## Rollback Rules

- Keep each migration phase small enough to revert independently.
- Do not delete the current standalone story path until the integrated mission passes the full regression gate.
- Put every live behavior change behind an explicit switch until the new path is proven.
- Prefer a mission-level flag such as `storyIntegration: "coreLoop"` or a local constant such as `INTEGRATED_STORY_ENABLED = false` during migration.
- Before each phase, save a rollback patch:

```bash
git diff > /tmp/david-goliath-story-before-phase-N.patch
```

- If a phase fails, rollback should be one of:

```bash
git apply -R /tmp/david-goliath-story-before-phase-N.patch
```

or, if the phase is only flag-gated, flip the new integration flag back off.

## Stop Conditions

Stop and rollback the current phase if any of these happen:

- normal Solo launch no longer reaches gameplay
- Start Here no longer launches or completes
- player movement becomes visibly jumpy in normal gameplay
- fixed mission monsters stop spawning
- Review/Learn mode cannot return to overland
- Scripture Maze or Wave mode launch behavior changes
- story dialogue pauses the visual renderer instead of only pausing gameplay updates

## Target Architecture

Add a thin story director on top of the existing mission loop.

The existing loop keeps owning:

- player movement
- camera and interpolation
- monster movement and combat
- bullets, pickups, walls, collision
- normal rendering
- mission completion and overland return

The story director owns:

- current story phase
- dialogue line index
- objective text
- stone collection progress
- puzzle state
- boss trigger timing
- victory dialogue and devotional prompt

## Core Loop Pause Requirement

The core loop needs a reusable story pause state. This should be general enough for future missions, not specific to David and Goliath.

Expected behavior:

- render loop continues drawing the current world
- player input routes to the dialogue/puzzle overlay while paused
- player movement, monster movement, attacks, timers, and spawns pause
- resume returns to the same world state
- pause state is visible in debug/test state

Suggested API shape:

```js
enterStoryPause({ type: 'dialogue', missionId, phaseId, payload });
exitStoryPause({ advancePhase: true });
isStoryPaused();
```

Do not start by solving every pause case. First gate is dialogue pause before the mission starts moving.

## Migration Phases

### Phase 0: Regression Harness

- Add target regression script for integrated David/Goliath behavior.
- Current expected result: script detects legacy standalone story mode.
- No live behavior changes.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
```

### Phase 1: Pause Overlay Scaffold

- Add a generic story pause/dialogue overlay to the core game loop.
- Do not connect David/Goliath yet.
- Manually trigger only from a local debug hook or test-only path.

Gate:

```bash
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
```

### Phase 2: David Intro In Core Loop

- Launch `featured/david-01` through normal `startGame` only when the explicit integration flag is enabled.
- Keep the live default on the standalone story path until the integrated route is promoted.
- Immediately enter story pause for Samuel dialogue.
- Resume into normal gameplay after dialogue.
- No stones, puzzle, or Goliath choreography yet.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-intro
```

Expected partial assertions:

- mission launches with `gameMode === "game"`
- normal renderer remains active
- player movement after dialogue is smooth
- no standalone story menu appears

### Phase 3: Stones As Normal Collectibles

- Add smooth stones as mission collectibles in the existing world.
- Story director advances when 5 stones are collected.
- Current implementation keeps the integrated path flag-gated and marks the collect phase complete after 5 stones; it does not enter the puzzle yet.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node test/test-fixed-monster-spawns.js
```

### Phase 4: Puzzle Pause

- Use the core story pause system for the courage cloze puzzle.
- Mark the puzzle complete after the correct answer.
- Resume into normal gameplay after Continue.
- Do not spawn Goliath or enter boss combat until Phase 5.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node scripts/test-story-pause-scaffold.js
```

### Phase 5: Goliath Boss

- Spawn Goliath as a normal fixed boss monster.
- Keep normal renderer, movement, and combat.
- Current implementation clears the collect encounter, disables random spawns, resets kill progress, sets `monstersToKill` to 1, and spawns only the authored Goliath boss.
- Mission completion/victory dialogue should be hardened in the next phase.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node test/test-guard-behavior.js
```

### Phase 6: Victory Dialogue + Mission Completion

- Route Goliath defeat into David victory dialogue through the reusable story pause.
- Suppress the generic game-over modal for the integrated story victory.
- Complete the mission after the final victory dialogue line and return to overland.
- Keep the legacy standalone story path available while the integration flag is off.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node scripts/test-story-pause-scaffold.js
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
```

### Phase 7: Generalize The Story Integration Gate

- Promote the experimental intro gate naming to a full-mission story integration gate.
- Use `localStorage.dcgame_integratedStory=true` or `?integratedStory=1` for the opt-in path.
- Keep `localStorage.dcgame_integratedStoryIntro=true` and `?integratedStoryIntro=1` as rollback-compatible aliases during migration.
- Mark integrated mission runtime state as `storyIntegration: "coreLoop"`.
- Do not delete the standalone story launcher yet.

Gate:

```bash
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node scripts/test-david-goliath-integrated.js --enable-integrated-intro
node scripts/test-story-pause-scaffold.js
```

### Phase 8: Mission-Level Promotion Switch

- Add a mission-level `storyIntegration` config field.
- Keep David/Goliath set to `storyIntegration: "legacy"` until the promoted path passes the gate.
- Route `storyIntegration: "coreLoop"` through the integrated story director by default.
- Keep `localStorage.dcgame_integratedStory=true` / `?integratedStory=1` as explicit opt-in overrides.
- Add a forced legacy fallback (`localStorage.dcgame_forceLegacyStory=true` / `?legacyStory=1`) for rollback and post-promotion testing.
- Do not delete the standalone story launcher yet.

Gate:

```bash
node test/test-story-mission.js
node scripts/test-david-goliath-integrated.js --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node scripts/test-david-goliath-integrated.js --simulate-core-loop-config
node scripts/test-david-goliath-integrated.js --simulate-core-loop-config --force-legacy-story --expect-legacy-story-mode
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
node scripts/test-scripture-maze.js
```

### Phase 9: Promote David/Goliath To Core Loop Default

- Flip David/Goliath from `storyIntegration: "legacy"` to `storyIntegration: "coreLoop"`.
- Run the full integrated story path with no localStorage/URL opt-in flags.
- Keep forced legacy fallback available for rollback and verification.
- Do not delete the standalone story launcher yet.

Gate:

```bash
node test/test-story-mission.js
node scripts/test-david-goliath-integrated.js
node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode
node scripts/test-david-goliath-integrated.js --enable-integrated-story
node scripts/test-story-pause-scaffold.js
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
```

Rollback:

```json
"storyIntegration": "legacy"
```

### Phase 10: Overlay Polish + Naming Cleanup

- Improve reusable story pause readability over live gameplay.
- Ensure dialogue/puzzle overlays visually own the lower interaction area so quiz text/buttons do not compete with story content.
- Add compact phase labels such as `Courage Check` and `Victory`.
- Remove obsolete active intro-named helper code while keeping legacy localStorage/URL aliases available for rollback.
- Keep standalone story combat in place.

Gate:

```bash
node scripts/test-david-goliath-integrated.js
node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode
node scripts/test-story-pause-scaffold.js
node test/test-story-mission.js
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
```

### Phase 11: Extract Core Story Director Module

- Move pure story routing/config/pause-builder logic out of `game.js` into `src/client/CoreStoryDirector.js`.
- Keep game-loop-owned state in `game.js` for this phase:
  - pause state
  - engine start/stop
  - collectible mutation
  - boss phase mutation
  - mission completion/overland return
- Preserve promoted default behavior and forced legacy fallback.
- Do not delete the standalone story launcher yet.

Gate:

```bash
node --check src/client/CoreStoryDirector.js
node --check game.js
node scripts/test-david-goliath-integrated.js
node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode
node scripts/test-story-pause-scaffold.js
node test/test-story-mission.js
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
```

### Phase 12: Retire Standalone Story Combat

- Remove or archive the standalone combat renderer only after the integrated path passes repeatedly after promotion.
- Keep content provider/state tests if still useful.

Gate:

```bash
node test/test-story-mission.js
node scripts/test-david-goliath-integrated.js
node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
node scripts/test-scripture-maze.js
```

## Baseline Regression Set

Run this before Phase 1 and after any phase that touches shared game-loop behavior:

```bash
node --check game.js
node --check src/client/Renderer.js
node --check src/shared/GameEngine.js
node --check src/shared/GameConfig.js
node --check src/shared/MissionClient.js
node test/test-game-engine.js
node test/test-game-config.js
node test/test-fixed-monster-spawns.js
node test/test-guard-behavior.js
node test/test-story-mission.js
node scripts/test-mode-manager-smoke.js
node scripts/test-start-here-summary.js
node scripts/test-scripture-maze.js
```
