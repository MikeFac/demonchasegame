# Real-World Map Generation Plan

## Overview
Design and implement algorithms to generate realistic real-world environments (neighborhoods, cities, parks) instead of abstract dungeon mazes. The goal is to create navigable maps that feel like actual places where spiritual warfare happens.

**Current System**: Maze generator creates abstract corridors and walls
**Target System**: City/neighborhood generator creates roads, buildings, parks, and natural obstacles

---

## Current Maze System Analysis

### File: `src/server/utils/Maze.js`

**Current algorithm**: Recursive backtracking maze generation
- Creates perfect mazes (one path between any two points)
- Walls and corridors
- Abstract, dungeon-like

**Key characteristics**:
- Grid-based (CELL_SIZE = 25px)
- Returns wall array: `[{x, y, width, height, type}, ...]`
- Ensures connectivity (player can reach all areas)
- Random but deterministic

**Integration points**:
- Called from `Game.js` on level init
- Generates `walls` array
- Passed to client via `onWalls` socket event
- Used for collision detection via `WallGrid.js`

---

## Design Goals for Real-World Maps

### Level 1: Suburban Neighborhood
**Visual**: Residential streets with houses, lawns, trees

**Structure**:
- Grid of streets (horizontal and vertical)
- Houses placed in blocks between streets
- Front yards (grass) between houses and street
- Occasional trees, bushes for decoration
- Maybe a small park or playground

**Navigability**:
- Streets are wide corridors (easy to navigate)
- Buildings are obstacles (like walls)
- Clear sight lines (less claustrophobic than maze)

---

### Level 2: City Streets
**Visual**: Urban downtown with buildings, alleys, occasional fountains

**Structure**:
- Main streets (wider)
- Side alleys (narrower)
- Larger buildings (stores, offices)
- More dense than suburbs
- Harder to navigate (more turns, dead ends)

---

### Level 3: Park/Forest
**Visual**: Natural setting with trees, ponds, walking paths

**Structure**:
- Winding paths (organic, not grid-aligned)
- Clusters of trees (forests)
- Water bodies (ponds, streams)
- Open grassy areas
- Nature-themed obstacles

---

### Level 4: School/Office (Future)
**Visual**: Interior hallways, classrooms/cubicles

**Structure**:
- Long hallways
- Rooms off hallways
- Desks/furniture as obstacles
- More structured than outdoor levels

---

### Level 5: Church/Temple (Future)
**Visual**: Sacred building interior

**Structure**:
- Center aisle
- Pews as obstacles
- Altar/stage area
- Side chambers

---

## Map Generation Algorithms

### Algorithm 1: Grid City (Easiest - Recommended for Phase 1)

**Concept**: Manhattan-style grid of streets with buildings in blocks

**Pseudocode**:
```
1. Define grid spacing (e.g., every 5 cells = street)
2. For each grid square:
   - If on grid line: Place road tile
   - Else: Randomly place building or leave grass
3. Ensure minimum road width (2-3 cells)
4. Add variety: Different building types, occasional parks
5. Return wall array (buildings only, roads are walkable)
```

**Pros**:
- Simple to implement (30-60 mins)
- Always navigable (grid ensures connectivity)
- Looks immediately recognizable as city/neighborhood
- Easy to add variety (building types)

**Cons**:
- Can feel repetitive (all grids)
- Less organic than real cities

**Recommended for**: Levels 1 and 2 (Suburb and City)

---

### Algorithm 2: Perlin Noise Organic (Medium Complexity)

**Concept**: Use noise functions to create organic-looking terrain

**Pseudocode**:
```
1. Generate Perlin noise map (values 0-1 for each cell)
2. Threshold values:
   - 0.0-0.3: Water
   - 0.3-0.5: Grass (walkable)
   - 0.5-0.7: Trees/bushes (obstacles)
   - 0.7-1.0: Buildings (obstacles)
3. Apply post-processing:
   - Ensure connectivity (flood fill, add paths where needed)
   - Cluster similar tiles (make buildings groups, not scattered)
4. Return wall array
```

**Pros**:
- Organic, natural-looking
- Great for park/forest levels
- Interesting variety

**Cons**:
- Requires Perlin noise library or implementation
- May create disconnected areas (need post-processing)
- Harder to guarantee navigability

**Recommended for**: Level 3 (Park/Forest)

---

