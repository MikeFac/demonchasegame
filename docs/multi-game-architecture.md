# Multi-Game Architecture Analysis

**Current Status**: ⚠️ **Not Supported**

The current codebase has the *structure* for multiple games (Rooms, Game Instances), but the **Game Logic** prevents them from running simultaneously without interference.

## The Issue: Global Broadcasting

While `server.js` correctly creates a separate `Game` instance for each Room, the `Game` class itself broadcasts its state to **ALL** connected sockets, regardless of which room they are in.

### Technical Detail

In `src/server/Game.js`, the update loop uses:

```javascript
// ❌ Current Implementation
this.io.emit('gameStateUpdate', this.gameState); 
```

`io.emit` sends the message to the "default" namespace, which includes every connected client.

### The Result

If two rooms are active (e.g., "Room A" and "Room B"):
1.  **Game Instance A** calculates state -> Broadcasts to everyone.
2.  **Game Instance B** calculates state -> Broadcasts to everyone.
3.  **Client (You)** receives interleaved updates from both Game A and Game B.
4.  **Effect**: The game will flicker, players will teleport between positions, and the game state will be unplayable.

## The Fix: Room Scoping

We need to modify `src/server/Game.js` to emit events *only* to the sockets that have joined the specific `roomId`.

The `Game` constructor already accepts a `roomId`, we just need to use it.

### Required Changes

Replace all instances of `this.io.emit` with a scoped emit:

```javascript
// ✅ Correct Implementation
if (this.roomId) {
    // Broadcast only to this room
    this.io.to(this.roomId).emit('gameStateUpdate', this.gameState);
} else {
    // Fallback for legacy/solo mode (global broadcast)
    this.io.emit('gameStateUpdate', this.gameState);
}
```

This needs to be applied to:
*   `gameStateUpdate` (The main game loop)
*   `monsterKilled`
*   `playerHit`
*   Any other game events.

## Verification

Once applied:
1.  Open two browser tabs.
2.  Create "Room 1" in Tab A.
3.  Create "Room 2" in Tab B.
4.  Ensure movement in Room 1 does **not** affect the state in Room 2.
