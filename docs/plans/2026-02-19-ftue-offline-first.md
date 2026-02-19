# FTUE Offline-First Implementation Plan

Created: 2026-02-19
Status: IN_PROGRESS
Approved: Yes

## Summary

Refactor the First Time User Experience (FTUE) to:
1. Default to **offline mode + easy difficulty** for first-time users
2. Show a **quick-start "How to Play" overlay** that auto-dismisses after 4 seconds
3. **Auto-detect connection failure** and fallback to offline mode gracefully
4. **Hide multiplayer button** when offline (detected or user-selected)
5. **Persist offline preference** in localStorage

## Current State Analysis

### Existing Systems (Conflicting)

| System | Trigger | Behavior |
|--------|---------|----------|
| `hasVisited` (game.js) | First-time user | Jumps straight to `startGame('solo')` — **bypasses menu** |
| `hasSeenTutorial` (index.html) | First-time user | Opens multi-page tutorial overlay on menu — **never seen if FTUE bypasses menu** |
| `onboardingModal` (game.js) | During gameplay | Shows tips on first damage, etc. |
| Network error handling | Socket.IO fails | Logs error, but **no fallback to offline** |

### Problems

1. FTUE requires online (Socket.IO connection)
2. Tutorial overlay never shows (FTUE bypasses menu)
3. Connection failure = broken game experience
4. No offline awareness in FTUE flow

---

## Implementation Tasks

### Task 1: Refactor FTUE to Default Offline

**Objective:** Make FTUE start in offline mode (no server dependency for first play).

**Files:**
- `game.js` — Modify FTUE logic in `DOMContentLoaded`

**Changes:**

```javascript
// CURRENT:
if (!hasVisited) {
    localStorage.setItem('hasVisited', 'true');
    startGame('solo');  // ← Requires server
}

// NEW:
if (!hasVisited) {
    localStorage.setItem('hasVisited', 'true');
    
    // Force offline mode for first-time users
    offlineMode = true;
    
    // Force Easy difficulty
    const diffEasy = document.getElementById('diffEasy');
    if (diffEasy) diffEasy.checked = true;
    
    // Create LocalNetwork instead of socket-based Network
    network = new LocalNetwork();
    
    // Show quick-start overlay, then start game
    showQuickStartOverlay().then(() => {
        startGame('solo');
    });
}
```

**Definition of Done:**
- [ ] First-time users start in offline mode
- [ ] No Socket.IO connection attempted for FTUE
- [ ] Easy difficulty forced for first play

---

### Task 2: Create Quick-Start Overlay

**Objective:** Show a simple 3-point "How to Play" overlay that auto-dismisses after 4 seconds.

**Files:**
- `index.html` — Add quick-start overlay HTML
- `game.js` — Add `showQuickStartOverlay()` function

**HTML (add to index.html before gameCanvas):**

```html
<!-- Quick Start Overlay (FTUE) -->
<div id="quickStartOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 200; justify-content: center; align-items: center;">
  <div id="quickStartPanel" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 15px; padding: 30px; max-width: 350px; width: 90%; text-align: center; color: #fff; border: 2px solid #e94560;">
    <h2 style="margin-bottom: 20px; color: #e94560;">🎮 How to Play</h2>
    <div style="text-align: left; line-height: 1.8; margin-bottom: 20px;">
      <p>📍 <strong>Click</strong> to move your character</p>
      <p>✝️ <strong>Answer quizzes</strong> to earn ammo and attack</p>
      <p>👹 <strong>Defeat demons</strong> by answering correctly!</p>
    </div>
    <div id="quickStartTimer" style="color: #aaa; font-size: 0.9em;">Starting in <span id="countdown">4</span>...</div>
    <button id="quickStartDismiss" style="margin-top: 15px; padding: 10px 30px; background: #e94560; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Start Now</button>
  </div>
</div>
```

**JavaScript (add to game.js):**

```javascript
function showQuickStartOverlay() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('quickStartOverlay');
        const countdownEl = document.getElementById('countdown');
        const dismissBtn = document.getElementById('quickStartDismiss');
        
        if (!overlay) {
            resolve(); // Fallback if overlay missing
            return;
        }
        
        overlay.style.display = 'flex';
        let seconds = 4;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                overlay.style.display = 'none';
                resolve();
            }
        }, 1000);
        
        // Allow manual dismiss
        dismissBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            overlay.style.display = 'none';
            resolve();
        }, { once: true });
    });
}
```

**Definition of Done:**
- [ ] Quick-start overlay appears for first-time users
- [ ] Shows 3 key instructions
- [ ] Auto-dismisses after 4 seconds
- [ ] "Start Now" button allows immediate dismiss
- [ ] Game starts after overlay closes

---

### Task 3: Add Connection Failure Detection

**Objective:** Detect Socket.IO connection failure and automatically switch to offline mode.

**Files:**
- `game.js` — Modify `init()` network connection handling

**Changes:**

```javascript
// CURRENT:
try {
    await network.connect(networkCallbacks);
    console.log('Connected to game server');
} catch (error) {
    console.error('Failed to connect:', error);
}

// NEW:
// Only try server connection if NOT in offline mode
if (!offlineMode) {
    try {
        await network.connect(networkCallbacks);
        console.log('Connected to game server');
    } catch (error) {
        console.warn('Connection failed, switching to offline mode:', error.message);
        // Auto-switch to offline mode
        offlineMode = true;
        network = new LocalNetwork();
        network.setCallbacks(networkCallbacks);
        
        // Update UI to reflect offline state
        updateUIForOfflineMode();
    }
}
```

**Definition of Done:**
- [ ] Connection failure triggers automatic offline fallback
- [ ] User sees game continue (no broken experience)
- [ ] Console logs indicate the fallback occurred

