# Test Scripts

This repo now has a small set of ad hoc local regression scripts for the current FTUE and multiplayer work.

## Prerequisites

- Local server running on `http://localhost:3500`
- Playwright installed in the project environment

## FTUE Summary / CTA

Script:
- [scripts/test-start-here-summary.js](/home/michael/proj/dcgame/scripts/test-start-here-summary.js)

Purpose:
- Launches `Start Here`
- Verifies the custom post-mission summary modal renders
- Verifies the `Play Missions` CTA returns to overland

Run:

```bash
node scripts/test-start-here-summary.js
```

Artifacts:
- `output/web-game/start-here-summary-final/summary-direct.png`
- `output/web-game/start-here-summary-final/summary-direct-state.json`
- `output/web-game/start-here-summary-final/summary-end-to-end.png`
- `output/web-game/start-here-summary-final/summary-end-to-end-state.json`
- `output/web-game/start-here-summary-final/summary-missions-action-state.json`
- `output/web-game/start-here-summary-final/errors.json`

Notes:
- This script uses a mix of real mission launch plus controlled in-browser state manipulation to verify the summary/CTA path deterministically.

## Multiplayer Regression

Script:
- [scripts/test-multiplayer-regression.js](/home/michael/proj/dcgame/scripts/test-multiplayer-regression.js)

Purpose:
- Registers two temporary users through the local API
- Creates and starts a real multiplayer room through socket events
- Opens two headless clients on the same room
- Verifies two-player join state
- Verifies movement from one client propagates to the other
- Verifies disconnect handling when one client closes

Run:

```bash
node scripts/test-multiplayer-regression.js
```

Artifacts:
- `output/web-game/multiplayer-regression/room.json`
- `output/web-game/multiplayer-regression/initial-state.json`
- `output/web-game/multiplayer-regression/pre-move-state.json`
- `output/web-game/multiplayer-regression/post-move-state.json`
- `output/web-game/multiplayer-regression/disconnect-state.json`
- `output/web-game/multiplayer-regression/pageA-final.png`
- `output/web-game/multiplayer-regression/logs.json`
- `output/web-game/multiplayer-regression/fatal-error.json` if the run fails

Notes:
- This is a focused regression, not a full lobby UI test.
- It exercises the real server room/socket flow and the real browser game client at `/?room=<roomId>`.
- The disconnect assertion follows the real engine behavior: the remote player remains in `gameState.players` but is marked `state: "disconnected"` during the grace period, rather than being removed immediately.

## David/Goliath Integrated Story Migration

Script:
- [scripts/test-david-goliath-integrated.js](/home/michael/proj/dcgame/scripts/test-david-goliath-integrated.js)

Purpose:
- Regression target for David and Goliath story behavior in the core game loop.
- Verifies the promoted default integrated story launches through normal gameplay, opens reusable story pauses, freezes movement during dialogue/puzzle, resumes click-target movement, spawns Goliath in the core loop, and completes back to overland.
- Verifies the legacy standalone story path remains available through the forced rollback switch.

Promoted default integrated story gate:

```bash
node scripts/test-david-goliath-integrated.js
```

Opt-in integrated story gate:

```bash
node scripts/test-david-goliath-integrated.js --enable-integrated-story
```

Mission-config promotion simulation:

```bash
node scripts/test-david-goliath-integrated.js --simulate-core-loop-config
```

Forced legacy fallback after promotion:

```bash
node scripts/test-david-goliath-integrated.js --force-legacy-story --expect-legacy-story-mode
```

Artifacts:
- `output/web-game/david-goliath-integrated/initial.png`
- `output/web-game/david-goliath-integrated/initial.json`
- `output/web-game/david-goliath-integrated/after-intro.png`
- `output/web-game/david-goliath-integrated/after-intro.json`
- `output/web-game/david-goliath-integrated/after-move.png`
- `output/web-game/david-goliath-integrated/after-move.json`
- `output/web-game/david-goliath-integrated/after-stones.png`
- `output/web-game/david-goliath-integrated/after-stones.json`
- `output/web-game/david-goliath-integrated/after-puzzle-wrong.png`
- `output/web-game/david-goliath-integrated/after-puzzle-wrong.json`
- `output/web-game/david-goliath-integrated/after-puzzle-correct.png`
- `output/web-game/david-goliath-integrated/after-puzzle-correct.json`
- `output/web-game/david-goliath-integrated/after-puzzle-resume.png`
- `output/web-game/david-goliath-integrated/after-puzzle-resume.json`
- `output/web-game/david-goliath-integrated/after-boss-focus.png`
- `output/web-game/david-goliath-integrated/after-boss-focus.json`
- `output/web-game/david-goliath-integrated/after-boss-victory.png`
- `output/web-game/david-goliath-integrated/after-boss-victory.json`
- `output/web-game/david-goliath-integrated/after-victory-complete.png`
- `output/web-game/david-goliath-integrated/after-victory-complete.json`
- `output/web-game/david-goliath-integrated/summary.json`
- `output/web-game/david-goliath-integrated/fatal-error.json` if the run fails

Notes:
- David/Goliath currently has `storyIntegration: "coreLoop"` in mission config; changing that field back to `"legacy"` is the one-line config rollback.
- The opt-in integrated story is controlled by `localStorage.dcgame_integratedStory=true` or `?integratedStory=1`; the script sets localStorage when `--enable-integrated-story` is passed.
- A promoted mission can be forced back to the standalone path with `localStorage.dcgame_forceLegacyStory=true` or `?legacyStory=1`.
- `--enable-integrated-intro`, `localStorage.dcgame_integratedStoryIntro=true`, and `?integratedStoryIntro=1` remain compatibility aliases during the migration.
- The migration plan and rollback rules are documented in [docs/storymode/integrated-migration-plan.md](/home/michael/proj/dcgame/docs/storymode/integrated-migration-plan.md).

## Core Loop Story Pause Scaffold

Script:
- [scripts/test-story-pause-scaffold.js](/home/michael/proj/dcgame/scripts/test-story-pause-scaffold.js)

Purpose:
- Verifies the generic story pause/dialogue scaffold inside the normal game loop.
- Starts normal Solo gameplay, triggers the localhost-only debug story pause, confirms movement is blocked while paused, advances dialogue, and confirms movement resumes.

Run:

```bash
node scripts/test-story-pause-scaffold.js
```

Artifacts:
- `output/web-game/story-pause-scaffold/paused.png`
- `output/web-game/story-pause-scaffold/resumed.png`
- `output/web-game/story-pause-scaffold/summary.json`
- `output/web-game/story-pause-scaffold/fatal-error.json` if the run fails

Notes:
- This does not route any real mission through story pause yet.
- The debug hook is exposed only on `localhost` / `127.0.0.1` as `window.__storyPauseDebug`.
