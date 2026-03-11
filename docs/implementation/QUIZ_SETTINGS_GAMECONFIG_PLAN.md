# Quiz Settings GameConfig Integration Plan

> **Status note (2026-03-08):** Historical planning doc. Quiz settings are now part of the live GameConfig flow, so this file should be read as design history rather than an exact implementation map.

## Problem Statement

Quiz settings are currently client-side globals that vary per-player, creating inconsistent difficulty in multiplayer games. They should be part of GameConfig to ensure all players in a game experience the same quiz difficulty.

## Current State

**Location**: `index.html` line 326
```javascript
var quizSettings = { firstLetter: 30, missingWord: 30, categoryMatch: 25, trueFalse: 15 };
```

**Issues**:
- ❌ Per-browser, not per-game
- ❌ Each player in multiplayer generates different quiz types
- ❌ No persistence
- ❌ Cannot configure as room setting
- ❌ Inconsistent with difficulty presets

**Quiz Mode Difficulty Ranking** (based on player feedback):
1. **True/False** - Easiest (50/50 guess)
2. **Category Match** - Easy-Medium (4 options, semantic clues)
3. **Missing Word** - Medium (4 options, context clues)
4. **First Letter** - Hardest (requires memorization, letter combos)

## Proposed Solution

### Key Design Principle

**Monster Difficulty ≠ Quiz Difficulty**

These are **two independent axes**:
- **Monster Difficulty** (Easy/Normal/Hard preset) → Combat intensity
- **Quiz Balance** (Custom sliders) → Bible knowledge challenge

**Example Use Cases**:
- Hard monsters + Easy quizzes = "I know my Bible, want intense combat"
- Easy monsters + Hard quizzes = "Testing Bible knowledge without combat stress"
- Hard monsters + Hard quizzes = "Ultimate challenge"
- Easy monsters + Easy quizzes = "Relaxed learning"

### Phase 1: Default Quiz Settings (Starting Point)

**Update**: `src/server/config/GameConfig.js`

Add **default** quiz settings that are **independent of difficulty**:

```javascript
// Default quiz balance (used as starting point in UI)
const DEFAULT_QUIZ_SETTINGS = {
  firstLetter: 30,
  missingWord: 30,
  categoryMatch: 25,
  trueFalse: 15
};

const PRESETS = {
  easy: {
    name: 'Easy',
    description: 'Relaxed pace, weaker monsters, generous resources',
    multipliers: {
      monsterHealth: 0.7,
      monsterDamage: 0.7,
      monsterSpeed: 0.8,
      spawnRate: 1.5,
      healingSpawnRate: 0.7,
      maxMonsters: 0.7
    }
    // NO quizSettings here - not tied to monster difficulty!
  },
  normal: {
    name: 'Normal',
    description: 'Balanced gameplay',
    multipliers: {
      monsterHealth: 1.0,
      monsterDamage: 1.0,
      monsterSpeed: 1.0,
      spawnRate: 1.0,
      healingSpawnRate: 1.0,
      maxMonsters: 1.0
    }
  },
  hard: {
    name: 'Hard',
    description: 'Intense challenge, stronger monsters, scarce resources',
    multipliers: {
      monsterHealth: 1.5,
      monsterDamage: 1.5,
      monsterSpeed: 1.2,
      spawnRate: 0.7,
      healingSpawnRate: 1.5,
      maxMonsters: 1.3
    }
  }
};

// Optional: Provide suggested quiz balances as separate presets
const QUIZ_BALANCE_PRESETS = {
  easy_quizzes: { firstLetter: 5, missingWord: 15, categoryMatch: 30, trueFalse: 50 },
  balanced_quizzes: { firstLetter: 30, missingWord: 30, categoryMatch: 25, trueFalse: 15 },
  hard_quizzes: { firstLetter: 60, missingWord: 30, categoryMatch: 5, trueFalse: 5 }
};

function createGameConfig(presetName = 'normal') {
  const preset = PRESETS[presetName] || PRESETS.normal;
  const m = preset.multipliers;

  // ... existing code ...

  return {
    preset: presetName,
    presetName: preset.name,
    description: preset.description,
    constants: { /* ... */ },
    levelData: { /* ... */ },
    multipliers: m,
    monsterHealthMultiplier: m.monsterHealth,

    // ADD THIS:
    quizSettings: preset.quizSettings
  };
}
```

