# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Demon Chase Game — a multiplayer Bible verse quiz game with top-down dungeon combat. Players fight demons (Fear, Doubt, Condemnation, etc.) by answering Bible verse quizzes to earn ammo and deal damage.

## Running

```bash
npm install
node server.js          # Starts on http://localhost:3500
```

No npm start script configured. No linter configured.

## ⚠️ CRITICAL: Server Restart After Code Changes

**ALWAYS restart the server immediately after making changes to:**
- `index.html` (HTML structure, modals, script tags)
- Any client-side JavaScript files in `src/client/`
- Version numbers in script tags (cache-busting)

**DO NOT tell the user to refresh the browser without restarting the server first.** The user should only need to refresh AFTER the server has been restarted. Restart the server automatically and immediately after changes.

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

SSH as root first (`ssh root@109.123.227.158`), then `su - dcgame` (dcgame user has no direct SSH access). App dir: `/var/www/dcgame.4you.tel`.

**To deploy (pull latest code):**
```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull'"
```

**To restart the app:**
```bash
ssh root@109.123.227.158 "kill \$(pgrep -f 'node /var/www/dcgame.4you.tel/server.js') && sleep 1"
```

**Or combined (pull + restart):**
```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull' && kill \$(pgrep -f 'node /var/www/dcgame.4you.tel/server.js')"
```

**Note:** The server runs as a direct Node.js process (not pm2) and auto-restarts via system process manager after being killed.

## Architecture

**Server-authoritative multiplayer**: Node.js + Express + Socket.IO backend, HTML5 Canvas + vanilla JS frontend.

### Server Side
- `server.js` — Express + Socket.IO setup, routes solo players to isolated game instances after 500ms
- `src/server/Game.js` — Game loop (60fps update, broadcasts `gameStateUpdate` every 50ms), level data, healing/shield spawning, socket event handlers. **Accepts gameConfig parameter** for difficulty presets.
- `src/server/config/GameConfig.js` — Difficulty preset system (Easy/Normal/Hard). Creates configs with multipliers for monster health, damage, speed, spawn rates, healing frequency.
- `src/server/entities/MonsterManager.js` — Monster spawning (config-based spawn rate), AI movement, damage. **Applies health multiplier** from config.
- `src/server/entities/PlayerManager.js` — Player add/remove, movement, XP/level
- `src/server/entities/BulletManager.js` — Projectile physics, wall/monster collision
- `src/server/RoomManager.js` — Multiplayer lobby, user auth, room management. **Validates and stores difficulty preset** in room settings.

### Client Side
- `game.js` — Main client loop, input callbacks, game state sync with server
- `src/client/Renderer.js` — Canvas drawing (modular `drawXXX` methods)
- `src/client/InputHandler.js` — Click handling, screen-to-world coord conversion, movement targets
- `src/client/Network.js` — Socket.IO client wrapper
- `src/client/QuizManager.js` — 5 quiz modes (firstLetter, missingWord, categoryMatch, trueFalse, cloze), weighted random selection via `quizSettings` sliders
- `src/client/ReviewMode.js` — Verse review/study screen
- `src/client/UILayout.js` — Centralized UI positioning constants (category indicator, category picker popup, quiz options, inventory, verse test button, hamburger menu)

### Shared (src/shared/)
- `Constants.js` — Game constants loaded via `require()` on server and `<script>` tag on client (sets `window.Constants`)
- `LevelConfig.js` — **5 levels** with monster types, speeds, max counts. Levels 1-3 original, 4-5 added for extended gameplay.
- `WallGrid.js` — O(1) spatial collision grid shared between server and client

### Data
- `bible-verses.js` — 1618+ verses with pre-generated quiz data (1.4MB)

## Key Patterns

**Shared modules**: Files in `src/shared/` use `module.exports` for Node.js and `window.X` for browser. Both environments get the same values.

**Collectibles**: Server spawns items in gameState arrays, broadcasts via state updates. Client checks proximity and sends collection event. Server removes item. Used for healingPoints and shieldPoints.

**Click handling**: InputHandler checks overlays first (category picker, game-over modal, goals), then top bar elements (hamburger menu, category indicator), then quiz buttons, then playable game area. `onGameClick(x,y)` receives screen coords (not world). Playable area starts at y=66px (`QUALITY_LINE_HEIGHT + BUTTON_HEIGHT`).

**Category system**: Players tap the category name (e.g. "Faith ▼") in the top bar to open a full-screen picker popup listing all available categories in a 2-column grid. The selected category persists until the player changes it. State managed via `categoryPickerOpen` boolean in game.js, rendered by `Renderer.drawCategoryPicker()`, click-handled in `InputHandler._handleGameModeClick()`.

**Room isolation**: Each game (solo or multiplayer) gets its own Game instance. Solo players get room ID `solo-{socketId}`. Broadcasts use `io.to('room:roomId').emit()`.

**Monster damage exception**: Monster damage to player is calculated client-side (game.js) and reported to server — the one exception to server-authoritative pattern.

**Two-axis difficulty system**: Monster difficulty and quiz balance are **independent**. Room hosts configure both when creating multiplayer rooms:
- **Monster Difficulty** (Easy/Normal/Hard): Scales monster health, spawn rate, healing frequency via multipliers in `GameConfig.js`. Does NOT affect quiz types.
- **Quiz Balance** (custom sliders): Controls distribution of 5 quiz modes (First Letter/Missing Word/Category Match/True-False/Cloze). Must sum to 100%. Quick presets available (Easy Quizzes/Balanced/Hard Quizzes). Stored in `room.settings.quizSettings`, broadcast to all clients via `gameConfig` socket event.
- Game.js constructor accepts `gameConfig` parameter containing both (defaults to Normal monsters + Balanced quizzes for solo games).
- In multiplayer, server is source of truth for quiz settings — client sliders become read-only.

## Important Gotchas

- **`let`/`const` are NOT on `window`**: Client modules use IIFE pattern. Do NOT access via `window.varName` — the global lexical scope is shared across `<script>` tags, so just use variable names directly.
- **Canvas is 400px wide** (max 600px height, or `window.innerHeight - 80` on shorter screens). The HTML canvas element starts at 800x600 but is resized by game.js. UI elements positioned beyond 400px will be off-screen.
- **`addPlayer()` registers socket handlers** — called 500ms after socket connect (server.js timeout).
- **Client player dimensions** come from the loaded player image and are preserved during gameState sync — don't overwrite them.
- **Shield/inventory images may not exist** — always provide fallback rendering.
