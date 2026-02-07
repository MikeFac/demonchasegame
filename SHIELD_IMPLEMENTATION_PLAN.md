# Shield of Faith Implementation Plan

## Overview
Add an inventory system with collectible treasures, starting with the "Shield of Faith" that provides temporary invincibility.

## Components

### 1. Item Definition (NEW)
```javascript
// Item types
treasureTypes = {
    SHIELD_OF_FAITH: {
        name: 'Shield of Faith',
        icon: 'shield_of_faith.png',
        effect: 'invincibility',
        duration: 10000, // 10 seconds
        description: 'Temporary protection from all damage'
    }
}
```

### 2. Player State Changes (game.js)
Add to player object:
```javascript
player = {
    ...existing properties...,
    inventory: {
        'shield_of_faith': 0  // quantity
    },
    activeEffects: {
        invincible: false,
        invincibleEndTime: 0
    }
}
```

### 3. Game State Changes (game.js)
Add to gameState:
```javascript
gameState = {
    ...existing...,
    treasures: []  // Array of treasure objects on the map
}
```

### 4. Treasure Spawning (game.js - initGame or level setup)
- Spawn one Shield of Faith per level in a random maze location
- Treasure object structure:
```javascript
{
    id: unique_id,
    type: 'shield_of_faith',
    x: random_x,
    y: random_y,
    width: 32,
    height: 32,
    collected: false
}
```

### 5. UI Components

#### Inventory Button (HUD)
- Position: Top-right corner
- Icon: "i" or backpack icon
- Click opens inventory modal

#### Inventory Modal
- Centered overlay
- Grid of items
- Each item shows: icon, name, quantity, "Use" button
- Close button (X) or press 'i' again

#### Active Effect Indicator
- When shield is active: Show shield icon with countdown timer near health bar
- Visual effect on player (golden glow/outline)

### 6. Input Handling (game.js)
- 'i' key: Toggle inventory modal
- Inventory button click: Toggle inventory modal
- "Use" button click: Activate selected item (decrement quantity)

### 7. Collision Detection (game.js - in update loop)
- Check player collision with treasures
- On collision: Add to inventory, remove from map, play sound

### 8. Effect Implementation (game.js)
- When shield activated:
  - Set player.activeEffects.invincible = true
  - Set player.activeEffects.invincibleEndTime = Date.now() + duration
  - Decrement inventory count
  - Play activation sound
  
- In damage calculation:
  - Check if invincible before applying damage
  - If invincible and time expired, turn off effect

### 9. Rendering (Renderer.js)
- Draw treasures on map
- Draw inventory button
- Draw inventory modal when open
- Draw shield effect on player when active

## File Changes Required

### game.js
- [ ] Add treasure types definition
- [ ] Add inventory to player state
- [ ] Add treasures array to gameState
- [ ] Add spawnTreasures() function
- [ ] Add checkTreasureCollisions() function
- [ ] Add useInventoryItem() function
- [ ] Add toggleInventory() function
- [ ] Modify damage calculation to check invincibility
- [ ] Add inventory key handler ('i')
- [ ] Add inventory rendering calls

### Renderer.js (or game.js render section)
- [ ] Add drawTreasures() function
- [ ] Add drawInventoryButton() function  
- [ ] Add drawInventoryModal() function
- [ ] Add drawActiveEffects() function

### InputHandler.js
- [ ] Add 'i' key handler
- [ ] Add inventory button click handler

### Constants.js (optional)
- [ ] Add treasure constants (spawn rates, durations)

## Assets Needed
- [x] shield_of_faith.png (created ✓)
- [ ] inventory_icon.png (optional - can use text "i")
- [ ] treasure_pickup.mp3 (sound effect)
- [ ] shield_activate.mp3 (sound effect)

## Testing Checklist
- [ ] Shield spawns in maze each level
- [ ] Player can walk over shield to collect
- [ ] Inventory shows collected shield
- [ ] Pressing 'i' opens inventory
- [ ] Clicking "Use" activates shield
- [ ] Shield quantity decrements on use
- [ ] Player glows golden when shield active
- [ ] Timer shows remaining shield time
- [ ] Player takes no damage while shield active
- [ ] Shield expires after duration
- [ ] Multiple shields can be collected

## Future Expansion Ideas
- More treasures: Sword of Spirit, Helmet of Salvation, Belt of Truth
- Rare treasures that persist between levels
- Treasure shops between levels
- Combine treasures for powerful effects
