var Constants;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('../Constants');
} else {
    Constants = window.Constants;
}

/**
 * Open Plains Generator
 * Mostly open space with scattered building structures (clusters of walls).
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    const grid = [];

    // Initialize as OPEN (false)
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            // Set border to walls
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = true;
            } else {
                grid[r][c] = false;
            }
        }
    }

    // Place random buildings
    const BUILDING_COUNT = 40; // Adjust density
    const MIN_SIZE = 3;
    const MAX_SIZE = 6;

    // Spawn area safe zone (center)
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);
    const SAFE_RADIUS = 10;

    for (let i = 0; i < BUILDING_COUNT; i++) {
        const w = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
        const h = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;

        const x = Math.floor(Math.random() * (cols - w - 2)) + 1;
        const y = Math.floor(Math.random() * (rows - h - 2)) + 1;

        // Check safe zone
        const dx = x + w / 2 - centerX;
        const dy = y + h / 2 - centerY;
        if (Math.sqrt(dx * dx + dy * dy) < SAFE_RADIUS) continue;

        // Place building
        for (let r = y; r < y + h; r++) {
            for (let c = x; c < x + w; c++) {
                grid[r][c] = true;
            }
        }

        // Carve "door" or opening in building?
        // Maybe some buildings are hollow?
        if (Math.random() < 0.5) {
            // Hollow out center
            for (let r = y + 1; r < y + h - 1; r++) {
                for (let c = x + 1; c < x + w - 1; c++) {
                    grid[r][c] = false;
                }
            }
            // Add door
            const side = Math.floor(Math.random() * 4);
            // 0: top, 1: bottom, 2: left, 3: right
            if (side === 0) grid[y][x + Math.floor(w / 2)] = false;
            else if (side === 1) grid[y + h - 1][x + Math.floor(w / 2)] = false;
            else if (side === 2) grid[y + Math.floor(h / 2)][x] = false;
            else if (side === 3) grid[y + Math.floor(h / 2)][x + w - 1] = false;
        }
    }

    // Create wall objects
    // For buildings, we can try to use specific tiles?
    // Renderer uses `wall.type` mapping to 0-15.
    // Standard maze used random(4).
    // Let's use more building-like tiles for Open Plains (4-15).
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: Math.floor(Math.random() * 12) + 4 // 4 to 15
                });
            }
        }
    }

    const spawnX = centerX * cellSize;
    const spawnY = centerY * cellSize;

    return { walls, grid, cols, rows, spawnX, spawnY };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = generateMaze;
} else {
    window.OpenPlains = generateMaze;
}
