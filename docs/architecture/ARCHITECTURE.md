# Game Architecture Documentation

**Last Updated:** 2026-02-27

## Overview

Server-authoritative multiplayer Bible verse quiz game with top-down dungeon combat. Players fight demons by answering quizzes to earn ammo. Features a chapter-based mission system with overland map, AI devotional sermons, and verse-of-the-day learning mode.

### Key Architectural Principles

1. **Server-Side Authority (Source of Truth)**
   - All game state mutations happen on the server (or shared GameEngine)
   - Client receives state updates via Socket.IO broadcasts (multiplayer) or local emitter (solo missions)
   - One exception: Monster damage to player is client-calculated for responsiveness

2. **Shared Game Engine (src/shared/)**
   - `GameEngine.js`: Environment-agnostic game loop, works on both server (Node.js) and client (browser)
   - `GameLifecycle.js`: Level transitions, game end conditions, grace periods
   - `GameConfig.js`: Difficulty presets, quiz balance validation
   - Server's `Game.js` wraps GameEngine with Socket.IO-specific emitter
   - Client can run GameEngine locally for offline solo missions via `LocalNetwork.js`

3. **Manager Pattern**
   - `MonsterManager`: Monster spawning, AI movement, damage, special abilities
   - `PlayerManager`: Player connections, spawn validation, health/XP
   - `BulletManager`: Projectile physics, wall/monster collision
   - `CollectibleManager`: Armor of God items, healing/shield spawning

4. **Content Provider Abstraction (Missions)**
   - `ContentProvider` → abstract interface for loading worlds/missions
   - `FileContentProvider` → loads from `/missions/*.json` files
   - Future: `DatabaseContentProvider` → loads from MongoDB API
   - `MissionClient` → frontend wrapper, converts mission config to GameEngine format

5. **Room/Lobby System**
   - `RoomManager.js`: Multiplayer lobby, auth, room management
   - Game instances scoped to rooms via `gameInstances` Map
   - Solo players get room ID `solo-{socketId}`

---

## Data Flow Summary

### Server-Side Game Loop (GameEngine)
```
start()
  └── setInterval() every 16ms (60fps)
       └── update()
            ├── monsterManager.updateMonsters()  // Move monsters, AI
            ├── bulletManager.update()            // Move bullets, collision
            ├── checkGracePeriods()               // Disconnect cleanup
            ├── checkGameEnd()                    // All players dead?
            ├── Level completion check            // monstersKilled >= target
            └── emitter.emit('gameStateUpdate')   // Broadcast state
```

### Client-Side Update (game.js)
```
Receives 'gameStateUpdate' (via Socket.IO or local emitter)
  └── updateGameState(newGameState)
       ├── Preserve local player dimensions (from sprite image)
       ├── Position blend: < 60px drift → keep local, ≥ 60px → 30% blend
       ├── Trust server for health, XP, level, ammo
       └── Replace monsters, healingPoints, shieldPoints, bullets
```

### Mission Flow (Overland → Game → Victory)
```
gameMode = 'overland' → Player clicks mission node
  → MissionClient.getMission() → missionToGameConfig()
  → resetGameState() (preserves currentMission across reset)
  → GameEngine runs single-level mission
  → monstersKilled >= monstersToKill → endGame('victory')
  → completeMission() → ProgressManager records stars + XP
  → gameMode = 'overland'
```

---

## Fixed Issues

### Core Game
- Server-authoritative game state (eliminated client desync)
- Monster spawning (was checking wrong condition)
- Bullet system with proper wall/monster collision
- XP/Level system synced between client and server
- Ammo management server-side
- Player sprite assignment (1-4) with wrapping
- Game Over stops gameplay correctly
- Healing point and shield point collection synced
- Demon special abilities (Freezing Aura, Armored Shell, Spirit Drain, Dash, Erratic)

### Missions System (feature/missions branch)
- Mission spawn rate: Fixed ms/seconds confusion in spawnRate config
- Game cleanup on restart: Comprehensive `resetGameState()` prevents stale state
- Stale overland click handler: Removed handler that restarted game mid-mission
- Mission victory flow: Now correctly returns to overland instead of reloading page
- `currentMission` preservation: Maintained across `resetGameState()` calls
- Position sync: Server position used when local is undefined (initial spawn)
- Offline mode: Always uses local player position to avoid undefined errors

