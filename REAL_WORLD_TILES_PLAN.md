# Real-World Tile System Implementation Plan

## Vision
Transform the game from abstract dungeon to **real-world spiritual warfare** environment. Replace boring brown walls with houses, roads, grass, water, and bushes to create relatable, visually engaging levels.

---

## Thematic Concept

### Core Idea
**Spiritual warfare happens in everyday life, not in dungeons.**

Demons (Fear, Doubt, Condemnation, etc.) attack you:
- At home (suburban neighborhoods)
- At work (office buildings)
- At school (hallways and classrooms)
- In nature (parks and forests)
- In the community (city streets)

### Visual Transformation

**Before (Dungeon)**:
```
████████████████
█      █       █
█  ██  █  ███  █
█  ██     █    █
████████████████
```

**After (Real World)**:
```
🏠🏠🏠🛣️🏠🏠🏠🏠
🛣️🌿🌿🛣️🌿🌿🛣️🏠
🏠🛣️💧💧🛣️🌳🛣️🏠
🏠🏠🛣️🌿🌿🌿🛣️🏠
🏠🏠🏠🏠🏠🏠🏠🏠
```

---

## Tile Types

### 1. Houses (Solid Obstacles)
**Replaces**: Wall tiles
**Purpose**: Impassable obstacles (like walls)
**Visuals**:
- Small building sprites (32x32 or 48x48)
- Variations: Red brick, gray concrete, brown wood, blue siding
- Simple design: Square building with door/window
- Top-down view (roof visible)

**Collision**: Same as current walls (impassable)

---

### 2. Roads (Corridors)
**Replaces**: Empty corridor space
**Purpose**: Clear pathways between houses
**Visuals**:
- Gray asphalt texture
- Optional: White/yellow lane markings
- Slight texture variation (cracks, worn areas)

**Collision**: Fully walkable (same as current corridors)

---

### 3. Grass (Ground)
**New**: Background/floor tile
**Purpose**: Natural ground texture
**Visuals**:
- Green grass texture
- Slight color variation (lighter/darker patches)
- Simple, not too busy

**Collision**: Fully walkable

---

### 4. Water (Obstacles)
**New**: Environmental hazard/obstacle
**Purpose**: Impassable terrain (like walls)
**Visuals**:
- Blue water tiles
- Optional: Subtle animation (shimmer/wave)
- Could be ponds, streams, pools

**Collision**: Impassable (like walls)

**Future**: Could slow movement instead of blocking

---

### 5. Bushes/Trees (Decorative or Obstacles)
**New**: Natural obstacles or decoration
**Purpose**: Visual variety, tactical cover
**Visuals**:
- Green shrubs, small trees
- Top-down view (round or leafy shapes)
- Could be decorative or obstacles

**Collision**:
- Phase 1: Impassable (like walls)
- Phase 2: Passable but slows movement
- Phase 3: Provides cover (hide from monsters)

---

## Level Themes

### Level 1: Suburban Neighborhood
**Environment**: Residential area
**Tiles**:
- Houses: Residential homes (red, blue, brown variations)
- Roads: Suburban streets with sidewalks
- Grass: Lawns between houses
- Bushes: Decorative hedges and shrubs

**Mood**: Safe, familiar, everyday

---

### Level 2: City Streets
**Environment**: Urban downtown
**Tiles**:
- Houses: Office buildings, storefronts (taller, gray)
- Roads: City streets, alleys
- Grass: Minimal (mostly concrete)
- Water: Occasional fountains or puddles

**Mood**: Busy, crowded, challenging

---

### Level 3: Park/Forest
**Environment**: Natural setting
**Tiles**:
- Houses: Park buildings (restrooms, pavilions)
- Roads: Walking paths
- Grass: Abundant greenery
- Water: Ponds, streams
- Trees: Significant tree coverage

**Mood**: Peaceful but wild, open

---