### Phase 2: Broadcast Quiz Settings to Clients

**Update**: `src/server/Game.js`

Add quiz settings to initial game state broadcast:

```javascript
addPlayer(socket) {
  // ... existing code ...

  // Send quiz settings to client
  socket.emit('gameConfig', {
    quizSettings: this.gameConfig.quizSettings
  });
}
```

### Phase 3: Client Receives and Uses Server Config

**Update**: `game.js` or `src/client/Network.js`

Receive quiz settings from server:

```javascript
socket.on('gameConfig', (config) => {
  // Override local quizSettings with server config
  if (config.quizSettings) {
    window.quizSettings = config.quizSettings;
    console.log('Quiz settings from server:', config.quizSettings);

    // Update sliders to reflect server settings (read-only)
    updateSlidersFromConfig(config.quizSettings);
  }
});
```

**Update**: `index.html`

Disable sliders during gameplay (they become read-only indicators):

```javascript
// After receiving gameConfig
function updateSlidersFromConfig(settings) {
  const sliders = document.querySelectorAll('#quizSliders input[type="range"]');
  sliders.forEach(slider => {
    const mode = slider.dataset.mode;
    slider.value = settings[mode];
    slider.disabled = true; // Read-only during game
    slider.parentElement.querySelector('.pct').textContent = settings[mode] + '%';
  });
}
```

### Phase 4: Solo Game Support

**Solo games** should still allow local slider control:

```javascript
// In index.html
socket.on('gameConfig', (config) => {
  if (config.quizSettings) {
    if (config.isSoloGame) {
      // Solo: sliders stay enabled, use local settings
      // But apply preset defaults initially
      window.quizSettings = { ...config.quizSettings };
    } else {
      // Multiplayer: sliders disabled, use server settings
      window.quizSettings = config.quizSettings;
      disableSliders();
    }
    updateSlidersDisplay();
  }
});
```

### Phase 5: Custom Quiz Settings UI (Lobby) - INDEPENDENT OF DIFFICULTY

**Update**: `lobby.html`

Add quiz settings sliders to room creation modal **BELOW** difficulty selector:

```html
<!-- Create Room Screen -->
<div id="createRoomScreen" class="panel hidden">
  <h2>Create Room</h2>
  <input type="text" id="roomNameInput" placeholder="Room name (optional)">

  <!-- MONSTER DIFFICULTY -->
  <div style="margin: 20px 0;">
    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Monster Difficulty:</label>
    <div class="difficulty-selector">
      <button class="preset-btn" data-preset="easy" onclick="selectPreset('easy')">Easy</button>
      <button class="preset-btn active" data-preset="normal" onclick="selectPreset('normal')">Normal</button>
      <button class="preset-btn" data-preset="hard" onclick="selectPreset('hard')">Hard</button>
    </div>
  </div>

  <!-- QUIZ BALANCE (INDEPENDENT) -->
  <div style="margin: 20px 0;">
    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Quiz Balance:</label>
    <div class="quiz-slider-group">
      <div class="slider-item">
        <label>First Letter (Hardest) <span class="pct-fl">30%</span></label>
        <input type="range" min="0" max="100" value="30" step="5"
               data-mode="firstLetter" class="quiz-slider">
      </div>
      <div class="slider-item">
        <label>Missing Word (Medium) <span class="pct-mw">30%</span></label>
        <input type="range" min="0" max="100" value="30" step="5"
               data-mode="missingWord" class="quiz-slider">
      </div>
      <div class="slider-item">
        <label>Category Match (Easy) <span class="pct-cm">25%</span></label>
        <input type="range" min="0" max="100" value="25" step="5"
               data-mode="categoryMatch" class="quiz-slider">
      </div>
      <div class="slider-item">
        <label>True/False (Easiest) <span class="pct-tf">15%</span></label>
        <input type="range" min="0" max="100" value="15" step="5"
               data-mode="trueFalse" class="quiz-slider">
      </div>
    </div>

    <!-- Quick preset buttons -->
    <div style="display: flex; gap: 5px; margin-top: 10px;">
      <button class="btn-quiz-preset" onclick="applyQuizPreset('easy')">Easy Quizzes</button>
      <button class="btn-quiz-preset" onclick="applyQuizPreset('balanced')">Balanced</button>
      <button class="btn-quiz-preset" onclick="applyQuizPreset('hard')">Hard Quizzes</button>
    </div>
  </div>

  <button class="btn-success" onclick="createRoom()">Create & Join</button>
  <button class="btn-secondary" onclick="showLobby()">← Back</button>
</div>
```