---

### Task 4: Update UI for Offline Mode

**Objective:** Hide multiplayer button and show offline indicator when offline.

**Files:**
- `game.js` — Add `updateUIForOfflineMode()` function
- `index.html` — Ensure menu elements have accessible IDs

**JavaScript:**

```javascript
function updateUIForOfflineMode() {
    // Hide multiplayer button
    const btnMultiplayer = document.getElementById('btnMultiplayer');
    if (btnMultiplayer) {
        btnMultiplayer.style.display = 'none';
    }
    
    // Check offline checkbox (visual feedback)
    const offlineToggle = document.getElementById('offlineModeToggle');
    if (offlineToggle) {
        offlineToggle.checked = true;
        offlineToggle.disabled = true;
    }
    
    // Optionally show toast notification
    if (typeof showToast === 'function') {
        showToast('📡 Offline Mode — No server connection', 3000);
    }
}
```

**Also apply on page load if returning user in offline mode:**

```javascript
// In DOMContentLoaded, after checking hasVisited:
if (hasVisited && !navigator.onLine) {
    // Returning user but no internet — set offline mode
    offlineMode = true;
    updateUIForOfflineMode();
}
```

**Definition of Done:**
- [ ] Multiplayer button hidden when offline
- [ ] Offline checkbox reflects state
- [ ] Toast notification informs user of offline mode
- [ ] Returning users with no internet get offline UI

---

### Task 5: Unify Tutorial State Flags

**Objective:** Consolidate the three overlapping state flags into a coherent system.

**Current Flags:**
- `hasVisited` — Controls FTUE vs menu
- `hasSeenTutorial` — Controls tutorial overlay auto-open

**Decision:** Keep both, but clarify their roles:

| Flag | Purpose |
|------|---------|
| `hasVisited` | "Has this user ever played?" → Controls FTUE vs menu |
| `hasSeenTutorial` | "Has this user seen the multi-page tutorial?" → Controls tutorial overlay |

**The quick-start overlay is SEPARATE** — it always shows for FTUE, regardless of `hasSeenTutorial`.

**Change:** Remove auto-open of tutorial overlay for first-time visitors (it conflicts with quick-start):

```javascript
// In index.html tutorial IIFE:
// REMOVE:
if (!localStorage.getItem('hasSeenTutorial')) {
    open();  // ← Remove this
    btnInstructions.classList.add('pulse');
}

// KEEP:
// Pulse the button to indicate it's available
btnInstructions.classList.add('pulse');
```

**Definition of Done:**
- [ ] Quick-start overlay shows for FTUE (controlled by `hasVisited`)
- [ ] Multi-page tutorial available via "How to Play" button (controlled by `hasSeenTutorial`)
- [ ] No conflicting overlay displays

---

### Task 6: Persist Offline Preference

**Objective:** Remember if user prefers offline mode across sessions.

**Files:**
- `game.js` — Add localStorage persistence for offline preference

**Changes:**

```javascript
// On page load, check for persisted preference
const persistedOffline = localStorage.getItem('offlinePreferred') === 'true';
if (persistedOffline) {
    offlineMode = true;
}

// When user toggles offline mode, persist it
function setOfflineMode(enabled) {
    offlineMode = enabled;
    localStorage.setItem('offlinePreferred', enabled.toString());
    
    if (enabled) {
        updateUIForOfflineMode();
    } else {
        // Restore multiplayer button
        const btnMultiplayer = document.getElementById('btnMultiplayer');
        if (btnMultiplayer) btnMultiplayer.style.display = 'block';
        
        const offlineToggle = document.getElementById('offlineModeToggle');
        if (offlineToggle) offlineToggle.disabled = false;
    }
}
```

**Definition of Done:**
- [ ] Offline preference persisted in localStorage
- [ ] Preference restored on page load
- [ ] Checkbox reflects persisted state

---

## File Summary

| File | Changes |
|------|---------|
| `game.js` | Refactor FTUE logic, add `showQuickStartOverlay()`, add connection failure handling, add `updateUIForOfflineMode()`, add offline preference persistence |
| `index.html` | Add quick-start overlay HTML, remove auto-open of tutorial overlay |

---

## Verification Checklist

After implementation, test these scenarios:

### Scenario A: First-Time User (Online)
1. Clear localStorage
2. Load page with internet
3. **Expected:** Quick-start overlay appears, game starts in offline mode, no server connection attempted

### Scenario B: First-Time User (Offline)
1. Clear localStorage
2. Disconnect internet
3. Load page
4. **Expected:** Same as Scenario A — works perfectly offline

### Scenario C: Returning User (Online)
1. Have `hasVisited=true` in localStorage
2. Load page with internet
3. **Expected:** Menu shows, multiplayer button visible

### Scenario D: Returning User (Offline)
1. Have `hasVisited=true` in localStorage
2. Disconnect internet
3. Load page
4. **Expected:** Menu shows, multiplayer button hidden, offline mode pre-selected

### Scenario E: Connection Failure Mid-Flow
1. Start with internet, then disconnect before clicking "Solo"
2. Click "Solo" with offline toggle unchecked
3. **Expected:** Connection fails, auto-switches to offline mode, game continues

---

## Progress Tracking

- [ ] Task 1: Refactor FTUE to Default Offline
- [ ] Task 2: Create Quick-Start Overlay
- [ ] Task 3: Add Connection Failure Detection
- [ ] Task 4: Update UI for Offline Mode
- [ ] Task 5: Unify Tutorial State Flags
- [ ] Task 6: Persist Offline Preference

**Total Tasks:** 6 | **Completed:** 0 | **Remaining:** 6
