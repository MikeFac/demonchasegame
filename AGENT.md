# AGENT.md

This file provides guidance to AI coding assistants when working with code in this repository.

## What This Is

Demon Chase Game — a multiplayer Bible verse quiz game with top-down dungeon combat. Players fight demons (Fear, Doubt, Condemnation, etc.) by answering Bible verse quizzes to earn ammo and deal damage. Features a chapter-based mission system with overland campaign map, AI devotional sermons, and verse-of-the-day learning mode.

## Running

```bash
npm install
./restart-server.sh     # Starts/restarts on http://localhost:3500 (preferred)
node server.js          # Alternative: starts fresh server
```

No npm start script configured. No linter configured.

**IMPORTANT**: Always use `./restart-server.sh` to restart the server. Do not manually kill node processes.

## Cache Busting & Server Restart After Code Changes

**After modifying ANY client-side JavaScript file, you MUST bump its version parameter in `index.html`.**

Script tags use `?v=X.XX` for cache busting. If you change a `.js` file but don't bump the version, the browser will serve the old cached version and your changes will NOT take effect.

**Steps after every code change:**
1. Bump the `?v=` parameter in `index.html` for each modified `.js` file (e.g., `?v=2.21` → `?v=2.22`)
2. If a script tag has no `?v=` parameter, add one (e.g., `src="foo.js"` → `src="foo.js?v=1.0"`)
3. Restart the server with `./restart-server.sh`

**Always restart the server immediately after making changes to:**
- `index.html` (HTML structure, modals, script tags)
- Any client-side JavaScript files in `src/client/` or `src/shared/`
- Version numbers in script tags (cache-busting)

## Testing

Tests are ad-hoc scripts, not a test framework:
```bash
node test_quiz.js                        # Quiz unit tests
node test/game-integration-test.js       # Integration (needs running server)
node test/monster-spawn-debug.js         # Monster spawning debug
node test/test-game-config.js            # GameConfig system tests
```

## Quiz Data Generation

```bash
OPENROUTER_API_KEY=sk-... node scripts/generate_ai_quizzes.js --count 10   # Test run
OPENROUTER_API_KEY=sk-... node scripts/generate_ai_quizzes.js --resume     # Full run
```

## Deployment

See `docs/setup/deploying-updates.md` for full instructions.

**Quick deploy:**
```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull && pm2 restart dcgame-staging'"
```

## Architecture

**Server-authoritative multiplayer**: Node.js + Express + Socket.IO backend, HTML5 Canvas + vanilla JS frontend.

### Server Side
- `server.js` — Express + Socket.IO setup, routes solo players to isolated game instances after 500ms
- `src/server/Game.js` — Wraps shared `GameEngine` with Socket.IO emitter for multiplayer. Accepts `gameConfig` parameter for difficulty presets.
- `src/server/entities/MonsterManager.js` — Monster spawning (config-based spawn rate), AI movement, damage, special abilities. Applies health multiplier from config.
- `src/server/entities/PlayerManager.js` — Player add/remove, movement, XP/level
- `src/server/entities/BulletManager.js` — Projectile physics, wall/monster collision
- `src/server/RoomManager.js` — Multiplayer lobby, user auth, room management. Validates and stores difficulty preset in room settings.
- `src/server/routes/sermon.js` — REST endpoint for AI-generated devotional sermons
- `src/server/services/SermonService.js` — AI sermon generation and caching

### Client Side
- `game.js` — Main client orchestrator, game mode state machine (`overland`/`game`/`review`/`votd`), input callbacks, game state sync
- `src/client/Renderer.js` — Canvas drawing (modular `drawXXX` methods)
- `src/client/InputHandler.js` — Click handling, screen-to-world coord conversion, movement targets
- `src/client/Network.js` — Socket.IO client wrapper
- `src/client/LocalNetwork.js` — Offline/local event emitter for solo missions
- `src/client/QuizManager.js` — 5 quiz modes (firstLetter, missingWord, categoryMatch, trueFalse, cloze), weighted random selection via `quizSettings` sliders
- `src/client/ReviewMode.js` — Verse review/study screen
- `src/client/UILayout.js` — Centralized UI positioning constants
- `src/client/OverlandRenderer.js` — Overland campaign map with chapter nodes (shield/heart/sword shapes), locked/unlocked/completed states
- `src/client/ProgressManager.js` — Mission progress persistence (localStorage), chapter unlocking, star ratings, XP tracking
- `src/client/SermonViewer.js` — Paginated AI devotional sermon viewer (canvas-based)
- `src/client/VotdLearningMode.js` — Progressive verse memorization (presentation then hide words incrementally)