**JavaScript for quiz sliders**:

```javascript
// Quiz preset buttons (INDEPENDENT of monster difficulty)
function applyQuizPreset(type) {
  const presets = {
    easy: { firstLetter: 5, missingWord: 15, categoryMatch: 30, trueFalse: 50 },
    balanced: { firstLetter: 30, missingWord: 30, categoryMatch: 25, trueFalse: 15 },
    hard: { firstLetter: 60, missingWord: 30, categoryMatch: 5, trueFalse: 5 }
  };

  const preset = presets[type];
  document.querySelectorAll('.quiz-slider').forEach(slider => {
    const mode = slider.dataset.mode;
    slider.value = preset[mode];
  });
  updateQuizSliderLabels();
}

// Slider redistribution logic (ensure sum = 100)
function setupQuizSliders() {
  const sliders = document.querySelectorAll('.quiz-slider');
  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      redistributeQuizSliders(slider);
    });
  });
}

function redistributeQuizSliders(changedSlider) {
  const sliders = document.querySelectorAll('.quiz-slider');
  const changedMode = changedSlider.dataset.mode;
  const newVal = parseInt(changedSlider.value, 10);
  const remaining = 100 - newVal;

  let otherSum = 0;
  sliders.forEach(s => {
    if (s.dataset.mode !== changedMode) {
      otherSum += parseInt(s.value, 10);
    }
  });

  // Redistribute proportionally
  sliders.forEach(s => {
    if (s.dataset.mode !== changedMode) {
      if (otherSum === 0) {
        s.value = Math.round(remaining / 3 / 5) * 5;
      } else {
        s.value = Math.round((parseInt(s.value, 10) / otherSum) * remaining / 5) * 5;
      }
    }
  });

  // Fix rounding errors
  let total = 0;
  sliders.forEach(s => { total += parseInt(s.value, 10); });
  if (total !== 100) {
    for (let i = sliders.length - 1; i >= 0; i--) {
      if (sliders[i].dataset.mode !== changedMode) {
        sliders[i].value = parseInt(sliders[i].value, 10) + (100 - total);
        break;
      }
    }
  }

  updateQuizSliderLabels();
}

function updateQuizSliderLabels() {
  document.querySelectorAll('.quiz-slider').forEach(s => {
    const mode = s.dataset.mode;
    const pctClass = '.pct-' + (mode === 'firstLetter' ? 'fl' :
                               mode === 'missingWord' ? 'mw' :
                               mode === 'categoryMatch' ? 'cm' : 'tf');
    s.closest('.slider-item').querySelector(pctClass).textContent = s.value + '%';
  });
}

// Get quiz settings from sliders
function getQuizSettingsFromSliders() {
  const settings = {};
  document.querySelectorAll('.quiz-slider').forEach(slider => {
    settings[slider.dataset.mode] = parseInt(slider.value, 10);
  });
  return settings;
}

// Send to server when creating room
function createRoom() {
  const name = document.getElementById('roomNameInput').value.trim();
  const quizSettings = getQuizSettingsFromSliders();

  socket.emit('createRoom', {
    name,
    preset: selectedPreset,           // Monster difficulty
    quizSettings: quizSettings        // Quiz balance (INDEPENDENT)
  }, (result) => {
    if (result.success) {
      currentRoom = result.room;
      isReady = false;
      showScreen('roomScreen');
      renderRoom();
    } else {
      alert(result.error);
    }
  });
}
```

### Phase 6: RoomManager Stores Quiz Settings

**Update**: `src/server/RoomManager.js`

