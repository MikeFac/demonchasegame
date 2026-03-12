# DC Game — Data Flow & Event Reference

This document maps how data flows between all components and every Socket.IO event in the system.

**Last Updated:** 2026-03-08

---

## 1. State Ownership Map

| State | Owner | Sync Mechanism |
|-------|-------|----------------|
| Player position | Client (predicted) | Client sends `playerPosition`, server trusts |
| Player health | Server | Broadcast via `gameStateUpdate` |
| Player XP/level | Server | Broadcast via `gameStateUpdate` |
| Player ammo | Server | Awarded on `quizCorrect`, broadcast |
| Player combat category | Server | Set from `quizCorrect` / `setCombatCategory`, broadcast |
| Monsters (position, health) | Server | Updated each frame, broadcast |
| Bullets | Server | Created on `playerShoot`, physics on server |
| Walls/Maze | Server | Sent once via `walls` event per level |
| Healing/Shield Points | Server | Spawned by Game.js, broadcast |
| Quiz state (currentQuiz) | Client | Generated locally by QuizManager |
| Quiz settings | Shared | Client sliders → server validates → broadcasts back |
| Shield inventory/active | Client | Collected client-side, duration client-side |
| Monster damage to player | **Client** | Client calculates, sends via `playerHit` |
| Verse test state | Client | VerseTestScreen.js manages entirely |
| Daily challenge | Client | localStorage persistence |
| Verses learned | Client | localStorage persistence |
| Menu state | Client | game.js global `menuOpen` |
| Game mode | Client | `gameMode` in game.js ('overland', 'game', 'review', 'votd') |
| Current mission | Client | `currentMission` / `currentMissionConfig` in game.js |
| Mission progress | Client | ProgressManager → localStorage `missionProgress` |
| Overland map state | Client | OverlandRenderer (selected world/mission, node positions) |
| Sermon content | Server | SermonService generates, Sermon model caches in MongoDB |

---

## 2. Game State Broadcast Cycle

### What's Broadcast (every 50ms)

```javascript
gameState = {
    players: {
        "abc123": { x, y, health, maxHealth, xp, level, ammo, width, height, color, playerCode }
    },
    monsters: [
        { id, x, y, health, maxHealth, width, height, demonType, maxDamage, isAttacked, showHealth, speed, behavior }
    ],
    healingPoints: [
        { id, x, y, width, height }
    ],
    shieldPoints: [
        { id, x, y, width, height }
    ],
    bullets: [
        { id, x, y, radius }
    ],
    connectedPlayers: 1,
    gameLevel: 1,
    maxSpawns: 25,
    spawnsLeft: 25,
    monstersKilled: 0,
    monstersToKill: 15,
    terrainTheme: "stone"
}
```

### What's NOT in Broadcasts
- **Walls**: Sent once via `walls` event (too large for 50ms broadcast)
- **Quiz data**: Generated client-side
- **Player animations**: Client-only (currentFrame, facingDirection, isMoving)
- **Visual effects**: Client-only (screenShake, damageNumbers, deathParticles, flashMessages)

### Client Reconciliation (updateGameState)

```
Server state arrives every 50ms
  → Preserve local player dimensions (width, height from sprite)
  → Position reconciliation:
     If drift < 60px: keep local prediction (trust client movement)
     If drift ≥ 60px: blend 30% toward server position
  → Trust server for: health, XP, level, ammo, combat category
  → Replace: monsters array, healingPoints, shieldPoints, bullets
```

---

## 3. Complete Socket.IO Event Map

### Connection Phase

```
Client connects → io()
Server: 'connection' event fires
  ↓
Client → 'startSoloGame' { difficulty: 'normal', quizSettings: {...}, gameSpeed: 'normal', mapStyle: 'classic' }
  OR
Client → 'joinGame' roomId
  ↓
Server creates/finds Game instance
Server: game.addPlayer(socket)
  ↓
Server → 'playerCode' "abc123"           // Client stores for ownership
Server → 'playerNumber' 1                // Client loads sprite
Server → 'walls' { walls, gridFlat, rows, cols, cellSize, spawnX, spawnY }
Server → 'gameConfig' { quizSettings, isSoloGame, preset, ... }
Server → 'gameStateUpdate' { initial full state }
```