### Level 4: School/Workplace (Future)
**Environment**: Institutional building interior
**Tiles**:
- Houses: Desks, lockers, cubicles
- Roads: Hallways, corridors
- Grass: Floor tiles (checkered pattern)

**Mood**: Structured, confined

---

### Level 5: Church/Temple (Future)
**Environment**: Spiritual stronghold
**Tiles**:
- Houses: Pews, altars, pillars
- Roads: Center aisle
- Grass: Carpet or stone floor

**Mood**: Sacred, climactic

---

## Asset Acquisition

### ✅ Custom Tiles Created (USING THESE)

**Location**: `/images/terrains/`

**Files**:
1. **houses-and-buildings256.png** - 8×8 sprite sheet (256×256px)
   - 64 building tiles (houses, churches, stores, towers, etc.)
   - Each tile: 32×32px
   - Variety: Residential, commercial, industrial, religious buildings

2. **terrain256.png** - 8×8 sprite sheet (256×256px)
   - 64 terrain tiles (grass, trees, water, bushes, paths)
   - Each tile: 32×32px
   - Variety: Different grass types, water bodies, trees, bushes

**Tool used**: Nano Banana (AI tile generator)

**Format**: PNG sprite sheets
**Tile size**: 32×32px per tile
**Sheet size**: 256×256px (8×8 grid)
**Total tiles available**: 128 tiles (64 buildings + 64 terrains)

---

### Sprite Sheet Layout

**Both sheets follow same pattern**:
```
Row 0: Tiles 0-7   (y=0, each tile at x: 0, 32, 64, 96, 128, 160, 192, 224)
Row 1: Tiles 8-15  (y=32)
Row 2: Tiles 16-23 (y=64)
Row 3: Tiles 24-31 (y=96)
Row 4: Tiles 32-39 (y=128)
Row 5: Tiles 40-47 (y=160)
Row 6: Tiles 48-55 (y=192)
Row 7: Tiles 56-63 (y=224)
```

**Extraction formula**:
```javascript
const tileIndex = 5; // Example: get tile 5
const row = Math.floor(tileIndex / 8);
const col = tileIndex % 8;
const sourceX = col * 32;
const sourceY = row * 32;
```

---

### Alternative Sources (Future Expansion)

**If more tiles needed later**:

#### Option 1: Kenney.nl
**URL**: https://kenney.nl/assets?q=2d
- Free CC0 assets
- Consistent quality
- May need resizing to 32×32

#### Option 2: OpenGameArt.org
**URL**: https://opengameart.org/art-search-advanced
- Community assets
- License varies

#### Option 3: More Nano Banana generations
- Generate specific tiles as needed
- Maintain consistent style with existing

---

## Technical Implementation

### Phase 1: Load Sprite Sheets and Extract Tiles (1 hour)

**Goal**: Load the two custom sprite sheets and set up tile extraction system

**Assets available**:
- `/images/terrains/houses-and-buildings256.png` (64 building tiles)
- `/images/terrains/terrain256.png` (64 terrain tiles)

**Changes**:

1. **Load sprite sheets** (`game.js` - in image loading section)
2. **Create tile extraction helper function**
3. **Define tile type mappings** (which tile index for houses, water, grass, etc.)
4. **Pass to renderer**

**Result**: Sprite sheets loaded, ready to extract individual tiles

**Code Location**: `game.js` (image loading around line 470-490)

---

### Phase 2: Implement Tile Rendering (2 hours)

**Goal**: Replace colored wall rectangles with actual tile sprites from sprite sheets

**Implementation**:

1. **Update Renderer.js** - Create tile extraction method
   ```javascript
   // Extract single 32x32 tile from sprite sheet
   drawTileFromSheet(sheet, tileIndex, destX, destY, destWidth, destHeight) {
       const row = Math.floor(tileIndex / 8);
       const col = tileIndex % 8;
       const sourceX = col * 32;
       const sourceY = row * 32;

       this.ctx.drawImage(
           sheet,
           sourceX, sourceY, 32, 32,  // Source from sprite sheet
           destX, destY, destWidth, destHeight  // Scale to 25x25 for game
       );
   }
   ```