---

## File Structure

```
/home/michael/proj/dcgame/
├── server.js                 # Entry point, Express + Socket.IO setup
├── game.js                   # Client-side orchestrator (game modes, state machine)
├── missions/                 # Mission content (JSON)
│   ├── chapters.json         # Chapter index with unlock requirements
│   ├── chapter1-foundations.json
│   ├── chapter2-love.json
│   └── chapter3-battle.json
├── src/
│   ├── server/
│   │   ├── Game.js           # Server game loop (wraps shared GameEngine)
│   │   ├── RoomManager.js    # Multiplayer lobby logic
│   │   ├── entities/
│   │   │   ├── MonsterManager.js  # Monster AI and spawning
│   │   │   ├── PlayerManager.js   # Player connection/movement
│   │   │   ├── BulletManager.js   # Projectile system
│   │   │   └── CollectibleManager.js  # Armor/healing/shield items
│   │   ├── routes/
│   │   │   └── sermon.js     # AI sermon REST endpoint
│   │   ├── services/
│   │   │   └── SermonService.js   # AI sermon generation
│   │   ├── models/
│   │   │   ├── Sermon.js     # Sermon cache model (MongoDB)
│   │   │   ├── VerseSong.js  # Verse song records
│   │   │   └── CategoryStyle.js   # Category music styles
│   │   └── utils/
│   │       ├── Physics.js    # Collision detection
│   │       ├── Maze.js       # Legacy maze generator
│   │       └── map-generators/    # 5 pluggable map styles
│   ├── client/
│   │   ├── Renderer.js       # Canvas rendering (class)
│   │   ├── InputHandler.js   # Click dispatch (class)
│   │   ├── Network.js        # Socket.IO client wrapper (class)
│   │   ├── LocalNetwork.js   # Offline/local event emitter
│   │   ├── QuizManager.js    # 5 quiz modes (IIFE)
│   │   ├── ReviewMode.js     # Verse review/study (IIFE)
│   │   ├── VerseTestScreen.js # First-letter test overlay (IIFE)
│   │   ├── UILayout.js       # UI positioning constants (IIFE)
│   │   ├── MusicManager.js   # Audio playback (IIFE)
│   │   ├── VerseSongService.js # Song API client (IIFE)
│   │   ├── OverlandRenderer.js # Campaign map drawing (class)
│   │   ├── ProgressManager.js  # Mission progress persistence (class)
│   │   ├── SermonViewer.js   # AI devotional viewer (IIFE)
│   │   └── VotdLearningMode.js # Verse memorization mode (IIFE)
│   └── shared/
│       ├── Constants.js      # Game constants (dual export)
│       ├── LevelConfig.js    # Level definitions (dual export)
│       ├── WallGrid.js       # O(1) spatial collision (dual export)
│       ├── GameEngine.js     # Environment-agnostic game loop
│       ├── GameLifecycle.js  # Level transitions, game end
│       ├── GameConfig.js     # Difficulty presets, validation
│       ├── ContentProvider.js # Abstract content interface
│       ├── FileContentProvider.js # File-based content loader
│       ├── MissionClient.js  # Mission content API client
│       └── entities/
│           └── PlayerManager.js # Shared player management
```

---

## Key Constants

- `WORLD_WIDTH/WORLD_HEIGHT`: 3000x3000 (game world size)
- `CANVAS_WIDTH/CANVAS_HEIGHT`: 400x600 (viewport)
- `CELL_SIZE`: 25px (collision grid)
- `PLAYER_WIDTH/PLAYER_HEIGHT`: 48x48
- `MONSTER_WIDTH/MONSTER_HEIGHT`: 48x48
- `BULLET_SPEED`: 15, `BULLET_DAMAGE`: 2
- `AMMO_REWARD`: 2 (quiz correct), `SHIELD_DURATION`: 10s
- `MONSTER_DROP_CHANCE`: 60%