### Gameplay Loop

```
Every 50ms:
  Server → 'gameStateUpdate' { full gameState }

Every 100ms:
  Client → 'updatePlayerData' { playerCode, playerData: { x, y, health, ... } }

On movement:
  Client → 'playerPosition' { x, y }

On quiz correct:
  Client → 'quizCorrect' { category }
  Server: player.ammo += AMMO_REWARD (2), player.currentCombatCategory = category

On shooting:
  Client → 'playerShoot' { x, y } (target world coords)
  Server: check ammo ≥ 1, decrement, create bullet
  Server → 'bulletHit' { x, y, damage, baseDamage, multiplier, category, monsterType }
  Server → 'monsterKilled' { monsterId, x, y }  // If monster dies

On melee combat:
  Client → 'playerAttack' { monsterId, damage: 2 }  // Legacy melee
  Client → 'playerHit' damage (number)                // Monster → player (CLIENT CALCULATED)

On collecting items:
  Client → 'collectHealingPoint' healingPointId
  Server: remove point, player.health += 25
  Client → 'collectShield' shieldId
  Server: remove point (client manages shield duration)
```

### Level Transitions

```
Server detects monstersKilled >= monstersToKill (or client sends 'levelCompleted' as backup):
  Server sets _levelAdvancing flag (prevent duplicates)
  Server → 'levelAdvancing' { countdown: 5 }

After 5s:
  Server: resetLevelData(nextLevel)
    - Regenerate map (using selected map style)
    - Teleport all players
    - Spawn 1 random armor collectible
    - Reschedule monster spawning at new rate
  Server → 'walls' { new walls, grid, spawn }   // To all sockets
  Server continues broadcasting gameStateUpdate with new level data
```

### Mission Flow (Solo Missions via Overland Map)

```
gameMode = 'overland'
  Player opens game → MissionClient.initialize() → loads chapters.json
  OverlandRenderer draws map nodes (locked/unlocked/completed)
  Player clicks mission node
    ↓
  startMission(worldId, missionId)
    → MissionClient.getMission(worldId, missionId)
    → missionToGameConfig(mission) → single-level config
    → Preserve currentMission reference
    → resetGameState()
    → Restore currentMission after reset
    → startGame() with mission config
    → gameMode = 'game'
    ↓
  GameEngine runs (single level, mission-specific monsters/speeds/qualities)
    → monstersKilled >= monstersToKill
    → GameLifecycle.endGame('victory')
    ↓
  onGameEnded event fires (game.js callback)
    → Game-over modal with mission stats
    → Player clicks "Continue"
    → completeMission(stars, xpEarned)
    → ProgressManager records completion + unlocks next chapter if eligible
    → gameMode = 'overland' (return to map)
```

### Game Mode Transitions

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  START   │───▶│OVERLAND │───▶│  GAME   │───▶│ VICTORY │──┘
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │              │
                    │              ▼
                    │         ┌─────────┐
                    │         │  VOTD   │ (Verse of the Day learning)
                    │         └─────────┘
                    │
                    ▼
               ┌─────────┐
               │ REVIEW  │ (Verse review/study)
               └─────────┘
```

### GameEngine Events (Emitter-based, not Socket.IO)

```
GameEngine emits:
  'gameStateUpdate'  → Full gameState (every frame)
  'levelAdvancing'   → { countdown: 5, nextLevel: N }
  'gameEnded'        → { result: 'victory'|'defeat', level, monstersKilled, playerStats }
  'playerLeftGame'   → { code, username }
  'monsterKilled'    → { monsterId, x, y }
  'bulletHit'        → { x, y }
  'levelProgress'    → { killed, required }
  'armorAbsorb'      → { monsterId, armorLeft }

Per-player (via registerPlayerSend):
  'walls'            → Wall grid data for rendering
  'playerCode'       → Unique player identifier
  'playerNumber'     → Sprite number (1-4)
  'gameConfig'       → Quiz settings, difficulty config