```javascript
createRoom(hostToken, options = {}) {
  // ... existing validation ...

  const GameConfig = require('./config/GameConfig');
  const presetName = options.preset || 'normal';
  const preset = GameConfig.PRESETS[presetName];

  // Use custom quiz settings if provided, otherwise use preset defaults
  const quizSettings = options.quizSettings || preset.quizSettings;

  // Validate quiz settings sum to 100
  const total = Object.values(quizSettings).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    return { success: false, error: 'Quiz settings must sum to 100%' };
  }

  const room = {
    // ... existing fields ...
    settings: {
      category: options.category || '',
      preset: presetName,
      presetDisplay: GameConfig.PRESETS[presetName].name,
      quizSettings: quizSettings  // Store custom quiz settings
    },
    // ...
  };
}
```

### Phase 7: GameConfig Uses Room Quiz Settings

**Update**: `src/server/config/GameConfig.js`

```javascript
function createGameConfig(presetName = 'normal', customQuizSettings = null) {
  const preset = PRESETS[presetName] || PRESETS.normal;
  const m = preset.multipliers;

  // ... existing level scaling ...

  return {
    preset: presetName,
    presetName: preset.name,
    description: preset.description,
    constants: { /* ... */ },
    levelData: { /* ... */ },
    multipliers: m,
    monsterHealthMultiplier: m.monsterHealth,

    // Use custom settings if provided, otherwise preset defaults
    quizSettings: customQuizSettings || preset.quizSettings
  };
}
```

**Update**: `server.js`

```javascript
socket.on('startGame', (roomId, callback) => {
  // ... validation ...
  const result = roomManager.startGame(socket.sessionToken, roomId);
  if (result.success) {
    const room = roomManager.rooms.get(roomId);
    const GameConfig = require('./src/server/config/GameConfig');

    // Pass quiz settings from room to config
    const gameConfig = GameConfig.createGameConfig(
      room.settings.preset,
      room.settings.quizSettings
    );

    const game = new Game(io, roomId, gameConfig);
    // ...
  }
});
```

## Implementation Order

### Phase 1: Core Quiz Settings Infrastructure
1. ✅ **Define DEFAULT_QUIZ_SETTINGS** (GameConfig.js)
2. ✅ **Define QUIZ_BALANCE_PRESETS** (GameConfig.js) - optional quick presets
3. ✅ **Update createGameConfig to accept quizSettings parameter** (GameConfig.js)
4. ✅ **RoomManager validates and stores quiz settings** (RoomManager.js)
5. ✅ **Update tests** (test/test-game-config.js)

### Phase 2: Room Creation UI
6. ✅ **Add quiz sliders to lobby.html** (BELOW monster difficulty selector)
7. ✅ **Add quiz preset buttons** ("Easy Quizzes" / "Balanced" / "Hard Quizzes")
8. ✅ **Implement slider redistribution logic** (ensure sum = 100%)
9. ✅ **Send quizSettings with createRoom request**

### Phase 3: Server-to-Client Broadcast
10. ✅ **Game.js broadcasts quizSettings to clients** (in addPlayer or gameConfig event)
11. ✅ **Client receives and overrides local quizSettings** (game.js/Network.js)
12. ✅ **Disable in-game sliders during multiplayer** (make them read-only indicators)

### Phase 4: Documentation & Testing
13. ✅ **Document two-axis difficulty system in CLAUDE.md**
14. ✅ **Update GAMECONFIG_IMPLEMENTATION.md**
15. ✅ **Integration test: verify quiz settings work in multiplayer**

### Phase 5: Solo Game Support (Optional)
16. 🔄 **Solo games use balanced defaults OR allow local slider adjustment**
17. 🔄 **Add quiz settings to solo game start screen** (future enhancement)

## Testing

### Unit Tests

```javascript
// test/test-game-config.js
console.log('=== Test 8: Quiz Settings in Presets ===');
const easyConfig = GameConfig.createGameConfig('easy');
console.assert(easyConfig.quizSettings.trueFalse === 50, 'Easy should have 50% True/False');
console.assert(easyConfig.quizSettings.firstLetter === 5, 'Easy should have 5% First Letter');

const hardConfig = GameConfig.createGameConfig('hard');
console.assert(hardConfig.quizSettings.firstLetter === 60, 'Hard should have 60% First Letter');
console.assert(hardConfig.quizSettings.trueFalse === 5, 'Hard should have 5% True/False');
```

### Integration Tests

1. Create Easy room → all players should get mostly True/False quizzes
2. Create Hard room → all players should get mostly First Letter quizzes
3. Player A joins Hard room with local sliders set to Easy → should still get Hard quizzes (server overrides)

