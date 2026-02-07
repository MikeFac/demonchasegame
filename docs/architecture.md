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
- `Game.js`: Main game loop and logic.
- `RoomManager.js`: Handles room lifecycle and user sessions.
- `MonsterManager.js`: Spawns and updates monsters.
- `PlayerManager.js`: Handles player movement and actions.
- `BulletManager.js`: Updates bullet positions and collision detection.

### Client-side (`src/client/`)
- `Network.js`: Wrapper around Socket.IO client.
- `Renderer.js`: Canvas rendering logic.
- `InputHandler.js`: Input management.
- `UILayout.js`: UI positioning constants.

### Shared (`src/shared/`)
- `Constants.js`: World dimensions, configuration constants.
- `LevelConfig.js`: Level-specific settings (monsters per level, speed, etc.).