```

### Multiplayer Lobby Events

```
Client → 'authenticate' { sessionToken }
Client → 'getRooms'
Server → 'roomList' [rooms]

Client → 'createRoom' { preset, quizSettings, maxPlayers, ... }
Server → 'roomCreated' { room }
Server → 'roomUpdated' { room }   // To all lobby clients

Client → 'joinRoom' { roomId }
Server → 'roomJoined' { room }
Server → 'roomUpdated' { room }

Client → 'setReady' { roomId, ready }
Server → 'roomUpdated' { room }

Host → 'startGame' { roomId }
Server → 'gameStarted' { roomId }  // All room members redirect to /?room=ID
```

---

## 4. Data Flow Diagrams

### Quiz → Combat Flow

```
                    QuizManager
                        │
        selectMode() (weighted random from quizSettings)
                        │
                ┌───────┼───────────┐──────────┐──────────┐
                │       │           │          │          │
           first_letter missing_word category   true_false verse_test
                │       │         match        │          │
                └───────┴───────────┴──────────┘          │
                        │                          VerseTestScreen
                 currentQuiz set                   overlay launched
                        │                                 │
              Renderer draws quiz               Player picks letters
              options as buttons                         │
                        │                          pass: ammo+5, HP+10
              Player clicks option                fail: no penalty
                        │
              handleQuizAnswer()
               ┌────────┴────────┐
            correct           incorrect
               │                  │
         ammo += 2         show full verse 3s
         show verse 3s     track incorrect ref
         send quizCorrect         │
         track learning     after 3s: pickQualityVerse()
               │
        after 3s: pickQualityVerse()
```

### Combat → Server Flow

```
         Player clicks monster
               │
         network.sendShoot({x, y})
               │
    ┌──────────┴──────────────┐
    │    Server (Game.js)     │
    │  Check ammo ≥ 1         │
    │  Decrement ammo         │
    │  BulletManager.addBullet│
    └──────────┬──────────────┘
               │
         BulletManager.update()  (every 16ms)
         Move bullet, check collisions
               │
        ┌──────┼──────┐
     wall    monster  out-of-bounds
     hit      hit      │
      │        │     deactivate
   deactivate  │
               │
      MonsterManager.damageMonster()
      health -= BULLET_DAMAGE (2)
               │
          health ≤ 0?
        ┌──────┴──────┐
       yes            no
        │              │
   remove monster   emit bulletHit
   award +10 XP     (sound effect)
   level-up check
   emit monsterKilled
        │
   Client: death particle
   animation + sound
```

### Config Flow

```
         index.html Sliders
    ┌─────┬─────┬──────┬───────┬──────┐
    │25%  │25%  │20%   │15%    │15%   │
    │FL   │MW   │CM    │TF     │VT    │
    └──┬──┴──┬──┴──┬───┴───┬───┴──┬───┘
       └─────┴─────┴───────┴──────┘
                   │
         getQuizSettingsFromSliders()
                   │
    ┌──────────────┴───────────────┐
    │  Solo: startSoloGame event   │
    │  Multi: createRoom options   │
    └──────────────┬───────────────┘
                   │
    ┌──────────────┴───────────────┐
    │  Server: validateQuizSettings│
    │  (5 keys, sum = 100)         │
    │  + difficulty preset         │
    └──────────────┬───────────────┘
                   │
    ┌──────────────┴───────────────┐
    │  GameConfig.createGameConfig │
    │  Apply multipliers to levels │
    │  Merge quiz settings         │
    └──────────────┬───────────────┘
                   │
    ┌──────────────┴───────────────┐
    │  Game constructor receives   │
    │  config, passes to managers  │
    └──────────────┬───────────────┘
                   │
    ┌──────────────┴───────────────┐
    │  Emit 'gameConfig' to client │
    │  Client syncs sliders        │
    │  (read-only in multiplayer)  │
    └──────────────────────────────┘
