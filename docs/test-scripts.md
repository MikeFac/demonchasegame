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