2. **Define tile mappings** (game.js or Constants.js)
   ```javascript
   const TILE_TYPES = {
       // Buildings (from houses-and-buildings256.png)
       HOUSE_BROWN: 0,
       HOUSE_RED: 1,
       HOUSE_BLUE: 8,
       CHURCH: 3,
       STORE: 10,

       // Terrain (from terrain256.png)
       GRASS_LIGHT: 0,
       GRASS_DARK: 2,
       WATER: 9,
       TREE: 4,
       BUSH: 20,
       PATH: 10
   };
   ```

3. **Update drawWalls()** - Use tiles instead of colored rectangles
   - Replace `ctx.fillRect()` with `drawTileFromSheet()`
   - Select random building tile for each wall
   - Maintain current collision system

4. **Add background layer** (optional)
   - Draw grass tiles behind walls
   - Creates cohesive environment

**Code Changes**:
- `game.js`: Define tile type constants (~15 lines)
- `Renderer.js`: Add `drawTileFromSheet()` method (~15 lines)
- `Renderer.js`: Update `drawWalls()` to use tiles (~30 lines)

---

### Phase 3: Tile Variety (1 hour)

**Goal**: Randomize tile appearance for visual variety

**Implementation**:
1. **Multiple house sprites**
   - Array of house variations: `[house_red, house_blue, house_gray, house_brown]`
   - Server assigns random type to each wall on spawn
   - Client renders based on type

2. **Tile rotation**
   - Rotate some tiles 90/180/270 degrees
   - Adds variety without new assets

3. **Edge tiles**
   - Different sprites for corners vs straight walls
   - Makes houses look more like buildings (future)

**Code Location**: `src/server/Game.js` (resetLevelData - where walls are generated)

---

### Phase 4: Level-Specific Tilesets (2 hours)

**Goal**: Each level has unique visual theme

**Implementation**:
1. **Tileset configuration**
   - Level 1: Suburban tileset (red/blue houses, green grass)
   - Level 2: City tileset (gray buildings, concrete)
   - Level 3: Park tileset (trees, water, paths)

2. **Load tileset per level**
   - Server sends level theme to client
   - Client loads appropriate tile images
   - Renderer uses theme-specific sprites

**Code Location**:
- `src/shared/LevelConfig.js`: Add `theme` property to each level
- `game.js`: Load tileset based on level theme

---

## Tile Specifications

### Recommended Tile Size
**32x32 pixels** (source) → **25x25 pixels** (rendered)

**Current cell size**: 25x25 (from `Constants.CELL_SIZE`)

**Decision: Keep 25x25, use 32x32 source tiles**

**Rationale**:
- Changing CELL_SIZE affects 9+ files (maze gen, collision, world size)
- Canvas auto-scales 32→25 with acceptable quality
- 32x32 tiles widely available (Kenney.nl, OpenGameArt, etc.)
- Zero code changes except Renderer
- Can optimize later if needed

**Implementation**:
```javascript
// Load 32x32 tiles, render at 25x25
this.ctx.drawImage(houseTile, 0, 0, 32, 32, screenX, screenY, 25, 25);
```

**Quality**: Scaling 32→25 (78% size) produces minimal blur, acceptable for game style

---

### Tile Format
- **Format**: PNG with transparency
- **Color depth**: 32-bit RGBA (allows transparency)
- **Style**: Pixel art or clean vector (no photo-realistic)
- **Consistency**: All tiles same size and style

---

## Collision System (No Changes Needed)

**Current system works perfectly**:
- Walls = impassable (now houses)
- Corridors = walkable (now roads)
- Grid-based collision via `WallGrid.js`

**Future enhancements**:
- Water tiles = impassable (add to wall grid)
- Bush tiles = slows movement (new collision type)
- Different movement speeds per terrain type

