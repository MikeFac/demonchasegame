# Offline Single-Player PWA Plan

## Context

This document outlines how to convert Demon Chase into an offline-capable single-player Progressive Web App (PWA) for use in areas with limited or no internet access. The game originally started as single-player and the architecture still supports solo play — the server just needs to be moved client-side.

**Status: Future reference only. Not currently planned for implementation.**

> Note: Multiplayer remains the primary mode. This plan exists as a fallback for deployment contexts where internet is unavailable.

---

## Current State

### Already Client-Side
- Canvas rendering (Renderer.js)
- Input handling (InputHandler.js)
- Quiz logic and 4 quiz modes (QuizManager.js)
- Verse test screen (VerseTestScreen.js)
- Review mode (ReviewMode.js)
- All 1618 Bible verses with pre-generated quiz data (bible-verses.js, 1.4MB)
- Progress tracking via localStorage (daily challenge, verses learned)
- Shared modules: Constants.js, LevelConfig.js, WallGrid.js
- All image/sound assets

### Currently Server-Side (needs porting)
- Game loop and state management (Game.js)
- Monster spawning, AI movement, damage (MonsterManager.js)
- Bullet physics and collision detection (BulletManager.js)
- Player management, XP, leveling (PlayerManager.js)
- Wall/maze generation (Game.js resetLevelData)
- Healing point and shield spawning
- Level completion and advancement logic
- GameConfig difficulty presets (GameConfig.js)

### Requires Internet
- Socket.IO connection (even for solo play)
- Verse audio playback (streamed from spiritualwar.games)
- Verse song playback (Suno-generated, streamed from CDN)

---

## Implementation Plan

### Phase 1: Port Server Game Logic to Client (~1 week)

Create a new `src/client/LocalGame.js` module that replicates the server-side Game.js loop for single-player use.

**What to port:**

1. **Game loop** — Server runs at 60fps update with 50ms broadcast. Client already has `gameLoop()` at 60fps via requestAnimationFrame. The local version would update game state directly instead of receiving it via socket.

2. **MonsterManager** — Monster spawning (timer-based), AI movement (chase/wander), damage dealing. Already partially client-side (monster damage to player is calculated client-side in game.js lines 1240-1243).

3. **BulletManager** — Bullet creation, movement, wall collision, monster hit detection. Straightforward physics calculations.

4. **PlayerManager** — XP awards, level-up logic. Most of this already exists client-side (`updatePlayerLevel()`).

5. **Maze generation** — Wall grid creation happens in Game.js resetLevelData. Uses WallGrid.js which already runs on both sides.

6. **Collectible spawning** — Healing points and shield points spawned on timers. Simple random position + proximity check.

**Approach:** Don't refactor the server code. Instead, create a parallel client-only implementation that mimics the server behavior. This keeps the multiplayer server untouched.

```
src/client/LocalGame.js          — Game loop, state, level management
src/client/LocalMonsterManager.js — Spawn, AI, damage
src/client/LocalBulletManager.js  — Projectile physics
```

These modules would expose the same game state shape that `updateGameState()` in game.js already consumes, so the rendering pipeline stays unchanged.

### Phase 2: Remove Networking Dependency (~3 days)

Create a `src/client/OfflineAdapter.js` that provides the same interface as `Network.js` but routes everything locally:

```javascript
// Instead of:
network.sendAttack(attackData);  // → socket.emit → server → socket.emit back

// Offline adapter does:
offlineAdapter.sendAttack(attackData);  // → LocalGame.processAttack() → direct state update
```

**Key replacements:**
| Network call | Offline equivalent |
|---|---|
| `network.sendPosition(x, y)` | Direct state update (no-op, client IS the authority) |
| `network.sendAttack(data)` | `LocalGame.processAttack(data)` |
| `network.sendShoot(target)` | `LocalBulletManager.createBullet(player, target)` |
| `network.sendCollectHealingPoint(id)` | `LocalGame.collectHealing(id)` |
| `network.sendCollectShield(id)` | `LocalGame.collectShield(id)` |
| `network.sendPlayerHit(damage)` | Direct state update (already client-side) |
| `network.sendLevelCompleted()` | `LocalGame.advanceLevel()` |
| `network.sendStartSoloGame()` | `LocalGame.init(difficulty, quizSettings)` |

Game.js `startGame()` would detect offline mode and instantiate LocalGame + OfflineAdapter instead of Network + socket connection.

### Phase 3: PWA Setup (~2 days)

**manifest.json:**
```json
{
  "name": "Demon Chase",
  "short_name": "DemonChase",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#e94560",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker (sw.js):**
- Pre-cache all game assets on install (HTML, JS, CSS, images, sounds)
- Cache bible-verses.js (1.4MB — the critical data file)
- Serve from cache first, fall back to network
- Total cache size estimate: ~5-8MB without audio, ~50-100MB with verse audio

**Registration in index.html:**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Phase 4: Bundle Verse Audio (optional, ~2 days)

The spoken verse audio files are hosted on spiritualwar.games. For offline use:

**Option A: Bundle top verses (~8-15MB)**
- Include audio for ~200 most-used verses
- Graceful degradation: skip playback if audio not cached

**Option B: Bundle all verses (~50-100MB)**
- Full offline coverage for all 1618 verses
- Larger initial download but complete experience

**Option C: Cache-as-you-go**
- Service Worker caches verse audio on first play
- Builds up offline library over time with intermittent connectivity
- Best for areas with occasional internet access

Option C is recommended — it requires no upfront download and naturally prioritizes verses the player actually encounters.

---

## Architecture Comparison

```
CURRENT (Online):
  Browser → Socket.IO → Server (Game.js) → Socket.IO → Browser → Render

OFFLINE (PWA):
  Browser → OfflineAdapter → LocalGame.js → Direct state → Render
```

The rendering pipeline (Renderer.js, game.js gameLoop) stays identical. Only the data source changes.

---

## What's Lost in Offline Mode

| Feature | Status | Mitigation |
|---|---|---|
| Multiplayer | Not available | Core single-player loop is complete |
| Verse songs (Suno) | Not available | Spoken audio still works if cached |
| Server-side cheat prevention | Not needed | Single-player, no competitive element |
| Centralized analytics | Lost | Could sync localStorage when online |
| Remote verse updates | Lost | Bundle is self-contained (1618 verses) |
| Leaderboards | Not available | Could add local high scores |

---

## Deployment Options

### PWA (Recommended)
- No app store required
- Works on any Android phone with Chrome
- "Add to Home Screen" installs it
- Updates automatically when internet available
- Shareable via URL when briefly online

### APK via Capacitor/Cordova
- Distributable via file sharing (USB, Bluetooth, SD card)
- No internet needed even for initial install
- Requires building with Android SDK
- Could be sideloaded without Play Store

### Both
- Maintain PWA as primary, generate APK for deep-offline distribution
- Same codebase for both

---

## Estimated Total Effort

| Phase | Duration | Description |
|---|---|---|
| Phase 1 | ~5 days | Port game logic to client |
| Phase 2 | ~3 days | Offline adapter replacing Network.js |
| Phase 3 | ~2 days | PWA manifest + Service Worker |
| Phase 4 | ~2 days | Audio bundling strategy |
| Testing | ~2 days | Offline scenarios, mobile devices |
| **Total** | **~14 days** | |

---

## Key Insight

The monster damage exception (client-side calculation in game.js) proves the client can already handle authoritative game logic. The existing shared modules (WallGrid, LevelConfig, Constants) are designed to run on both sides. The port is primarily about moving spawning timers and AI loops — not rewriting game mechanics.