```

---

## 5. Module Dependency Graph

```
                       index.html
                           │
         ┌─────────────────┼──────────────────────┐
         │                 │                       │
    bible-verses.js   Shared Modules             game.js
         │            (Constants,                    │
         │             LevelConfig,                  │
         │             WallGrid,                     │
         │             UILayout,                     │
         │             GameEngine,         ┌─────────┼──────────┐
         │             GameLifecycle,      │         │          │
         │             GameConfig,      Overland  Mission   Progress
         │             ContentProvider, Renderer  Client    Manager
         │             FileContent-       .js      .js       .js
         │             Provider,            │        │
         │             MissionClient)       │  ContentProvider
         │                                  │  FileContentProvider
         │                                  │        │
         │    ┌───────┬───────┬───────┬─────┤        │
         │    │       │       │       │     │    /missions/*.json
         │ Network Renderer Input  Quiz   Local
         │   .js     .js    Handler Manager Network
         │                   .js    .js     .js
         │
         │    ┌───────┬───────┬───────┐
         │  Review  Verse   Sermon  VOTD
         │  Mode    Test    Viewer  Learning
         │  .js    Screen   .js    Mode.js
         │          .js       │
         │                    │
         │    ┌───────┐       │
         │  Music   VerseSong │
         │  Manager Service   │
         │   .js     .js      │
         │                    │
    server.js                 │
         │                    │
   ┌─────┼──────┬─────────┬──┘
   │     │      │         │
 Game  Room   VerseSong  Sermon
 .js  Manager Routes    Routes
   │    .js      │        │
   │         ┌───┼───┐  Sermon
   │        Suno  VS  CS Service
   │        Svc Model Model .js
   │
   │  (Game.js wraps shared GameEngine
   │   with Socket.IO emitter)
   │
   ├─────────┐
   │         │
 Monster  Player  Bullet  Collectible
 Manager  Manager Manager  Manager
   │         │       │        │
   └─────────┴───────┴────────┘
              │
         ┌────┼────┐
       Physics  MapGen  WallGrid
         .js   Factory   .js
               (5 styles)
```

---

## 6. localStorage Persistence

| Key | Type | Purpose |
|-----|------|---------|
| `dailyChallengeDate` | "YYYY-MM-DD" | Last played date (resets daily) |
| `dailyChallengeProgress` | "0"-"5" | Current daily progress |
| `dailyChallengeCompleted` | "true"/"false" | Daily challenge status |
| `versesLearned` | "0"-"1618" | Total unique verses learned |
| `learned_{reference}` | "true" | Per-verse learning flag |
| `verseTestShielded` | "true"/"false" | Test shield setting (Option A/B) |
| `missionProgress` | JSON object | Mission completions, unlocked chapters, stars, XP (see schema below) |

**Mission Progress Schema** (stored as JSON string):
```json
{
  "schemaVersion": 1,
  "completedMissions": ["faith-01", "faith-02"],
  "currentWorldId": "chapter1",
  "unlockedWorlds": ["chapter1", "chapter2"],
  "missionStars": { "faith-01": 3, "faith-02": 2 },
  "totalXP": 350,
  "lastPlayedAt": "2026-02-25T10:00:00Z"
}
```

---

## 7. Audio Assets

| Sound | File | Trigger |
|-------|------|---------|
| Bullet impact | `sounds/bullet_impact.mp3` | Bullet hits monster |
| Monster explosion | `sounds/monster_explosion.mp3` | Monster killed |
| Level up | `sounds/level_up.mp3` | Player levels up, daily challenge |
| Player hit | `sounds/player_attacked.mp3` | Monster damages player |
| Attack | `sounds/monster_attacked.mp3` | Player melee attacks monster |
| Healing recharge | `sounds/healing_recharge.mp3` | Collect healing/shield |
| Game over | `sounds/game_over.mp3` | Player dies |
| Verse audio | External URL (`.ogg`) | Review mode, verse test fail |
| Background music | `music/*.mp3` | Menu music toggle |
| Verse songs | MongoDB/Suno URLs | During gameplay (if available) |
