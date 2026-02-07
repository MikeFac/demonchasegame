# Game Architecture Documentation
## Overview of Improvements (Claude Opus 4.6)

### Key Architectural Improvements

1. **Server-Side Authority (Source of Truth)**
   - All game state mutations now happen on the server
   - Client receives state updates via Socket.IO broadcasts
   - Eliminates client-side prediction/desync issues
   - Files: `Game.js`, `MonsterManager.js`, `PlayerManager.js`

2. **Manager Pattern Implementation**
   - `MonsterManager`: Handles monster spawning, movement, damage, death
   - `PlayerManager`: Handles player connections, movement validation, attacks
   - `BulletManager`: Handles projectile physics and collision
   - Clean separation of concerns from monolithic server.js

3. **Shared Configuration**
   - `LevelConfig.js`: Level data shared between client and server
   - `Constants.js`: Game constants shared between client and server
   - Prevents configuration drift between client and server

4. **Physics Utilities**
   - `Physics.js`: Centralized collision detection
   - `isOverlapping()`: AABB collision for walls, monsters, players
   - `findNearestPlayer()`: AI helper for chaser monsters
   - `checkCollisionCircleRect()`: Bullet collision detection

5. **Room/Lobby System**
   - `RoomManager.js`: Multiplayer lobby functionality
   - Supports solo play (backward compatibility) and multiplayer rooms
   - Game instances scoped to rooms via `gameInstances` Map

---

## BUG IDENTIFIED: Monsters Not Moving

### Location
File: `src/server/entities/MonsterManager.js`
Method: `updateMonsters()` (line 149)

### Root Cause
**The monster movement code exists and executes, but the movement magnitude may be too small or the broadcast happens after the state is reset.**

Looking at the code flow:
1. `Game.update()` calls `monsterManager.updateMonsters()` (line 153)
2. `updateMonsters()` modifies `gameState.monsters` array directly (in-place mutations)
3. `Game.update()` broadcasts `this.gameState` to all clients (line 159)
4. Client receives update and overwrites local monsters array (`game.js` line 88-120)

### Movement Logic (Lines 149-214)
```javascript
updateMonsters() {
    const { gameState, levelData } = this;
    const currentLevelData = levelData[gameState.gameLevel];
    const speed = currentLevelData.monsterSpeed; // 5, 7, or 9

    gameState.monsters.forEach(monster => {
        if (monster.chaser) {
            // Chaser behavior: move toward nearest player
            let nearestPlayer = Physics.findNearestPlayer(monster, gameState);
            if (nearestPlayer) {
                let dx = nearestPlayer.x - monster.x;
                let dy = nearestPlayer.y - monster.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                // Calculate new position using normalized vector * speed
                const newX = monster.x + (dx / distance) * speed;
                const newY = monster.y + (dy / distance) * speed;

                // Wall collision check before moving
                if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id)) {
                    monster.x = newX;
                    monster.y = newY;
                }
            }
        } else {
            // Random walker behavior
            if (monster.walkingDistance === undefined) {
                monster.walkingDistance = Math.random() * (Constants.MAX_WALK_DISTANCE - Constants.MIN_WALK_DISTANCE) + Constants.MIN_WALK_DISTANCE;
                monster.angle = Math.random() * 2 * Math.PI;
            }

            let dx = Math.cos(monster.angle) * speed;
            let dy = Math.sin(monster.angle) * speed;

            const newX = monster.x + dx;
            const newY = monster.y + dy;

            if (!Physics.isOverlapping(newX, newY, Constants.MONSTER_WIDTH, Constants.MONSTER_HEIGHT, gameState, monster.id)) {
                monster.x = newX;
                monster.y = newY;
                monster.walkingDistance -= speed;
            } else {
                // Hit wall, pick new direction
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }

            if (monster.walkingDistance <= 0) {
                monster.walkingDistance = undefined;
                monster.angle = undefined;
            }
        }

        // Update health bar position to follow monster
        monster.healthBar.x = monster.x - monster.width / 2;
        monster.healthBar.y = monster.y - monster.height / 2 - 10;
        monster.healthBar.width = (monster.health / 10) * monster.width;

        // Handle health bar visibility timeout
        if (monster.showHealthTimeout && Date.now() > monster.showHealthTimeout) {
            monster.showHealth = false;
            monster.showHealthTimeout = null;
        }
    });
}
```

### Potential Issues to Investigate

1. **Update Loop Timing**: The game loop runs every 50ms (20 ticks/second). With speed=5 and 20 ticks/sec, monsters could move up to 100 pixels/second if not blocked.

