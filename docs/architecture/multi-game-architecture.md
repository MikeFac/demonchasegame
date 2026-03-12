# Multi-Game Architecture Analysis

**Current Status**: ✅ Supported

**Last Updated:** 2026-03-08

## Summary

The game now supports multiple simultaneous room-scoped game instances. The shared engine is instantiated once per room, and `src/server/Game.js` emits gameplay events through a room-aware emitter rather than global Socket.IO broadcasts.

## Current Architecture

- `server.js` creates one `Game` per active room and stores it in `gameInstances`
- `src/server/Game.js` wraps the shared `GameEngine` with an emitter that uses `io.to('room:' + roomId).emit(...)`
- solo games use isolated room IDs of the form `solo-{socketId}`
- lobby membership and gameplay membership stay separate until clients call `joinGame`

## What This Fixes

Two active rooms no longer receive each other's:

- `gameStateUpdate`
- `monsterKilled`
- `bulletHit`
- `levelAdvancing`
- other room-scoped gameplay events

## Remaining Practical Risks

Room isolation is not the main multiplayer risk anymore. The current problems are more likely to be client-side desync or input issues, such as:

- clients overwriting a server-assigned spawn on `walls` receipt
- missing movement input on mobile
- stale local UI/input state during transitions

Recent fixes addressed:

- per-player spawn reconciliation on `walls`
- explicit touch input handling for mobile gameplay

## Verification

To verify room isolation:

1. Open two separate multiplayer rooms.
2. Start a game in both rooms.
3. Move and shoot in Room A.
4. Confirm clients in Room B do not receive position, monster, or combat state changes from Room A.