### Algorithm 3: Template-Based (Hybrid)

**Concept**: Hand-design templates, procedurally combine/vary them

**Pseudocode**:
```
1. Define templates (chunks of map):
   - House block: 4x4 cells with house in center, grass around
   - Street segment: 10x3 cells of road
   - Park: 6x6 cells with trees, pond, grass
   - Intersection: 4x4 cells of roads crossing
2. Procedurally place templates:
   - Start with street grid
   - Fill blocks with house/park templates
   - Add variation (rotate, randomize building types)
3. Stitch templates together seamlessly
4. Return wall array
```

**Pros**:
- Best of both worlds (design + procedural)
- Guaranteed quality (templates are hand-crafted)
- Easy to add new templates over time
- Very flexible

**Cons**:
- Requires creating templates upfront
- More code to manage template system

**Recommended for**: All levels (most versatile)

---

## Implementation Strategy

### Phase 1: Grid City Generator (2-3 hours)

**Goal**: Replace maze with simple grid city for immediate visual improvement

**Steps**:

1. **Create new file**: `src/server/utils/CityGenerator.js`

2. **Implement grid algorithm**:
   - Grid spacing: Every 6 cells = street (horizontal and vertical)
   - Buildings: Fill non-street cells randomly (70% chance)
   - Variety: 6-8 different building tile types (random per building)

3. **Return same format as Maze.js**:
   ```javascript
   return {
       walls: [{x, y, width, height, type}, ...],
       grid: [[boolean]], // True = obstacle, false = walkable
       rows: number,
       cols: number,
       spawnX: number,
       spawnY: number
   };
   ```

4. **Update Game.js** to call `CityGenerator` instead of `Maze`:
   ```javascript
   // OLD
   const mazeResult = generateMaze(width, height, cellSize);

   // NEW
   const cityResult = generateCity(width, height, cellSize, level);
   ```

5. **Test**: Should see grid of roads with buildings, fully navigable

**Time estimate**: 2-3 hours (clean implementation)

---

### Phase 2: Add Terrain Variety (1-2 hours)

**Goal**: Add grass backgrounds, occasional trees, water features

**Enhancements**:

1. **Grass background layer**:
   - All non-road, non-building cells = grass
   - Use terrain sprite sheet (light grass tile)

2. **Decorative elements**:
   - 5-10% of grass cells = trees (passable or impassable)
   - Small water bodies in parks (2-3 per map)

3. **Building clustering**:
   - Make buildings group together more (not scattered)
   - Leave some blocks as parks (all grass, few trees)

4. **Return additional data**:
   ```javascript
   return {
       walls: [...],           // Buildings only
       terrain: [...],         // Trees, water, decorations
       background: 'grass',    // Default ground tile
       grid: [...],
       rows, cols,
       spawnX, spawnY
   };
   ```

---

### Phase 3: Level-Specific Generators (2-3 hours)

**Goal**: Different algorithm per level theme

**Implementation**:

1. **Factory pattern**:
   ```javascript
   function generateLevelMap(level, width, height, cellSize) {
       switch(level) {
           case 1: return generateSuburb(width, height, cellSize);
           case 2: return generateCity(width, height, cellSize);
           case 3: return generatePark(width, height, cellSize);
           case 4: return generateSchool(width, height, cellSize);
           case 5: return generateChurch(width, height, cellSize);
           default: return generateCity(width, height, cellSize);
       }
   }
   ```

2. **Level-specific tweaks**:
   - **Suburb**: Wide streets, small buildings, lots of grass
   - **City**: Narrow streets, large buildings, concrete
   - **Park**: Winding paths, trees, water, organic layout
   - **School**: Hallways, rooms, structured grid
   - **Church**: Center aisle, pews, open spaces

---

## Technical Specifications

### Grid System

**World size**: 2000×2000px (from Constants.js)
**Cell size**: 25px
**Grid dimensions**: 80×80 cells

**Road width**: 2-3 cells (50-75px) for easy navigation
**Building size**: 1-4 cells (25-100px) for variety

---

### Data Structures

#### Wall Object (Building/Obstacle)
```javascript
{
    x: 100,           // World position X
    y: 200,           // World position Y
    width: 25,        // Usually CELL_SIZE (25px)
    height: 25,       // Usually CELL_SIZE (25px)
    type: 0-5,        // Building tile type (for variety)
    tileSheet: 'buildings',  // Which sprite sheet to use
    tileIndex: 15     // Which tile in sprite sheet (0-63)
}
```

