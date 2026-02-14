# System Architecture

## Client-Server Architecture

The game uses a standard client-server architecture with authoritative server logic for critical game state, but client-side prediction for responsiveness.

### Server (`server.js`)
- **Role**: Manages game state, handles room logic, validates actions, and broadcasts updates.
- **Game Logic**: Encapsulated in `Game.js`.
- **Room Management**: `RoomManager.js` handles user sessions, room creation/joining/leaving.
- **State**: Maintains a `gameState` object containing players, monsters, bullets, etc.
- **Loop**: Runs a game loop at ~60 ticks/second (~16.7ms interval) to update physics and entities.
- **Communication**: Emits `gameStateUpdate` events to clients.

### Client (`game.js`)
- **Role**: Renders the game state, handles user input, and sends actions to server.
- **Rendering**: `Renderer.js` draws the game state to an HTML5 Canvas.
- **Input**: `InputHandler.js` captures mouse clicks and converts them to game actions (move, shoot, UI).
- **Rendering**: Uses a local player object for the current player's position to avoid visual jitter from server round-trips.
- **Synchronization**: Replaces local state with server state on each `gameStateUpdate` received.

## Data Flow

1.  **Input**: User clicks to move or shoot.
2.  **Client Action**: Client updates local state (prediction) and sends event (`playerPosition`, `playerShoot`) to server via Socket.IO.
3.  **Server Validation**: Server receives event, validates it (e.g. checks ammo), updates authoritative state.
4.  **Broadcast**: Server broadcasts updated `gameState` to all clients in the room.
5.  **Reconciliation**: Client receives new state and updates local view.

## Modules

### Server-side (`src/server/`)
- `Game.js`: Main game loop, state management, server-side level completion detection.
- `RoomManager.js`: Handles room lifecycle, user sessions, map style storage.
- `entities/MonsterManager.js`: Spawns and updates monsters, demon abilities (armor, dash, erratic), level-scaling HP.
- `entities/PlayerManager.js`: Handles player movement and actions.
- `entities/BulletManager.js`: Updates bullet positions and collision detection.
- `entities/CollectibleManager.js`: Armor of God item spawning (1 random per level).
- `config/GameConfig.js`: Difficulty presets and quiz settings validation.
- `utils/map-generators/`: 5 pluggable map styles (Classic, Narrow, Labyrinth, City, Open).

### Client-side (`src/client/`)
- `Network.js`: Socket.IO wrapper with armor absorb, level progress events.
- `Renderer.js`: Canvas rendering with demon ability visuals (freeze aura, armor indicator, dash glow).
- `InputHandler.js`: Input management and coordinate conversion.
- `QuizManager.js`: 5 quiz modes with weighted selection.
- `UILayout.js`: UI positioning constants.

### Shared (`src/shared/`)
- `Constants.js`: World dimensions, demon ability parameters, game configuration.
- `LevelConfig.js`: 5 levels with monstersToKill targets, scaling spawn rates (4s→2s).