---

## Implementation Priority

### Must-Have (Phase 1-2)
- [x] Plan created
- [ ] Download 5-7 basic tiles (house, road, grass, water, bush)
- [ ] Load tile images in game.js
- [ ] Update Renderer to draw tiles instead of colored rectangles
- [ ] Test on Level 1

### Nice-to-Have (Phase 3)
- [ ] Multiple house color variations
- [ ] Tile rotation for variety
- [ ] Background grass layer
- [ ] Water tiles in select areas

### Future (Phase 4+)
- [ ] Level-specific tilesets
- [ ] Animated water tiles
- [ ] Interactive bushes (cover mechanic)
- [ ] Building interiors (future levels)
- [ ] Day/night variations

---

## Testing Checklist

### Visual
- [ ] Tiles load correctly
- [ ] No gaps between tiles
- [ ] Collision still works (can't walk through houses)
- [ ] Camera movement smooth
- [ ] Tiles look good at game resolution

### Performance
- [ ] No FPS drop with tiles
- [ ] Tile images loaded once (not per frame)
- [ ] Rendering stays smooth with many tiles

### Gameplay
- [ ] Maze still navigable
- [ ] Player can find paths
- [ ] Monsters can navigate (pathfinding works)
- [ ] Visual clarity (not too busy)

---

## Tile Selection Guide

### Buildings Sprite Sheet (houses-and-buildings256.png)

**Recommended tiles for walls** (sample indices):
- [ ] Index 0: Small brown house
- [ ] Index 1: Small gray house
- [ ] Index 2: Wooden house
- [ ] Index 3: Church/tower
- [ ] Index 8: Blue house
- [ ] Index 9: Red brick house
- [ ] Index 10: Store/shop
- [ ] Index 16: Barn/warehouse

**Usage**: Randomly assign one of these to each wall tile for variety

---

### Terrain Sprite Sheet (terrain256.png)

**Recommended tiles for backgrounds**:
- [ ] Index 0-3: Light grass variations
- [ ] Index 8-11: Medium grass variations
- [ ] Index 16-19: Dark grass variations
- [ ] Index 4-7: Trees (for decorative obstacles)
- [ ] Index 9, 17, 25: Water tiles
- [ ] Index 20-23: Bush variations

**Usage**:
- Default background: Light grass (index 0)
- Decorative variety: Mix in other grass types randomly
- Water obstacles: Use water tiles (index 9, etc.)

---

### Quick Reference: Tile Extraction

**To use tile #15 from buildings sheet**:
```javascript
// Row 1, Column 7 (15 = 1*8 + 7)
const row = 1;
const col = 7;
const sourceX = 7 * 32 = 224;
const sourceY = 1 * 32 = 32;
```

---

## Code Structure

### New Files
- `/images/tiles/` - Tile sprite directory
- (Optional) `src/client/TileManager.js` - Tile loading and management

### Modified Files
- `game.js` - Load tile images, pass to renderer
- `src/client/Renderer.js` - Update `drawWalls()` to draw tiles
- `src/shared/Constants.js` - Possibly update `CELL_SIZE`
- `src/shared/LevelConfig.js` - Add level themes (future)

---

## Expected Impact

**Visual Appeal**: 6.5/10 → 8.5/10 (massive improvement)
**Thematic Coherence**: 7/10 → 9/10 (spiritual warfare in real world)
**Player Engagement**: More relatable, easier to navigate, more interesting to explore

---

## Inspiration References

**Similar games with good tile systems**:
- Nuclear Throne (top-down, varied environments)
- Enter the Gungeon (dungeon but themed rooms)
- Hotline Miami (top-down buildings, great clarity)
- Stardew Valley (tile variety, seamless transitions)

---

## Future Enhancements (Tier 2+)

### Interactive Elements
- Destructible bushes (shoot to clear path)
- Doors that open/close
- Bridges over water
- Teleport pads between areas

### Environmental Effects
- Rain on outdoor levels (visual only)
- Shadows from buildings
- Light sources (streetlights, windows)
- Animated elements (birds, cars passing)

### Tactical Depth
- Cover system (hide behind buildings)
- High ground advantage (elevated tiles)
- Water slows movement
- Roads increase movement speed

---

## Notes

- Tile art style should be **simple and clear** (not photorealistic)
- **Consistency** is more important than detail
- Test with colorblind mode in mind (don't rely only on color)
- Keep performance in mind (many tiles to render each frame)
- Can mix and match tiles from different packs if style matches
- Document asset sources for future reference

---

## Success Metrics

**Implementation Complete When**:
- ✅ At least 5 tile types render correctly
- ✅ Collision system works with new tiles
- ✅ Game runs at 60fps with tiles
- ✅ Visual variety between levels
- ✅ Players can navigate easily
- ✅ Thematic coherence (real world, not dungeon)

**Player Feedback Goals**:
- "This looks way better than before"
- "I like fighting demons in a neighborhood"
- "The levels feel different from each other"
- "It's easy to see where I can walk"

---

## Quick Start Implementation (Phase 1 + 2)

### Step 1: Load Sprite Sheets (game.js)

Add after loading other images (around line 480):

```javascript
// Load terrain tile sprite sheets
let buildingTilesImg = null;
let terrainTilesImg = null;

try {
    buildingTilesImg = await loadImage(`${scriptDirectory}/images/terrains/houses-and-buildings256.png`);
    console.log('✅ Building tiles loaded (8x8 sheet, 64 tiles)');

    terrainTilesImg = await loadImage(`${scriptDirectory}/images/terrains/terrain256.png`);
    console.log('✅ Terrain tiles loaded (8x8 sheet, 64 tiles)');
} catch (error) {
    console.error('Error loading tile sprite sheets:', error);
}
```

### Step 2: Add to Assets Object (game.js)

```javascript
const assets = {
    playerImg,
    otherPlayerImg,
    demonImages,
    explosionImg,
    healingPointImg,
    shieldImg,
    particleBurstImg,
    buildingTilesImg,  // NEW
    terrainTilesImg    // NEW
};
```

### Step 3: Add Tile Extraction Helper (Renderer.js)

Add new method to Renderer class:

```javascript
drawTileFromSheet(sheet, tileIndex, destX, destY, destWidth = 25, destHeight = 25) {
    if (!sheet || !sheet.complete) return;

    // Calculate position in 8x8 grid
    const row = Math.floor(tileIndex / 8);
    const col = tileIndex % 8;
    const sourceX = col * 32;
    const sourceY = row * 32;

    // Draw tile (scale 32x32 to 25x25)
    this.ctx.drawImage(
        sheet,
        sourceX, sourceY, 32, 32,
        destX, destY, destWidth, destHeight
    );
}
```

### Step 4: Update drawWalls to Use Tiles (Renderer.js)

Replace the gradient fill in `drawWalls()` method with tile rendering. The full updated method should look like this - find and modify the existing `drawWalls()` around line 422.

### Step 5: Test

1. Refresh browser
2. Should see houses/buildings instead of brown walls
3. Check console for "✅ Building tiles loaded" messages

### Troubleshooting

**If tiles don't show**:
- Check console for image load errors
- Verify sprite sheet paths are correct
- Check `assets.buildingTilesImg` exists in renderer
- Verify `drawTileFromSheet` is being called

**If tiles look wrong**:
- Check tile index math (row/col calculation)
- Verify source coordinates (sourceX, sourceY)
- Check scaling (32x32 → 25x25)

---

**Next Steps After Tiles Work**:
1. Add grass background layer (terrain tiles)
2. Add water obstacles (blue terrain tiles)  
3. Add decorative trees/bushes
4. Move on to sound effects or mobile readiness
