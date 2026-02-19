# DC Game — Technical Overview

> **Demon Chase Game**: A multiplayer Bible verse quiz game with top-down dungeon combat. Players fight demons by answering quizzes to earn ammo, then shoot projectiles to destroy monsters. The primary goal is Scripture memorization through engaging gameplay.

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [File Map](#file-map)
3. [Server Side](#server-side)
4. [Client Side](#client-side)
5. [Shared Modules](#shared-modules)
6. [Socket.IO Event Map](#socketio-event-map)
7. [Game Lifecycle](#game-lifecycle)
8. [Quiz & Verse System](#quiz--verse-system)
9. [Combat System](#combat-system)
10. [Level Progression](#level-progression)
11. [Difficulty & Config System](#difficulty--config-system)
12. [Verse-to-Song Learning](#verse-to-song-learning)
13. [Visual Systems](#visual-systems)
14. [Key Patterns & Gotchas](#key-patterns--gotchas)
15. [Dependencies & Scripts](#dependencies--scripts)

---

## Architecture Summary

**Server-authoritative multiplayer** game built with:
- **Server**: Node.js + Express + Socket.IO
- **Client**: HTML5 Canvas + vanilla JS (no framework)
- **Database**: MongoDB (optional, for verse-to-song learning only)

**Key principle**: The server is the source of truth for game state (monsters, bullets, XP, kills). The client handles rendering, input, and player movement prediction.

**One exception**: Monster damage to player is calculated **client-side** (`game.js` line ~1271) and reported to server via `playerHit` event. This is a known design tradeoff for responsiveness.

**State broadcast**: Server broadcasts full `gameState` every **50ms** via Socket.IO. Walls are sent once per level (not repeated in broadcasts).

---

## File Map

```
dcgame/
├── server.js                          # Express + Socket.IO entry point
├── game.js                            # Main client file (orchestrator)
├── bible-verses.js                    # 1618+ verses with quiz data (1.4MB)
├── index.html                         # Game page (canvas + UI)
├── lobby.html                         # Multiplayer lobby page
│
├── src/
│   ├── server/
│   │   ├── Game.js                    # Game loop, state, socket handlers
│   │   ├── RoomManager.js             # Multiplayer lobby, auth, rooms
│   │   ├── config/
│   │   │   └── GameConfig.js          # Difficulty presets, quiz validation
│   │   ├── entities/
│   │   │   ├── MonsterManager.js      # Monster spawn, AI, damage
│   │   │   ├── PlayerManager.js       # Player add/remove, movement
│   │   │   └── BulletManager.js       # Projectile physics, collision
│   │   ├── models/
│   │   │   ├── VerseSong.js           # MongoDB: verse song records
│   │   │   └── CategoryStyle.js       # MongoDB: category music styles
│   │   ├── services/
│   │   │   └── SunoService.js         # Suno API song generation
│   │   └── utils/
│   │       ├── Physics.js             # Collision helpers
│   │       ├── Maze.js                # Legacy maze generator
│   │       ├── ReferenceNormalizer.js  # Verse reference canonicalization
│   │       └── map-generators/        # Pluggable map generation system
│   │           ├── index.js           # Factory router (5 map styles)
│   │           ├── ClassicMaze.js     # Room-based dungeon, MST corridors
│   │           ├── NarrowPaths.js     # Tight 50px corridor rooms
│   │           ├── ComplexLabyrinth.js # Recursive backtracking labyrinth
│   │           ├── GridCity.js        # Regular grid city blocks
│   │           └── OpenPlains.js      # Open space, scattered buildings
│   │
│   ├── client/
│   │   ├── Renderer.js                # All canvas drawing (class)
│   │   ├── InputHandler.js            # Click dispatch + coord conversion (class)
│   │   ├── Network.js                 # Socket.IO wrapper (class, global `network`)
│   │   ├── QuizManager.js             # 5 quiz modes, verse rotation (IIFE)
│   │   ├── ReviewMode.js              # Verse review/study screen (IIFE)
│   │   ├── VerseTestScreen.js         # Sequential first-letter test overlay (IIFE)
│   │   ├── UILayout.js                # Centralized UI positioning (IIFE)
│   │   ├── MusicManager.js            # Audio playback, verse songs (IIFE)
│   │   └── VerseSongService.js        # Verse song API client (IIFE)
│   │
│   └── shared/
│       ├── Constants.js               # Game constants (dual export)
│       ├── LevelConfig.js             # Level definitions (dual export)
│       └── WallGrid.js                # O(1) spatial collision grid (dual export)
│
├── scripts/                           # Seeding, generation, maintenance scripts
├── test/                              # Ad-hoc test scripts (not a test framework)
└── sounds/, music/, images/           # Asset directories
```

---

## Server Side

### server.js — Entry Point

**Responsibilities**: Express server setup, REST API routes, Socket.IO connection handling, game instance lifecycle.

**REST API Endpoints**:
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/register` | Register user with username |
| POST | `/api/login` | Login with session token |
| GET | `/api/rooms` | List joinable rooms |
| GET | `/api/presets` | Monster difficulty presets |
| GET | `/api/quiz-presets` | Quiz balance presets |
| ALL | `/api/verse-song/*` | Verse-to-song learning |

**Game Instance Management**:
- `gameInstances` Map: `roomId → Game` for all active games
- Solo: `solo-{socketId}` room ID, isolated 1-player Game instance
- Multiplayer: Shared Game instance per room, N players

**Socket Events Handled**:
- `startSoloGame`: Creates isolated Game with player's difficulty + quiz settings
- `authenticate` / `createRoom` / `joinRoom` / `startGame`: Multiplayer lobby flow
- `joinGame`: Post-lobby redirect, adds socket to existing Game instance

### src/server/Game.js — Game Loop

**Constructor** receives `io`, `roomId`, `gameConfig`:
1. Creates room-scoped emitter: `io.to('room:' + roomId).emit()`
2. Generates map via `MapGeneratorFactory.generateMap(mapStyle, ...)` (5 styles available), creates WallGrid
3. Initializes gameState: players, monsters, healingPoints, shieldPoints, bullets, monstersToKill
4. Creates entity managers (MonsterManager, PlayerManager, BulletManager, CollectibleManager)
5. Spawns initial collectibles (1 random armor piece per level)

**Loops** (`start()`):
1. **Main loop** (60fps / 16.67ms): `update()` → move monsters, update bullets, check level completion, broadcast state
2. **Monster spawning**: Dynamic `setTimeout` scheduling via `scheduleNextSpawn()` (respects current level's spawn rate, reschedules recursively)
3. **Healing spawning**: Config-adjusted rate (default 30s)
4. **Server-side level completion**: Detects `monstersKilled >= monstersToKill`, broadcasts 5s countdown, auto-advances level

**`addPlayer(socket)`** — registers per-player socket handlers:
- `playerPosition`: Update position (trusts client)
- `playerHit`: Apply client-calculated damage
- `playerShoot`: Consume ammo, create bullet
- `quizCorrect`: Award +2 ammo
- `collectHealingPoint`: Heal +25 HP
- `collectShield`: Remove from world (client handles duration)
- `levelCompleted`: 5s countdown → `resetLevelData()`
- `disconnect`: Remove player, cleanup

**`resetLevelData(level)`**: Regenerates maze, validates spawn, teleports all players, re-emits walls, spawns new shield.

### src/server/entities/MonsterManager.js

**Spawning**: Grid scan at 50px intervals for valid positions (50px margins, 400px+ from players, no wall overlap). 50% chasers, 50% random walkers.

**Damage per demon type**: Fear(3), Condemnation(2), Unbelief(5), Ignorance(2), Strife(6), Confusion(4), Depression(3), Doubt(4), Infirmity(7), Deception(4), Despair(4), Temptation(5), Pride(6), Poverty(3), Shame(3), Blindness(2), Swarm(5).

**Health**: Base HP scales by level: `10 + (level - 1) * 5` (Level 1→10, Level 5→30) × `healthMultiplier` (0.7/1.0/1.5) × demon type multiplier (Strongholds get 2x).

**AI**: Chasers follow nearest player (Misleader demons zig-zag with 30% erratic chance). Walkers pick random direction. Strife demons periodically dash at 3x speed.

**Demon Special Abilities** (configured in Constants.js):
- **Freezing Aura** (Fear, Doubt, Depression, Despair): 40% speed slow within 150px
- **Armored Shell** (Pride, Condemnation, Unbelief): 2x HP; Pride absorbs first 3 hits
- **Spirit Drain** (Poverty, Temptation): 40% chance to drain 5 XP or 5 Ammo on hit
- **Dash Attack** (Strife): 15% chance to lunge at 3x speed for 500ms (5s cooldown)
- **Erratic Movement** (Confusion, Deception, Ignorance, Blindness): 30% zig-zag per move update

**On kill**: +10 XP to attacker, level-up check (maxHealth = 50 + level × 50, full heal), emit `monsterKilled`. 60% chance to drop armor collectible.

### src/server/entities/BulletManager.js

**Physics**: Velocity from angle to target × BULLET_SPEED (15 px/frame). Each frame: move, check world bounds, check wall collision (WallGrid O(1)), check monster collision (circle-rect).

**On hit**: BULLET_DAMAGE (2), delegates to MonsterManager.damageMonster(), emits `bulletHit` for sound.

### src/server/entities/PlayerManager.js

**`addPlayer(socket, spawnX, spawnY)`**: Generates 3-byte hex playerCode, validates spawn (collision check, fallback search), creates player object (health: 100, ammo: 0), emits `playerCode` + `playerNumber`.

**`handlePlayerHit(socket, damage)`**: CLIENT-CALCULATED damage. Server trusts value, reduces health, broadcasts update.

### src/server/RoomManager.js

**User auth**: Username registration → session token (16-byte hex). Socket association for disconnect cleanup.

**Room creation**: Validates difficulty preset + quiz settings (5 keys, sum to 100), stores in `room.settings`. Also stores `mapStyle` selection.

**Game start**: Host-only, all non-host players must be ready. server.js creates GameConfig from room settings including map style.

### src/server/config/GameConfig.js

**Two-axis difficulty** (independent):
- **Monster Difficulty** (easy/normal/hard): Health, damage, speed, spawn rate, healing frequency multipliers
- **Quiz Balance** (custom %): Distribution across 5 quiz modes

**Multiplier table**:
| Multiplier | Easy | Normal | Hard |
|------------|------|--------|------|
| monsterHealth | 0.7 | 1.0 | 1.5 |
| monsterDamage | 0.7 | 1.0 | 1.5 |
| monsterSpeed | 0.8 | 1.0 | 1.2 |
| spawnRate | 1.5× | 1.0 | 0.7× |
| healingSpawnRate | 0.7× | 1.0 | 1.5× |
| maxMonsters | 0.7 | 1.0 | 1.3 |

**`createGameConfig(presetName, customQuizSettings)`**: Applies multipliers to base LevelConfig values, returns merged config object.

**`validateQuizSettings(qs)`**: 5 keys (firstLetter, missingWord, categoryMatch, trueFalse, verseTest), all non-negative integers, sum = 100.

---

## Client Side

### game.js — Main Orchestrator

**Role**: The central client file. Owns all global state, the game loop, init sequence, and coordinates all other modules.

**Key Global State Variables**:
- `gameState`, `player`, `camera`, `monsters`, `healingPoints`, `shieldPoints`
- `currentQuiz`, `answerFullVerse`, `isAnswerCorrect`, `currentVerseIndex`, `vQuality`
- `organizedVerses`, `qualityButtons`, `qualityIndex`, `qualityTotal`
- `shieldInventory`, `shieldActive`, `shieldEndTime`, `inventoryOpen`
- `verseTestShielded`, `verseTestShieldActive` (verse test shield setting)
- `menuOpen`, `goalsOverlayVisible`, `gameOverModalVisible`
- `screenShake`, `damageNumbers`, `deathParticles`, `flashMessages`
- `dailyChallengeProgress`, `versesLearned`
- `network` (Network instance), `inputHandler` (InputHandler instance)

**`init()` Flow**:
1. Define network callbacks (onGameStateUpdate, onPlayerCode, onWalls, etc.)
2. Connect to server, receive playerCode
3. Load images (sprites, demons, effects, terrain tiles)
4. Organize verses by category
5. Pick initial verse, start verse timer (20s)
6. Create quality buttons, start button timer (22s)
7. Initialize InputHandler with callbacks
8. Initialize daily challenge + verse counter from localStorage

**`gameLoop()` Flow** (every frame):
1. Wait for playerCode + game loaded
2. Build uiState object from all globals
3. Update animations (walk frames, death particles, screen shake, damage numbers, flash messages, verse test)
4. Call `renderer.drawGame(...)` with all state
5. Draw VerseTestScreen overlay if active
6. Process movement (InputHandler → world coords → collision check → position update)
7. Update camera (follow player, clamp to world)
8. Handle combat (melee range → attack/damage, screen shake, damage numbers)
9. Check level completion (60% monsters killed)
10. Handle collectible proximity (healing, shield)
11. Update shield timer
12. Send player data to server (throttled 100ms)

**`updateGameState(newGameState)`** — Server reconciliation:
- Preserve local player dimensions (from sprite image)
- Blend position: If < 60px drift, keep local prediction. If > 60px, smooth blend (30%) toward server.
- Trust server for health, XP, level, ammo.
- Map monsters from server state.

**`launchVerseTest(text, ref, difficulty)`** — Shared helper:
- Activates test shield if `verseTestShielded` setting is ON
- On pass: award ammo (+5), health (+10 capped), XP via server, flash message
- On fail: no penalty, deactivate shield
- Always: deactivate test shield

**`checkAutoVerseTest()`** — Post-pick check:
- If `currentQuiz.mode === 'verse_test'`, auto-launches VerseTestScreen
- Called after every `pickQualityVerse()` invocation

### src/client/Renderer.js — Canvas Drawing (Class)

**`drawGame(...)`** receives all state via parameters (no global access).

**Render order**:
1. Game-over modal (early return if visible)
2. Top bar (quality line, quality buttons, hamburger)
3. Screen shake transform
4. Game objects: walls, players, monsters, healing points, shield points, bullets, damage numbers, death particles
5. Undo screen shake
6. HUD (health, XP, level, ammo, game level)
7. Monster tooltip (on hover)
8. Shield HUD (inventory button, panel, active timer)
9. Messages (game over, correct/incorrect, level complete)
10. Bible verse + quiz options
11. Flash messages
12. Menu panel (on top of everything)
13. Goals overlay (on top of everything)

**Wall rendering**: Two-pass tile system (grass first, buildings on top from sprite sheets). Fallback: colored gradients.

**Menu panel**: 6 items (Review, Play/Pause, Next Song, Goals, Verse Test, Toggle Test Shield). Dynamic labels for play state and shield setting.

### src/client/InputHandler.js — Click Dispatch (Class)

**Click priority order** (highest to lowest):
1. VerseTestScreen overlay (if active)
2. Goals overlay (dismiss)
3. Game-over modal (restart button)
4. Hamburger menu button
5. Menu panel items (6 items, if menu open)
6. Quality buttons
7. Playable game area (inventory → shooting → movement)
8. Quiz option buttons

**Coordinate conversion**: Screen coords → world coords via camera offset for movement targets and shooting.

### src/client/Network.js — Socket.IO Wrapper (Class)

Global instance: `const network = new Network()`

**Events received**: `gameStateUpdate`, `gameState`, `playerCode`, `playerNumber`, `monsterKilled`, `bulletHit`, `walls`, `levelAdvancing`, `gameConfig`

**Events sent**: `playerPosition`, `playerHit`, `playerAttack`, `collectHealingPoint`, `playerShoot`, `quizCorrect`, `collectShield`, `levelCompleted`, `updateGameState`, `updatePlayerData`, `startSoloGame`, `joinGame`

### src/client/QuizManager.js — Quiz Modes (IIFE → `window.QuizManager`)

**5 Quiz Modes**:

| Mode | Selection | Input | Data Source |
|------|-----------|-------|-------------|
| `first_letter` | 25% | Pick 2-letter combo | Generated at runtime |
| `missing_word` | 25% | Pick missing word | `verse.quizData.missingWord` |
| `category_match` | 20% | Pick correct category | `verse.quizData.categoryMatch` |
| `true_false` | 15% | TRUE/FALSE | `verse.quizData.trueFalse` |
| `verse_test` | 15% | Sequential first letters | VerseTestScreen overlay |

**`selectMode()`**: Weighted random via cumulative probability from `quizSettings`.

**`pickQualityVerse()`**: Guards against VerseTestScreen active. Sets `currentVerseIndex`, generates quiz, clears answer timeout, tries verse music.

**`handleQuizAnswer(selectedOption)`**: Awards ammo (+2), sends quizCorrect to server, shows full verse 3s, records learning. Tracks incorrect answers for review mode.

### src/client/VerseTestScreen.js — Verse Test Overlay (IIFE)

**Mechanic**: Player must identify the first letter of consecutive words in a verse. 6 letter buttons (2×3 grid), 1 correct + 5 distractors.

**Flow**: `startTest()` → split verse → pick random start → generate options → player clicks letters → `advanceStep()` or `failTest()` → callback with result.

**On fail**: Plays verse audio (via ReviewMode.convertRef), shows full verse for duration of audio + 2s.

### src/client/UILayout.js — UI Positioning (IIFE → `window.UILayout`)

Single source of truth for all UI positions. Both Renderer (drawing) and InputHandler (click detection) reference this to ensure coordinates always match.

**Key values**: Canvas 400×600, playableTop = 66px, hamburger at y=30, menu panel at y=58, inventory button at y=71.

### src/client/ReviewMode.js — Review Screen (IIFE → `window.ReviewMode`)

Two modes: **Incorrect** (review wrong answers) and **Quality** (browse quality's verses). Navigation (prev/next/repeat), audio playback from external server, `convertRef()` for reference → audio filename mapping.

### src/client/MusicManager.js — Audio (IIFE → `window.MusicManager`)

Manages background music tracks and verse-specific educational songs. `playVerseTrack(ref)` fetches song via VerseSongService, falls back to default music. `recordVerseLearned()` sends analytics.

### src/client/VerseSongService.js — Song API Client (IIFE → `window.VerseSongService`)

Singleton. `getSongForVerse(ref)` fetches from `/api/verse-song?ref=...`, caches per session. `recordPlay()` POSTs analytics.

---

## Shared Modules

### src/shared/Constants.js

Dual export: `module.exports` (Node) + `window.Constants` (browser).

**Key constants**: World 3000×3000, Cell 25px, Canvas 400×600, Player/Monster 48×48, Bullet speed 15, Bullet damage 2, Ammo reward 2, Shield duration 10s, Verse test rewards (ammo 5, XP 15, health 20, shield 15s). Monster drop chance 60%. Demon ability constants (freeze radius/slow, erratic chance, stronghold HP multiplier, drain chance/amounts, dash speed/duration/cooldown).

### src/shared/LevelConfig.js

**5 Levels** with increasing difficulty. Each level has a `monstersToKill` target for level completion (server-detected). Monster base HP scales: `10 + (level-1)*5`.

| Level | Theme | Monsters | Max | Kill Target | Speed | Spawn Rate | Damage | Base HP |
|-------|-------|----------|-----|-------------|-------|------------|--------|---------|
| 1 | Stone | Fear, Ignorance, Blindness, Doubt, Confusion | 25 | 15 | 5 | 4s | 1.0× | 10 |
| 2 | Earth | Strife, Confusion, Infirmity, Poverty, Shame, Deception, Fear | 30 | 23 | 7 | 3.5s | 1.5× | 15 |
| 3 | Crystal | Condemnation, Unbelief, Depression, Doubt, Despair, Pride, Strife | 35 | 30 | 9 | 3s | 1.5× | 20 |
| 4 | Shadow | Despair, Deception, Temptation, Swarm, Unbelief, Condemnation | 40 | 38 | 10 | 2.5s | 2.0× | 25 |
| 5 | Void | Pride, Doubt, Fear, Condemnation, Unbelief, Swarm, Temptation, Poverty | 50 | 45 | 12 | 2s | 2.5× | 30 |

**XP thresholds**: 0, 30, 100, 200, 350, 500 (levels 1-6).

### Map Generation System

5 selectable map styles via `MapGeneratorFactory` (factory pattern in `src/server/utils/map-generators/`):

| Style | Description | Corridor Width | Key Feature |
|-------|-------------|---------------|-------------|
| Classic | Room-based dungeon | 150px (6 cells) | 12 rooms, MST + extra corridors |
| Narrow | Tight corridor rooms | 50px (2 cells) | 15 rooms, designed for close combat |
| Labyrinth | Recursive backtracking | 75px (3 cells) | Few rooms, many loops, maze-like |
| City | Regular grid blocks | 100px streets | City blocks with 10% parks |
| Open | Scattered buildings | Open field | 40 buildings (50% hollow), safe spawn zone |

Maps regenerate on each level advance. Player selects style before starting (solo dropdown or multiplayer room setting).

### src/shared/WallGrid.js

IIFE with dual export. O(1) spatial collision via boolean grid.

- `collides(x, y, w, h)`: AABB collision against wall cells
- `collidesCircle(cx, cy, radius)`: Circle-rect collision (for bullets)
- `fromFlat(flat, rows, cols, cellSize)`: Reconstruct from network-transferred flat array

---

## Socket.IO Event Map

### Client → Server

| Event | Payload | Handler |
|-------|---------|---------|
| `startSoloGame` | `{difficulty, quizSettings, gameSpeed, mapStyle}` | server.js → creates Game |
| `joinGame` | `roomId` | server.js → addPlayer |
| `playerPosition` | `{x, y}` | Game.js → PlayerManager |
| `playerHit` | `damage` (number) | Game.js → PlayerManager |
| `playerAttack` | `{monsterId, damage}` | Game.js → PlayerManager |
| `playerShoot` | `{x, y}` (target) | Game.js → BulletManager |
| `quizCorrect` | (none) | Game.js → +2 ammo |
| `collectHealingPoint` | `healingPointId` | Game.js → +25 HP |
| `collectShield` | `shieldId` | Game.js → remove from world |
| `levelCompleted` | (none) | Game.js → countdown + advance |
| `updatePlayerData` | `{playerCode, playerData}` | Game.js (throttled 100ms) |

### Server → Client

| Event | Payload | Handler |
|-------|---------|---------|
| `gameStateUpdate` | Full gameState | game.js → updateGameState() |
| `playerCode` | `code` (string) | game.js → set playerCode |
| `playerNumber` | `number` (1-4) | game.js → load sprite |
| `walls` | `{walls, gridFlat, rows, cols, cellSize, spawnX, spawnY}` | game.js → build WallGrid |
| `gameConfig` | `{quizSettings, isSoloGame, ...}` | game.js → sync sliders |
| `monsterKilled` | `{monsterId, x, y}` | game.js → death animation |
| `bulletHit` | `{x, y}` | game.js → impact sound |
| `levelAdvancing` | `{countdown}` | game.js → countdown timer |
| `armorAbsorb` | `{monsterId, armorLeft}` | game.js → "BLOCKED" damage number |
| `levelProgress` | `{killed, required}` | game.js → progress tracking |

---

## Game Lifecycle

### Solo Game Start
```
Client clicks "Start Solo Game"
  → startGame('solo') in game.js
  → init() loads images, connects network, organizes verses
  → network.sendStartSoloGame(difficulty, quizSettings)
  → Server creates GameConfig, creates Game instance
  → Game.addPlayer(socket) emits: playerCode, playerNumber, walls, gameConfig
  → Client receives events, sets up state
  → gameLoop() begins rendering + input processing
  → Server broadcasts gameStateUpdate every 50ms
```

### Multiplayer Flow
```
1. Players visit /lobby
2. Host: authenticate → createRoom (preset + quizSettings)
3. Others: authenticate → joinRoom
4. Host: setReady (others too) → startGame
5. Server creates Game from room.settings
6. Clients redirect to /?room=ROOMID
7. Each client: joinGame → addPlayer
8. Game loop runs for all players in shared Game instance
```

### Game Over
```
Client-side: player.health ≤ 0
  → gameOverFlag = true, gameOverModalVisible = true
  → Calculate finalStats (level, kills, verses, time)
  → Renderer shows game-over modal with stats + "Try Again"
  → Click "Try Again" → window.location.reload()
```

---

## Quiz & Verse System

### Data Structure (bible-verses.js)
```javascript
{
  Text: "For God so loved the world...",
  Reference: "John 3:16",
  Category: "Love",
  quizData: {
    missingWord: { question: "For God so ___ the world", answer: "loved", options: [...] },
    categoryMatch: { correctCategory: "Love", distractors: ["Greed", "Selfishness"] },
    trueFalse: { falseReference: "Romans 8:28", falseCategory: "Wisdom" }
  }
}
```

### Verse Flow
```
1. Verses organized by Category → organizedVerses[category] = [verse, ...]
2. vQuality selects active category (from quality buttons or level config)
3. qualityIndex[category] tracks current position (sequential)
4. pickQualityVerse() → selectMode() → generateQuizForVerse() → currentQuiz
5. If mode = 'verse_test' → checkAutoVerseTest() → launchVerseTest()
6. Otherwise: quiz rendered as inline buttons below verse
7. Player answers → handleQuizAnswer() → reward or incorrect
8. After 3s timeout → next verse
9. Every 20s: auto-rotate via verseTimer
10. Every 22s: quality buttons randomize
```

### Quiz Settings Flow
```
UI Sliders (index.html) → quizSettings object → sent to server on game start
  → Server validates (5 keys, sum = 100) → stores in room.settings
  → Server creates GameConfig with quizSettings
  → Server emits gameConfig to client
  → Client syncs sliders (read-only in multiplayer)
  → QuizManager.selectMode() reads quizSettings for weighted random
```

---

## Combat System

### Ranged Combat (Primary)
```
1. Player answers quiz correctly → +2 ammo (server-side)
2. Player clicks monster → network.sendShoot({x, y})
3. Server: check ammo ≥ 1, decrement, create bullet
4. BulletManager.update(): move bullet, check wall collision, check monster collision
5. Hit monster → damageMonster(id, BULLET_DAMAGE=2)
6. Monster health ≤ 0 → kill, award +10 XP, emit monsterKilled
7. Client: death particle animation, sound effect
```

### Melee Combat (Passive)
```
1. Player within COMBAT_DISTANCE (60px) of monster
2. Every ATTACK_RATE (700ms):
   a. If isAnswerCorrect: attack monster (server-side damage), screen shake, damage number
   b. Monster attacks player: client-calculated damage, sends playerHit to server
   c. Shield blocks monster damage (inventory shield OR verse test shield)
```

### Shield System
```
Inventory Shield:
  - Collected from world (shieldPoints)
  - Stored in shieldInventory count
  - Activated via inventory panel "Use" button
  - Duration: SHIELD_DURATION (10s)
  - Blocks ALL monster damage while active

Verse Test Shield:
  - Setting toggled via menu "Test Shield: ON/OFF"
  - Persisted to localStorage
  - Activates during verse test (if setting ON)
  - Deactivates on test completion (pass or fail)
  - Blocks monster damage during test
  - Separate flag from inventory shield (no interference)
```

---

## Level Progression

**Trigger**: Server detects `monstersKilled >= monstersToKill` (configured per level in LevelConfig). Client also checks 60% killed as a backup trigger via `levelCompleted` event.

**Server flow**:
1. Server detects completion in `update()` loop (or receives `levelCompleted` from client)
2. Broadcast `levelAdvancing` with 5s countdown (protected by `_levelAdvancing` flag)
3. After 5s: `resetLevelData(nextLevel)`
4. Regenerate map (using selected map style), new WallGrid
5. Validate spawn safety (search collision-free position)
6. Teleport ALL players to safe spawn
7. Re-emit `walls` to all sockets
8. Spawn 1 random armor collectible
9. Reset counters (monstersKilled = 0), set new monstersToKill
10. Reschedule monster spawning at new level's rate

**Player leveling** (via XP from kills):
- maxHealth = 50 + level × 50 (100/150/200/250/300/350)
- Full heal on level up

---

## Difficulty & Config System

**Three independent axes**:

1. **Monster Difficulty** (easy/normal/hard): Multipliers applied to base LevelConfig values in GameConfig.createGameConfig(). Affects monster HP, damage, speed, spawn rate, healing frequency, max concurrent monsters.

2. **Quiz Balance** (custom sliders): Percentage distribution across 5 quiz modes. Default: 25/25/20/15/15. Must sum to 100%. Validated server-side.

3. **Map Style** (classic/narrow/labyrinth/open/city): Selectable per game. Affects dungeon layout, corridor widths, and combat dynamics. Map regenerates each level.

**Config flow**:
```
Solo: UI sliders + map dropdown → startSoloGame → GameConfig.createGameConfig() → Game constructor
Multi: Room settings (preset + quiz + map) → startGame → GameConfig.createGameConfig() → Game constructor
```

---

## Verse-to-Song Learning

**Optional subsystem** using MongoDB + Suno API (via kie.ai).

**Components**:
- `VerseSong` model: Stores generated songs (reference, audioUrl, status)
- `CategoryStyle` model: Maps 22 categories to distinct music styles
- `SunoService`: Generates songs (lyrics = verse text × 3)
- `VerseSongService` (client): Fetches songs, caches per session
- `MusicManager`: Plays verse songs during gameplay (non-blocking)

**Integration**: When `pickQualityVerse()` selects a verse, `MusicManager.playVerseTrack()` queries for a song. If ready, plays it. If not, uses default background music. `recordVerseLearned()` tracks analytics on quiz success.

---

## Visual Systems

### Screen Shake
Triggered by monster hit. ±5px translation on game world for 200ms. Applies via `ctx.translate()`, undone before HUD rendering.

### Floating Damage Numbers
Red "-1" text floats up 30px over 1s with fade-out. Supports custom text (e.g. "BLOCKED" for Pride armor) and custom colors (e.g. gold for armor absorb). Stored in world coords, converted to screen via camera.

### Death Particles
Sprite sheet animation (6×6 grid, 64×64 frames, 24 frames total). 100ms per frame = 2.4s duration. Fallback: expanding red circles.

### Player Walk Animation
2-frame sprite sheet (96×96 total, 48×48 per frame). Frame toggles every 150ms when moving. Direction flipping via sprite row (top = right, bottom = left).

### Wall Rendering
Two-pass tile system: Pass 1 draws grass tiles (8×8 terrain sheet), Pass 2 draws buildings (4×4 building sheet, 100×100, 2% density, deterministic hash placement). Fallback: colored gradients with 3D effect.

### Health Bars
Gradient: Green (> 60%) → Yellow (30-60%) → Red (< 30%). Dark background, black border. Applied to both monsters and players.

---

## Key Patterns & Gotchas

### Module Patterns
- **IIFE + window.X**: QuizManager, ReviewMode, MusicManager, VerseSongService, UILayout, VerseTestScreen
- **ES6 Class**: Renderer, InputHandler, Network
- **Global scope**: game.js (orchestrator with many globals)
- **Dual export**: Shared modules use `module.exports` (Node) + `window.X` (browser)

### Critical Gotchas

1. **`let`/`const` are NOT on `window`**: Client modules in IIFE pattern share global lexical scope. Do NOT use `window.varName` — just use `varName` directly.

2. **Canvas is 400px wide** (max 700px height, HTML 800×600 with CSS scaling). UI elements beyond 400px are off-screen.

3. **Walls not in gameState broadcast**: Sent once via `walls` event on connect and level change.

4. **Client player dimensions** come from loaded sprite image, must be preserved during gameState sync.

5. **`addPlayer()` registers socket handlers** — called within Game.js, not at connection time.

6. **Monster damage is client-calculated**: The one exception to server authority. `playerHit` sends damage value to server.

7. **Shield/inventory images may not exist** — always provide fallback rendering.

8. **Quiz settings validated server-side**: Old 4-key settings (without verseTest) will fail validation and fall back to defaults.

9. **playerPosition not validated server-side**: Client performs collision checks locally, sends result to server. Server trusts client.

10. **spawnsLeft tracked but doesn't block spawning**: Monster spawning only checks concurrent limit (`maxMonsters`).

### Collectibles Pattern
```
Server spawns item → gameState array → broadcast
Client detects proximity → sends collection event
Server removes from array → applies effect → next broadcast reflects removal
```

### Click Handling Pattern
```
InputHandler checks UI elements in priority order (top to bottom)
First match consumes the click (returns true)
If nothing consumed → convert to world coords → set movement target
```

---

## Dependencies & Scripts

### package.json Dependencies
- `express` (4.19.2) — HTTP server
- `socket.io` (4.7.5) — Real-time communication
- `mongoose` (9.1.6) — MongoDB ODM (verse-to-song only)
- `axios` (1.13.5) — HTTP client (Suno API)
- `dotenv` (17.2.4) — Environment variables
- `puppeteer` (24.37.2) — (Unused in runtime, likely for testing)

### Key Scripts
- `scripts/generate_ai_quizzes.js` — Generate quiz data via OpenRouter API
- `scripts/seed-category-styles.js` — Seed 22 music style categories
- `scripts/seed-one-verse-per-category.js` — Seed 1 song per category (testing)
- `scripts/seed-top-verses.js` / `generate-5-per-category.js` — Seed songs at scale

### Test Files (ad-hoc, no framework)
- `test/game-integration-test.js` — Integration test (needs running server)
- `test/test-game-config.js` — GameConfig system tests
- `test/verse-song-test.js` — Verse song infrastructure validator
- `test/monster-spawn-debug.js` — Monster spawning debug

### Running
```bash
npm install
node server.js          # http://localhost:3500
```

### Deployment
```bash
# SSH as root, then switch to dcgame user
ssh root@109.123.227.158 "su - dcgame -c 'cd /var/www/dcgame.4you.tel && git pull' && kill \$(pgrep -f 'node /var/www/dcgame.4you.tel/server.js')"
# Auto-restarts via system process manager
```