2. **Collision Detection**: `Physics.isOverlapping()` is called with the new position. If there's a collision, the monster doesn't move. Monsters might be constantly colliding with:
   - Other monsters
   - Walls
   - Players

3. **Wall Collision**: The maze generation creates many walls. Monsters spawn using grid-based valid positions but may get stuck if walls shift or collision detection is too aggressive.

4. **Distance Calculation**: For chasers, if `distance` is very small, the normalized vector could cause jitter or division issues (though distance=0 would cause NaN).

5. **State Broadcast**: The game state is broadcast after all updates. Ensure `this.io.emit('gameStateUpdate', this.gameState)` is actually reaching clients.

### Debug Recommendations

Add logging to `updateMonsters()`:
```javascript
console.log(`Updating ${gameState.monsters.length} monsters, speed=${speed}`);
gameState.monsters.forEach((monster, i) => {
    console.log(`Monster ${i}: pos=(${monster.x.toFixed(1)}, ${monster.y.toFixed(1)}), type=${monster.chaser ? 'chaser' : 'walker'}`);
});
```

Add logging to client state reception:
```javascript
// In game.js updateGameState()
console.log('Received gameState with monsters:', newGameState.monsters?.length);
newGameState.monsters?.forEach((m, i) => {
    console.log(`Monster ${i}: pos=(${m.x.toFixed(1)}, ${m.y.toFixed(1)})`);
});
```

---

## Data Flow Summary

### Server-Side Game Loop (Game.js)
```
start() 
  └── setInterval() every 50ms
       └── update()
            ├── monsterManager.updateMonsters()  // Move monsters
            ├── bulletManager.update()            // Move bullets
            └── io.emit('gameStateUpdate')        // Broadcast state
```

### Client-Side Update (game.js)
```
Socket receives 'gameStateUpdate'
  └── updateGameState(newGameState)
       ├── Merge newGameState into local gameState
       ├── Map monsters array (adds client-side healthBar objects)
       └── Update local player stats from server
```

### Monster Spawning Flow
```
Game.start()
  └── setInterval() every 2000ms
       └── monsterManager.spawnMonster()
            ├── Check: connectedPlayers > 0
            ├── Check: monsters.length < maxMonsters
            ├── Find valid spawn position (grid-based)
            ├── Create monster object with chaser/walker flag
            └── io.emit('gameStateUpdate')
```

---

## Fixed Issues (from git log)

- Source of truth moved to server (no client-authoritative movement)
- Monster spawning fixed (was checking wrong condition)
- Bullet system implemented with proper collision
- Wall collision working for players and monsters
- XP/Level system synced between client and server
- Ammo management server-side
- Player sprite assignment (1-4) with wrapping
- Game Over stops gameplay
- Damage calculation standardized
- Healing point and shield point collection synced

---

## File Structure

```
/home/michael/proj/dcgame/
├── server.js                 # Entry point, Express + Socket.IO setup
├── game.js                   # Client-side game logic
├── src/
│   ├── server/
│   │   ├── Game.js           # Main server game loop
│   │   ├── RoomManager.js    # Multiplayer lobby logic
│   │   ├── entities/
│   │   │   ├── MonsterManager.js  # Monster AI and spawning
│   │   │   ├── PlayerManager.js   # Player connection/movement
│   │   │   └── BulletManager.js   # Projectile system
│   │   └── utils/
│   │       ├── Physics.js    # Collision detection
│   │       └── Maze.js       # Wall generation
│   ├── client/
│   │   ├── InputHandler.js   # Mouse/keyboard input
│   │   ├── Renderer.js       # Canvas rendering
│   │   ├── UILayout.js       # UI positioning constants
│   │   └── Network.js        # Socket.IO client wrapper
│   └── shared/
│       ├── Constants.js      # Game constants (shared)
│       └── LevelConfig.js    # Level data (shared)
```

---

## Key Constants

- `WORLD_WIDTH/WORLD_HEIGHT`: 2000x2000 (game world size)
- `CANVAS_WIDTH/CANVAS_HEIGHT`: 400x600 (viewport)
- `MONSTER_SPEED`: 5 (level 1), 7 (level 2), 9 (level 3)
- `PLAYER_SPEED`: 5 (level 1), 6 (levels 2-3)
- `MONSTER_WIDTH/MONSTER_HEIGHT`: 50x50
- `BULLET_SPEED`: 15, `BULLET_DAMAGE`: 2
- `AMMO_COST`: 1, `AMMO_REWARD`: 5
