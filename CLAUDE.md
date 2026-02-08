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

## Testing

Tests are ad-hoc scripts, not a test framework:
```bash
node test_quiz.js                        # Quiz unit tests
node test/game-integration-test.js       # Integration (needs running server)
node test/monster-spawn-debug.js         # Monster spawning debug
```

## Quiz Data Generation

```bash
OPENROUTER_API_KEY=sk-... node scripts/generate_ai_quizzes.js --count 10   # Test run
OPENROUTER_API_KEY=sk-... node scripts/generate_ai_quizzes.js --resume     # Full run
```

## Deployment

SSH as root first (`ssh root@109.123.227.158`), then `su - dcgame` (dcgame user has no direct SSH access). App dir: `/var/www/dcgame.4you.tel`.

```bash
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull && pm2 restart dcgame-staging'"
```

## Architecture

**Server-authoritative multiplayer**: Node.js + Express + Socket.IO backend, HTML5 Canvas + vanilla JS frontend.

### Server Side
- `server.js` — Express + Socket.IO setup, routes solo players to isolated game instances after 500ms
- `src/server/Game.js` — Game loop (60fps update, broadcasts `gameStateUpdate` every 50ms), level data, healing/shield spawning, socket event handlers
- `src/server/entities/MonsterManager.js` — Monster spawning (every 2s), AI movement, damage
- `src/server/entities/PlayerManager.js` — Player add/remove, movement, XP/level
- `src/server/entities/BulletManager.js` — Projectile physics, wall/monster collision
- `src/server/RoomManager.js` — Multiplayer lobby, user auth, room management

### Client Side
- `game.js` — Main client loop, input callbacks, game state sync with server
- `src/client/Renderer.js` — Canvas drawing (modular `drawXXX` methods)
- `src/client/InputHandler.js` — Click handling, screen-to-world coord conversion, movement targets
- `src/client/Network.js` — Socket.IO client wrapper
- `src/client/QuizManager.js` — 4 quiz modes (firstLetter, missingWord, categoryMatch, trueFalse), weighted random selection via `quizSettings` sliders
- `src/client/ReviewMode.js` — Verse review/study screen
- `src/client/UILayout.js` — Centralized UI positioning constants

### Shared (src/shared/)
- `Constants.js` — Game constants loaded via `require()` on server and `<script>` tag on client (sets `window.Constants`)
- `LevelConfig.js` — 3 levels with monster types, speeds, max counts
- `WallGrid.js` — O(1) spatial collision grid shared between server and client

### Data
- `bible-verses.js` — 1618+ verses with pre-generated quiz data (1.4MB)

## Key Patterns

**Shared modules**: Files in `src/shared/` use `module.exports` for Node.js and `window.X` for browser. Both environments get the same values.

**Collectibles**: Server spawns items in gameState arrays, broadcasts via state updates. Client checks proximity and sends collection event. Server removes item. Used for healingPoints and shieldPoints.

**Click handling**: InputHandler checks UI buttons first (quality, quiz), then playable game area. `onGameClick(x,y)` receives screen coords (not world). Playable area starts at y=66px (`QUALITY_LINE_HEIGHT + BUTTON_HEIGHT`).

**Room isolation**: Each game (solo or multiplayer) gets its own Game instance. Solo players get room ID `solo-{socketId}`. Broadcasts use `io.to('room:roomId').emit()`.

**Monster damage exception**: Monster damage to player is calculated client-side (game.js) and reported to server — the one exception to server-authoritative pattern.

## Important Gotchas

- **`let`/`const` are NOT on `window`**: Client modules use IIFE pattern. Do NOT access via `window.varName` — the global lexical scope is shared across `<script>` tags, so just use variable names directly.
- **Canvas is 400px wide** (max 700px height). The HTML canvas element is 800x600 with CSS scaling. UI elements positioned beyond 400px will be off-screen.
- **`addPlayer()` registers socket handlers** — called 500ms after socket connect (server.js timeout).
- **Client player dimensions** come from the loaded player image and are preserved during gameState sync — don't overwrite them.
- **Shield/inventory images may not exist** — always provide fallback rendering.
