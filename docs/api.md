# API Documentation

## REST API
The server provides a few REST endpoints for user and room management.

### User Management
- **POST `/api/register`**
    - Body: `{ username: string }`
    - Response: `{ success: boolean, user: { id, username, sessionToken }, error?: string }`
    - Description: Registers a temporary user session.

- **POST `/api/login`**
    - Body: `{ sessionToken: string }`
    - Response: `{ success: boolean, user: { id, username, sessionToken }, error?: string }`
    - Description: Re-authenticates a user using a session token.

### Room Management
- **GET `/api/rooms`**
    - Response: `{ rooms: Array<Room> }`
    - Description: Lists all available (waiting) rooms.

## Socket.IO Events

### Client -> Server

| Event | Data | Description |
|---|---|---|
| `authenticate` | `sessionToken`, callback | Authenticate the socket connection. |
| `getRooms` | callback | Request a list of rooms. |
| `createRoom` | `options`, callback | Create a new room. |
| `joinRoom` | `roomId`, callback | Join an existing room. |
| `leaveRoom` | `roomId`, callback | Leave the current room. |
| `setReady` | `{ roomId, ready }`, callback | Toggle ready state. |
| `startGame` | `roomId`, callback | Host starts the game. |
| `playerPosition` | `{ x, y }` | Send updated player position. |
| `playerAttack` | `monsterId` | Attack a monster (deprecated mechanism?). |
| `playerShoot` | `{ x, y }` | Shoot a bullet towards target. |
| `playerHit` | `damage` | Notify server player took damage (Client-authoritative damage?). |
| `collectHealingPoint` | `formattedId` | Player collected a healing item. |
| `collectShield` | `shieldId` | Player collected a shield item. |
| `levelCompleted` | *(none)* | Player completed the current level. |
| `quizCorrect` | *(none)* | Player answered a quiz correctly. |

### Server -> Client

| Event | Data | Description |
|---|---|---|
| `roomListUpdated` | `{ rooms }` | Broadcasts updated room list to lobby. |
| `roomUpdated` | `{ room }` | Updates room state (players joining/leaving/ready). |
| `gameStarted` | `{ roomId }` | Signals game start to room members. |
| `gameStateUpdate` | `gameState` | Frequent game state broadcast (players, monsters, etc). |
| `playerCode` | `code` | Assigns the player their unique ID. |
| `playerNumber` | `number` | Assigns a sprite index (1-4). |
| `monsterKilled` | `{ monsterId }` | Notification that a monster died. |