#### Terrain Object (Decorative Element)
```javascript
{
    x: 150,
    y: 250,
    width: 25,
    height: 25,
    tileSheet: 'terrain',
    tileIndex: 4,     // Tree, bush, water, etc.
    passable: false   // Can player walk through?
}
```

#### Background Tile
```javascript
{
    tileSheet: 'terrain',
    tileIndex: 0      // Default grass tile for all empty space
}
```

---

### Connectivity Guarantee

**Problem**: Random generation might create unreachable areas

**Solutions**:

1. **Flood fill check** (after generation):
   ```javascript
   function ensureConnectivity(grid, startX, startY) {
       const visited = floodFill(grid, startX, startY);
       const totalWalkable = countWalkableCells(grid);
       const reachable = visited.size;

       if (reachable < totalWalkable * 0.9) {
           // Less than 90% reachable - add connecting paths
           addConnectingPaths(grid, visited);
       }
   }
   ```

2. **Grid-based generation** (inherently connected):
   - Grid streets ensure all blocks are reachable
   - No flood fill needed

3. **Template-based** (controlled placement):
   - Only place templates that maintain connectivity
   - Check before placing each template

**Recommendation**: Use grid-based for Phase 1 (no connectivity check needed)

---

## Code Organization

### File Structure

```
src/server/utils/
├── Maze.js                    (Keep for reference, may reuse code)
├── CityGenerator.js           (NEW - Grid city for levels 1-2)
├── ParkGenerator.js           (NEW - Organic park for level 3)
├── InteriorGenerator.js       (NEW - School/church for levels 4-5)
└── MapGeneratorFactory.js     (NEW - Routes to correct generator)
```

### API Design

**All generators follow same interface**:

```javascript
/**
 * Generate a map for the specified level
 * @param {number} worldWidth - Total world width in pixels
 * @param {number} worldHeight - Total world height in pixels
 * @param {number} cellSize - Size of each grid cell (25px)
 * @param {number} level - Game level (1-5, affects theme)
 * @returns {Object} Map data
 */
function generateMap(worldWidth, worldHeight, cellSize, level) {
    return {
        walls: Array,        // Obstacles (buildings, trees, etc.)
        terrain: Array,      // Decorative elements
        background: String,  // Default ground tile type
        grid: Array,         // 2D boolean collision grid
        rows: Number,
        cols: Number,
        spawnX: Number,      // Safe starting position
        spawnY: Number
    };
}
```

---

## Algorithm Details: Grid City

### Pseudocode (Detailed)

```javascript
function generateCity(worldWidth, worldHeight, cellSize, level) {
    const rows = Math.floor(worldHeight / cellSize);
    const cols = Math.floor(worldWidth / cellSize);

    // 1. Initialize grid (all walkable)
    const grid = createEmptyGrid(rows, cols);

    // 2. Define street grid
    const streetSpacing = 6; // Every 6 cells
    const roadWidth = 2;     // 2 cells wide

    // 3. Place streets (horizontal and vertical)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isStreetRow = (r % streetSpacing < roadWidth);
            const isStreetCol = (c % streetSpacing < roadWidth);

            if (isStreetRow || isStreetCol) {
                grid[r][c] = false; // Walkable (road)
            } else {
                grid[r][c] = true;  // Will place building here (maybe)
            }
        }
    }

    // 4. Place buildings in blocks (70% density)
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] && Math.random() < 0.7) {
                // Place building
                const tileType = Math.floor(Math.random() * 6); // 6 building types
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: tileType,
                    tileSheet: 'buildings',
                    tileIndex: [0, 1, 2, 8, 9, 10][tileType] // Building tile indices
                });
            } else if (grid[r][c]) {
                grid[r][c] = false; // Leave as grass (walkable)
            }
        }
    }

    // 5. Find safe spawn point (on a road)
    const spawnX = Math.floor(cols / 2) * cellSize;
    const spawnY = Math.floor(rows / 2) * cellSize;

    return {
        walls,
        terrain: [],  // Add later
        background: 'grass',
        grid,
        rows,
        cols,
        spawnX,
        spawnY
    };
}
```

### Variations

