# Spawning into Walls Problem Analysis

## Problem Description

When players level up and transition to a new maze, they sometimes spawn inside walls (green areas), making them stuck and unable to move until they take damage or the game resets.

## Root Cause

**Race Condition Between Socket.IO Events During Level Transitions**

The level advancement system uses two separate Socket.IO events that can arrive at clients in unpredictable order:

1. **`gameStateUpdate`** (broadcast to all players) - Contains new player positions
2. **`walls`** (individual socket emits) - Contains new maze wall data

### Code Flow Analysis

In `src/server/Game.js:resetLevelData()` (lines 239-315):

```javascript
// 1. Generate new maze
const mazeResult = generateMaze(...);
this.walls = mazeResult.walls;
this.wallGrid = new WallGrid(...);
this.spawnX = mazeResult.spawnX;
this.spawnY = mazeResult.spawnY;

// 2. Teleport ALL players to safe spawn point
for (const playerCode in this.gameState.players) {
    this.gameState.players[playerCode].x = this.spawnX;
    this.gameState.players[playerCode].y = this.spawnY;
}

// 3. Broadcast state update to ALL clients
this.io.emit('gameStateUpdate', this.gameState);

// 4. Emit walls to EACH socket individually
for (const sock of this.sockets) {
    sock.emit('walls', wallData);
}
```

**The Race Condition:**

1. Server broadcasts `gameStateUpdate` with new player positions
2. Server emits `walls` to individual sockets
3. **Socket.IO does NOT guarantee delivery order** between broadcast emits and individual socket emits
4. Client may receive `gameStateUpdate` **before** receiving the new `walls` data

### Client-Side Impact

In `game.js`:

1. `updateGameState()` receives new player position (lines 1502-1510):
   ```javascript
   // Reconciliation: trust local prediction, only blend toward server if very far off
   const dist = Math.sqrt(Math.pow(serverPlayer.x - x, 2) + Math.pow(serverPlayer.y - y, 2));
   if (dist < 60) {
       player.x = x;
       player.y = y;
   }
   ```

2. Client still has **old maze's WallGrid** in `clientWallGrid`

3. `checkWallCollision()` (line 1624) uses the stale wall grid:
   ```javascript
   function checkWallCollision(x, y, width, height) {
       if (clientWallGrid) {
           return clientWallGrid.collides(x, y, width, height);
       }
       return false;
   }
   ```

4. Player appears to be "inside a wall" (green area) because the collision check is against the wrong maze

## Secondary Issue

There's also a subtle bug in the spawn validation in `src/server/utils/Maze.js` (lines 185-231):

The spawn point is chosen as the center of the first room, but the search algorithm only checks if the center point itself is walkable, not whether a 48×48px player placed at that point would overlap adjacent wall cells.

```javascript
// This checks if a single cell is walkable, not a 48x48 player area
if (isWalkable(testX, testY)) {
    spawnX = testX;
    spawnY = testY;
    found = true;
    break;
}
```

The maze generator creates 150px wide corridors, but player spawn validation uses a cell-based check that doesn't account for player dimensions properly.

## Why This Happens Intermittently

The race condition depends on:
- Network latency variations
- Socket.IO's internal message queuing
- Client processing speed
- Server load

In local development (localhost), messages typically arrive in order. Over real networks with latency, the order can vary.

## Recommended Fixes

### Option 1: Atomic Update (Recommended)

Include wall data directly in the `gameStateUpdate` broadcast during level transitions:

```javascript
// In resetLevelData()
const levelChangeData = {
    ...this.gameState,
    walls: this.walls,
    gridFlat: this._flattenGrid(),
    rows: this.mazeGridData.rows,
    cols: this.mazeGridData.cols,
    cellSize: this.mazeGridData.cellSize,
    isLevelChange: true  // Flag to indicate this includes wall data
};
this.io.emit('gameStateUpdate', levelChangeData);
```

Then update client to handle embedded wall data:

```javascript
// In updateGameState()
if (newGameState.isLevelChange && newGameState.gridFlat) {
    // Rebuild WallGrid from embedded data
    clientWallGrid = new WallGrid(...);
    clientWalls = newGameState.walls;
}
```

### Option 2: Sequential Emits with Acknowledgment

Emit walls first, wait for acknowledgment, then emit state update:

```javascript
// In resetLevelData()
const wallData = { /* ... */ };

// Emit to all sockets and wait
const emitPromises = this.sockets.map(sock => 
    new Promise(resolve => {
        sock.emit('walls', wallData, resolve);
    })
);

await Promise.all(emitPromises);
this.io.emit('gameStateUpdate', this.gameState);
```