## Benefits

✅ **Consistent multiplayer experience** - all players see same quiz difficulty
✅ **Configurable per-room** - hosts can customize quiz balance
✅ **Integrated with presets** - Easy/Normal/Hard include sensible quiz defaults
✅ **Solo flexibility** - solo players can still adjust sliders locally
✅ **Foundation for Phase 2** - custom configs can include quiz settings

## Two Independent Difficulty Systems

### Monster Difficulty (Easy/Normal/Hard)
**Controls**: Combat challenge
- Monster health (0.7x / 1.0x / 1.5x)
- Monster spawn rate (slower / normal / faster)
- Healing spawn rate (faster / normal / slower)
- Max concurrent monsters (fewer / normal / more)

**Does NOT affect**: Quiz types or Bible knowledge difficulty

### Quiz Balance (Custom Sliders)
**Controls**: Bible knowledge challenge
- Distribution of quiz modes (First Letter / Missing Word / Category / True-False)
- Host customizes with sliders (must sum to 100%)
- Quick presets: "Easy Quizzes" / "Balanced" / "Hard Quizzes"

**Does NOT affect**: Monster strength, spawn rates, or healing

### User Flow Example

**Scenario 1**: Bible Expert, Casual Gamer
- Selects: **Easy** monsters + **Hard** quizzes (80% First Letter)
- Result: Relaxed combat, challenging Bible memorization

**Scenario 2**: New to Bible, Experienced Gamer
- Selects: **Hard** monsters + **Easy** quizzes (80% True/False)
- Result: Intense combat, manageable Bible questions

**Scenario 3**: Ultimate Challenge
- Selects: **Hard** monsters + **Hard** quizzes
- Result: Maximum difficulty on both axes

**Scenario 4**: Learning Mode
- Selects: **Easy** monsters + **Balanced** quizzes
- Result: Gentle introduction to both systems

## Trade-offs

**Why separate monster difficulty from quiz difficulty?**
- ✅ Bible knowledge ≠ gaming skill
- ✅ Players can choose their challenge focus
- ✅ More flexible difficulty combinations (9 total: 3 monster × 3 quiz presets)
- ✅ Better learning experience (adjust one without affecting the other)

**Why not just sync client sliders in multiplayer?**
- Too complex, race conditions
- Server should be source of truth
- Host settings should dictate game rules for all players

**Why disable sliders during multiplayer gameplay?**
- Prevents confusion about whose settings apply
- Makes it clear server controls difficulty
- Sliders become read-only indicators of current game config

**What about solo games?**
- Solo games can use default balanced quiz settings
- OR solo players can adjust sliders before starting (future enhancement)
- Settings persist per game instance, not globally

## UI Mockup: Room Creation Screen

```
┌──────────────────────────────────────────────────────┐
│              Create Room                              │
├──────────────────────────────────────────────────────┤
│ Room Name: [________________]                         │
│                                                       │
│ Monster Difficulty:                                   │
│  [Easy]  [Normal]  [Hard]                            │
│   ↑ Controls combat challenge, NOT quiz difficulty   │
│                                                       │
│ Quiz Balance:        ← INDEPENDENT CONTROL            │
│  First Letter (Hardest):   [========] 30%            │
│  Missing Word (Medium):    [========] 30%            │
│  Category Match (Easy):    [======  ] 25%            │
│  True/False (Easiest):     [====    ] 15%            │
│                                                       │
│  Quick Presets:                                       │
│  [Easy Quizzes] [Balanced] [Hard Quizzes]           │
│   ↑ 50% T/F      ↑ Current   ↑ 60% First Letter     │
│                                                       │
│  [Create & Join]  [← Back]                           │
└──────────────────────────────────────────────────────┘
```

**Result**: Host can select "Hard" monsters with "Easy" quizzes, creating an experience focused on combat challenge rather than Bible memorization difficulty.

## Future Enhancements

- **Leaderboards per configuration** - separate scores for different monster+quiz combos
- **Difficulty rating display** - show numeric score: "Monster: 8/10, Quiz: 3/10"
- **Community presets** - share full configs (monsters + quiz) with codes
- **Adaptive difficulty** - adjust quiz settings based on player performance
- **Solo game quiz customization** - allow solo players to adjust quiz balance before starting