**Suburb** (Level 1):
- Wider streets: `streetSpacing = 8`, `roadWidth = 3`
- Lower density: `buildingChance = 0.5`
- Smaller buildings: Single cell (25×25)

**City** (Level 2):
- Narrower streets: `streetSpacing = 5`, `roadWidth = 2`
- Higher density: `buildingChance = 0.8`
- Larger buildings: Sometimes 2×2 cells (50×50)

**Dense alleys**:
- Add extra vertical streets: `if (c % 3 === 0) grid[r][c] = false`

---

## Testing Strategy

### Unit Tests (Optional)

**Test file**: `test/test-city-generator.js`

```javascript
const { generateCity } = require('../src/server/utils/CityGenerator');

// Test 1: Returns valid structure
const result = generateCity(2000, 2000, 25, 1);
console.assert(Array.isArray(result.walls), 'Should return walls array');
console.assert(result.spawnX >= 0 && result.spawnX < 2000, 'Valid spawn X');

// Test 2: Spawn point is walkable
const spawnRow = Math.floor(result.spawnY / 25);
const spawnCol = Math.floor(result.spawnX / 25);
console.assert(!result.grid[spawnRow][spawnCol], 'Spawn should be walkable');

// Test 3: Has reasonable number of walls
const wallCount = result.walls.length;
console.assert(wallCount > 100 && wallCount < 5000, 'Reasonable wall count');

console.log('✅ All city generator tests passed');
```

### Visual Testing

**Debug renderer** (temporary):

```javascript
// In Renderer.js, add debug mode
function drawGridDebug(grid, camera) {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const x = c * 25 - camera.x;
            const y = r * 25 - camera.y;

            if (grid[r][c]) {
                ctx.fillStyle = 'red';    // Obstacle
            } else {
                ctx.fillStyle = 'green';  // Walkable
            }
            ctx.fillRect(x, y, 25, 25);
        }
    }
}
```

**Check for**:
- [ ] Streets are clearly visible (green paths)
- [ ] Buildings are clustered (not random noise)
- [ ] All areas are reachable from spawn
- [ ] Map looks like a city/neighborhood (not abstract)

---

## Integration with Existing System

### Changes Required

#### 1. Game.js (Minimal Changes)

**Current** (line 34):
```javascript
const mazeResult = generateMaze(this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE);
```

**Updated**:
```javascript
const cityResult = generateCity(this.constants.WORLD_WIDTH, this.constants.WORLD_HEIGHT, this.constants.CELL_SIZE, this.gameState.gameLevel);
```

**That's it!** Return format is same, so rest of code works unchanged.

#### 2. Add CityGenerator.js (New File)

See detailed implementation in next section.

#### 3. Renderer.js (Already Updated)

Tile rendering from REAL_WORLD_TILES_PLAN.md handles new tiles.

---

## Sample Implementation: CityGenerator.js