Requires Socket.IO acknowledgments and async/await in Game.js.

### Option 3: Client-Side Validation

Add client-side check that prevents position updates until walls are received:

```javascript
// Track pending level changes
let pendingLevelChange = false;
let pendingPlayerPosition = null;

// In onWalls handler
pendingLevelChange = false;
if (pendingPlayerPosition) {
    player.x = pendingPlayerPosition.x;
    player.y = pendingPlayerPosition.y;
    pendingPlayerPosition = null;
}

// In updateGameState
if (newGameState.gameLevel !== currentLevel) {
    pendingLevelChange = true;
    pendingPlayerPosition = { x: serverPlayer.x, y: serverPlayer.y };
    // Don't update position yet
}
```

### Option 4: Fix Spawn Validation (Secondary)

Update Maze.js spawn validation to use proper player-sized collision check:

```javascript
// Use WallGrid.collides() instead of isWalkable()
const testWallGrid = new WallGrid(grid, rows, cols, cellSize);
if (!testWallGrid.collides(testX, testY, PLAYER_WIDTH, PLAYER_HEIGHT)) {
    spawnX = testX;
    spawnY = testY;
    found = true;
    break;
}
```

## Option 5: Movement Freeze (Implemented)

As a defensive measure to prevent the race condition from causing gameplay issues, the client now **freezes player movement during level transitions** until the new maze data is fully received.

### Implementation Details

**Added in `game.js`:**

```javascript
// Movement freeze state variables
let movementFrozen = false;
let levelTransitionStartTime = 0;
const MAX_TRANSITION_FREEZE_MS = 10000; // Safety timeout: 10 seconds max freeze
```

**Freeze trigger in `onLevelAdvancing`:**
```javascript
onLevelAdvancing: (data) => {
    // ... existing countdown code ...
    
    // Freeze movement during level transition
    movementFrozen = true;
    levelTransitionStartTime = Date.now();
    console.log('Movement frozen during level transition');
}
```

**Unfreeze trigger in `onWalls`:**
```javascript
onWalls: (data) => {
    // ... existing wall processing ...
    
    // Unfreeze movement now that we have the new maze data
    if (movementFrozen) {
        movementFrozen = false;
        console.log('Movement unfrozen - walls received');
    }
}
```

**Movement block in game loop:**
```javascript
// Safety timeout: auto-unfreeze if walls never arrive
if (movementFrozen && Date.now() - levelTransitionStartTime > MAX_TRANSITION_FREEZE_MS) {
    movementFrozen = false;
    console.warn('Movement auto-unfrozen after safety timeout');
}

// Skip movement if frozen during level transition
if (movementFrozen) {
    if (inputHandler) {
        inputHandler.clearTarget();
    }
    player.isMoving = false;
    player.currentFrame = 0;
    player.frameTimer = 0;
} else if (worldTarget) {
    // Normal movement code...
}
```

**Visual indicator in `src/client/Renderer.js`:**
A blue overlay at the bottom of the screen displays "⚡ LOADING NEW MAZE - MOVEMENT PAUSED ⚡" when `movementFrozen` is true.

### Why This Works

1. **Prevents spawning into walls**: Even if the race condition occurs and player position updates before wall data, the player cannot move until walls arrive
2. **Clear user feedback**: Players see exactly why they can't move
3. **Safety timeout**: 10-second maximum freeze prevents permanent lock if walls event is lost
4. **Cancels pending movement**: Clears movement target so player doesn't auto-move when unfrozen

### Trade-offs

- **Brief immobility**: Players can't move for ~100-500ms during transition
- **Visual clutter**: Additional UI element during transitions
- **Edge cases**: If walls never arrive, 10s timeout may feel like a freeze bug

## Files Affected

- `src/server/Game.js` - `resetLevelData()` method
- `game.js` - `updateGameState()` and `onWalls` handlers, movement freeze logic
- `src/client/Renderer.js` - Visual indicator for frozen state
- `src/server/utils/Maze.js` - Spawn point generation (secondary issue)

## Testing Recommendation

To reproduce consistently:
1. Add artificial delay to `onWalls` handler on client
2. Monitor for cases where `updateGameState` arrives before `walls` during level transition
3. Log timing: `console.log('State update received, walls pending:', !clientWallGrid)`
4. Verify movement freeze indicator appears during transitions

To reproduce consistently:
1. Add artificial delay to `onWalls` handler on client
2. Monitor for cases where `updateGameState` arrives before `walls` during level transition
3. Log timing: `console.log('State update received, walls pending:', !clientWallGrid)`