### Shared (src/shared/)
- `GameEngine.js` — Environment-agnostic game loop (60fps), manager coordination. Runs on both server and client.
- `GameLifecycle.js` — Level transitions, game end conditions (victory/defeat), grace periods
- `GameConfig.js` — Difficulty presets (Easy/Normal/Hard multipliers), quiz balance validation
- `ContentProvider.js` — Abstract interface for loading worlds/missions
- `FileContentProvider.js` — File-based content loader (fetches `/missions/*.json`)
- `MissionClient.js` — Frontend API for mission content, converts mission config to GameEngine format
- `Constants.js` — Game constants loaded via `require()` on server and `<script>` tag on client
- `LevelConfig.js` — 5 levels with monster types, speeds, max counts
- `WallGrid.js` — O(1) spatial collision grid shared between server and client

### Data
- `bible-verses.js` — 1618+ verses with pre-generated quiz data (1.4MB)
- `missions/chapters.json` — Chapter index (3 chapters, unlock requirements)
- `missions/chapter{N}-*.json` — Per-chapter mission definitions (6 missions total)

## Key Patterns

**Shared modules**: Files in `src/shared/` use `module.exports` for Node.js and `window.X` for browser. Both environments get the same values.

**Collectibles**: Server spawns items in gameState arrays, broadcasts via state updates. Client checks proximity and sends collection event. Server removes item. Used for healingPoints and shieldPoints.

**Click handling**: InputHandler checks overlays first (category picker, game-over modal, goals), then top bar elements (hamburger menu, category indicator), then quiz buttons, then playable game area. `onGameClick(x,y)` receives screen coords (not world). Playable area starts at y=66px (`QUALITY_LINE_HEIGHT + BUTTON_HEIGHT`).

**Category system**: Players tap the category name (e.g. "Faith") in the top bar to open a full-screen picker popup listing all available categories in a 2-column grid. The selected category persists until the player changes it. State managed via `categoryPickerOpen` boolean in game.js, rendered by `Renderer.drawCategoryPicker()`, click-handled in `InputHandler._handleGameModeClick()`.

**Room isolation**: Each game (solo or multiplayer) gets its own Game instance. Solo players get room ID `solo-{socketId}`. Broadcasts use `io.to('room:roomId').emit()`.

**Monster damage exception**: Monster damage to player is calculated client-side (game.js) and reported to server — the one exception to server-authoritative pattern.

**Two-axis difficulty system**: Monster difficulty and quiz balance are independent. Room hosts configure both when creating multiplayer rooms:
- **Monster Difficulty** (Easy/Normal/Hard): Scales monster health, spawn rate, healing frequency via multipliers in `GameConfig.js`. Does NOT affect quiz types.
- **Quiz Balance** (custom sliders): Controls distribution of 5 quiz modes (First Letter/Missing Word/Category Match/True-False/Cloze). Must sum to 100%. Quick presets available (Easy Quizzes/Balanced/Hard Quizzes). Stored in `room.settings.quizSettings`, broadcast to all clients via `gameConfig` socket event.
- Game.js constructor accepts `gameConfig` parameter containing both (defaults to Normal monsters + Balanced quizzes for solo games).
- In multiplayer, server is source of truth for quiz settings — client sliders become read-only.

**Mission system**: The overland map (`OverlandRenderer`) shows chapters as themed nodes. `ProgressManager` persists completion/stars/XP in localStorage. `MissionClient.missionToGameConfig()` converts mission JSON to single-level GameEngine config. Missions are single-level games — when `monstersToKill` is reached, `GameLifecycle.endGame('victory')` fires.

**Game mode state machine**: `game.js` uses `gameMode` variable (`'overland'`, `'game'`, `'review'`, `'votd'`). Overland renders the campaign map, game runs combat, review shows verse study, votd shows progressive memorization.

**resetGameState() and missions**: `resetGameState()` clears all game state including `currentMission`. When starting a mission, the code preserves and restores `currentMission`/`currentMissionConfig` across the reset call.

## Important Gotchas

- **`let`/`const` are NOT on `window`**: Client modules use IIFE pattern. Do NOT access via `window.varName` — the global lexical scope is shared across `<script>` tags, so just use variable names directly.
- **Canvas is 400px wide** (max 600px height, or `window.innerHeight - 80` on shorter screens). The HTML canvas element starts at 800x600 but is resized by game.js. UI elements positioned beyond 400px will be off-screen.
- **`addPlayer()` registers socket handlers** — called 500ms after socket connect (server.js timeout).
- **Client player dimensions** come from the loaded player image and are preserved during gameState sync — don't overwrite them.
- **Shield/inventory images may not exist** — always provide fallback rendering.
- **Mission spawnRate is in milliseconds**: Mission JSON defines `spawnRate` in ms (e.g., 18000 = 18s). Bug was previously caused by ms/seconds confusion.
- **`currentMission` must survive `resetGameState()`**: When starting a mission, save and restore `currentMission` around the reset call or victory flow breaks.

## Further Documentation

- `docs/architecture/TECHNICAL_OVERVIEW.md` — Comprehensive technical reference (900+ lines)
- `docs/architecture/DATA_FLOW.md` — State ownership, socket events, data flow diagrams
- `docs/architecture/ARCHITECTURE.md` — Architecture summary, file structure, fixed issues
- `docs/plans/missions-system.md` — Mission system design and implementation status
