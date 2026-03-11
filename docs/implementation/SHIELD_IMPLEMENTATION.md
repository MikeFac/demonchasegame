# Shield of Faith Implementation Plan

> **Status note (2026-03-08):** Historical implementation notes. Shield-style protection exists in the current game, but this file is not the current source of truth for the exact code paths.

## Overview
Add a "Shield of Faith" collectible item that provides temporary invincibility. The shield spawns once per level and can be collected and stored in an inventory.

## Files to Modify

### 1. game.js
Add the following:

**Constants (after DEMON_TYPES):**
```javascript
const TREASURE_TYPES = {
    SHIELD_OF_FAITH: {
        id: 'shield_of_faith',
        name: 'Shield of Faith',
        icon: 'shield_of_faith.png',
        effect: 'invincibility',
        duration: 10000, // 10 seconds
        description: 'Temporary protection from all damage'
    }
};
```

**Player state additions (in player object):**
```javascript
let playerInventory = {
    'shield_of_faith': 0
};

// Add to player object:
activeEffects: {
    invincible: false,
    invincibleEndTime: 0
}
```

**Game state additions:**
```javascript
let treasures = []; // Array of treasure objects on map
let shieldOfFaithImg = null;
let inventoryOpen = false;
let inventoryButtonRect = { x: 750, y: 10, width: 40, height: 40 };
```

**New Functions:**

1. `spawnTreasures()` - Spawns one Shield of Faith per level at a random valid location
2. `checkTreasureCollisions()` - Checks if player collides with treasures
3. `collectTreasure(treasure)` - Adds treasure to inventory, plays sound
4. `drawTreasures()` - Renders treasures on the map
5. `drawInventoryButton()` - Draws the "i" button in top-right
6. `drawInventoryModal()` - Shows inventory with items and Use buttons
7. `drawActiveEffects()` - Shows shield timer and visual effect on player
8. `handleInventoryClick(x, y)` - Handles clicks on inventory UI
9. `useInventoryItem(itemType)` - Activates shield, decrements count
10. `updateActiveEffects()` - Checks for expired effects in game loop

**Game loop integration:**
- Call `spawnTreasures()` when level starts (in `updateGameState` when `!isGameLoaded`)
- Call `checkTreasureCollisions()` in game loop
- Call `updateActiveEffects()` in game loop
- Call `drawTreasures()`, `drawInventoryButton()`, `drawActiveEffects()` after renderer
- Add inventory click handling to `onGameClick` callback

**Damage prevention:**
In the monster damage section, check:
```javascript
if (!player.activeEffects.invincible) {
    // Apply damage
} else {
    // Shield blocked it - optionally log message
}
```

### 2. index.html
Add version parameter to force cache refresh:
```html
<script src="game.js?v=2.01"></script>
```

### 3. Assets
- shield_of_faith.png (already created - 64x64 golden shield with cross)

## Implementation Steps (in order)

1. **Add constants and state variables** to game.js
2. **Load shield image** in init() function
3. **Create spawnTreasures()** function - spawn at random valid location
4. **Add treasure drawing** to game loop
5. **Add collision detection** for treasures
6. **Test collection** - verify shield disappears and adds to inventory
7. **Create inventory UI functions** (button, modal)
8. **Add click handling** for inventory
9. **Implement shield activation** and visual effects
10. **Add damage prevention** when shield is active
11. **Test end-to-end** - collect, use, verify invincibility

## Key Points

- Shield spawns once per level at game start
- Spawn location must avoid walls (use checkWallCollision)
- Draw treasure using camera offset (world to screen coordinates)
- Visual feedback: golden glow around player when shield active
- 10 second duration with countdown timer
- Can collect multiple shields (they stack in inventory)
- Inventory modal blocks game interaction when open
- Press 'i' or click button to toggle inventory

## Testing Checklist
- [ ] Shield spawns in valid location (not in wall)
- [ ] Shield is visible on map with golden glow
- [ ] Walking over shield collects it
- [ ] Inventory shows collected shield with quantity
- [ ] Clicking "i" opens/closes inventory
- [ ] Clicking "Use" activates shield
- [ ] Player gets golden aura when shield active
- [ ] Timer shows remaining time
- [ ] No damage taken from demons while shield active
- [ ] Shield expires after 10 seconds
- [ ] Quiz buttons still work after implementation

## Common Pitfalls to Avoid

1. **Coordinate mismatch**: Ensure treasure spawn uses WORLD coordinates, drawing uses WORLD - camera
2. **Cache issues**: Always increment version numbers when modifying JS files
3. **Early initialization**: Don't spawn treasures until player position is set
4. **Wall collision**: Use same collision logic as player to avoid spawning in walls
5. **Don't break existing**: Test quiz buttons, movement, shooting after each change