```javascript
const Constants = require('../shared/Constants');

/**
 * Generate a grid-based city map
 * @param {number} worldWidth - World width in pixels (default 2000)
 * @param {number} worldHeight - World height in pixels (default 2000)
 * @param {number} cellSize - Grid cell size (default 25)
 * @param {number} level - Game level (affects density, style)
 * @returns {Object} Map data {walls, terrain, grid, rows, cols, spawnX, spawnY}
 */
function generateCity(worldWidth, worldHeight, cellSize = 25, level = 1) {
    const rows = Math.floor(worldHeight / cellSize);
    const cols = Math.floor(worldWidth / cellSize);

    // Level-specific parameters
    const params = getLevelParameters(level);

    // Initialize grid (true = obstacle, false = walkable)
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = false; // Start all walkable
        }
    }

    // Place street grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isStreetRow = (r % params.streetSpacing < params.roadWidth);
            const isStreetCol = (c % params.streetSpacing < params.roadWidth);

            if (!isStreetRow && !isStreetCol) {
                // Not on street - might place building
                grid[r][c] = true; // Mark as potential obstacle
            }
        }
    }

    // Place buildings
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] && Math.random() < params.buildingDensity) {
                const tileType = Math.floor(Math.random() * params.buildingTypes.length);
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: tileType,
                    tileSheet: 'buildings',
                    tileIndex: params.buildingTypes[tileType]
                });
            } else {
                grid[r][c] = false; // Leave as grass
            }
        }
    }

    // Find spawn point (center of map, on a road)
    let spawnX = Math.floor(cols / 2) * cellSize;
    let spawnY = Math.floor(rows / 2) * cellSize;

    // Ensure spawn is on walkable ground
    const spawnRow = Math.floor(spawnY / cellSize);
    const spawnCol = Math.floor(spawnX / cellSize);
    if (grid[spawnRow][spawnCol]) {
        // Spawn was in a building, move to nearest road
        for (let offset = 1; offset < 10; offset++) {
            if (!grid[spawnRow + offset]?.[spawnCol]) {
                spawnY = (spawnRow + offset) * cellSize;
                break;
            }
        }
    }

    return {
        walls,
        terrain: [], // Add later
        background: 'grass',
        grid,
        rows,
        cols,
        spawnX,
        spawnY
    };
}

/**
 * Get level-specific generation parameters
 */
function getLevelParameters(level) {
    const levels = {
        1: { // Suburb
            streetSpacing: 8,
            roadWidth: 3,
            buildingDensity: 0.5,
            buildingTypes: [0, 1, 2, 8, 9] // Small houses
        },
        2: { // City
            streetSpacing: 6,
            roadWidth: 2,
            buildingDensity: 0.75,
            buildingTypes: [9, 10, 16, 17, 18] // Larger buildings
        },
        3: { // Park (use different generator eventually)
            streetSpacing: 10,
            roadWidth: 2,
            buildingDensity: 0.2,
            buildingTypes: [3] // Small structures only
        },
        4: { // School (future)
            streetSpacing: 5,
            roadWidth: 2,
            buildingDensity: 0.6,
            buildingTypes: [10, 11, 12]
        },
        5: { // Church (future)
            streetSpacing: 7,
            roadWidth: 3,
            buildingDensity: 0.4,
            buildingTypes: [3, 4, 5]
        }
    };

    return levels[level] || levels[1]; // Default to level 1
}

module.exports = { generateCity, getLevelParameters };
```

---

## Deployment Plan

### Phase 1: Basic Grid City (Week 1)
- [ ] Create `CityGenerator.js`
- [ ] Implement grid algorithm
- [ ] Update `Game.js` to use CityGenerator
- [ ] Test with building tiles
- [ ] Verify connectivity
- [ ] Deploy to production

### Phase 2: Visual Polish (Week 2)
- [ ] Add grass background layer
- [ ] Add terrain decorations (trees, bushes)
- [ ] Building clustering improvements
- [ ] Level-specific parameters tuning

### Phase 3: Advanced Generators (Week 3+)
- [ ] Organic park generator (Perlin noise)
- [ ] Interior generators (school, church)
- [ ] Template system (optional)

---

## Success Metrics

**Phase 1 Complete When**:
- ✅ Map looks like a city/neighborhood (not a maze)
- ✅ Streets are clearly visible paths
- ✅ Buildings are recognizable as houses/stores
- ✅ Player can navigate easily
- ✅ All areas are reachable
- ✅ Performance is acceptable (60fps)

**User Feedback**:
- "This looks like a real place!"
- "I can tell where to go now"
- "Fighting demons in a neighborhood makes sense"

---

## Future Enhancements

### Advanced Features
- [ ] Multi-floor buildings (enter/exit)
- [ ] Day/night cycle (visual only)
- [ ] Weather effects (rain, fog)
- [ ] Destructible environment (break fences, bushes)
- [ ] Secret areas (hidden alleys, basements)

### Procedural Variety
- [ ] Different city layouts (grid vs organic)
- [ ] Landmarks (churches, schools) as key points
- [ ] Themed neighborhoods (rich vs poor areas)
- [ ] Natural features (hills, rivers)

### Performance
- [ ] Tile chunking (only load visible areas)
- [ ] Level streaming (load next level in background)
- [ ] Optimized collision (spatial hash instead of grid)

---

## Notes

- Keep it simple for Phase 1 (grid city)
- Focus on "feels like a real place" over complex algorithms
- Test early and often with real players
- Iterate based on feedback (don't over-engineer)
- Maintain same API as Maze.js for easy integration
- Document any changes to data structures clearly

---

## Resources

- Perlin Noise: https://github.com/josephg/noisejs
- PCG Book: http://pcgbook.com/ (procedural generation theory)
- Red Blob Games: https://www.redblobgames.com/maps/terrain-from-noise/ (excellent tutorials)
