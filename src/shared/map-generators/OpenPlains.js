(function () {
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

    // Place larger enterable buildings. A player is 48px wide and cells are
    // usually 25px, so one-cell doors are visually open but mechanically tight.
    const BUILDING_COUNT = 24;
    const MIN_SIZE = 7;
    const MAX_SIZE = 12;

    // Spawn area safe zone (center)
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);
    const SAFE_RADIUS = 10;

    function carveClearArea(x, y, w, h) {
        for (let r = Math.max(1, y); r < Math.min(rows - 1, y + h); r++) {
            for (let c = Math.max(1, x); c < Math.min(cols - 1, x + w); c++) {
                grid[r][c] = false;
            }
        }
    }

    function placeHollowBuilding(x, y, w, h, doorSide) {
        if (w < 5 || h < 5) return;

        for (let r = y; r < y + h; r++) {
            for (let c = x; c < x + w; c++) {
                const isBorder = r === y || r === y + h - 1 || c === x || c === x + w - 1;
                grid[r][c] = isBorder;
            }
        }

        const doorWidth = Math.min(3, doorSide === 'top' || doorSide === 'bottom' ? w - 2 : h - 2);
        const doorStart = Math.floor((doorSide === 'top' || doorSide === 'bottom' ? w : h) / 2) - Math.floor(doorWidth / 2);

        if (doorSide === 'top') {
            for (let c = x + doorStart; c < x + doorStart + doorWidth; c++) grid[y][c] = false;
            carveClearArea(x + doorStart - 1, y - 3, doorWidth + 2, 4);
        } else if (doorSide === 'bottom') {
            for (let c = x + doorStart; c < x + doorStart + doorWidth; c++) grid[y + h - 1][c] = false;
            carveClearArea(x + doorStart - 1, y + h - 1, doorWidth + 2, 4);
        } else if (doorSide === 'left') {
            for (let r = y + doorStart; r < y + doorStart + doorWidth; r++) grid[r][x] = false;
            carveClearArea(x - 3, y + doorStart - 1, 4, doorWidth + 2);
        } else {
            for (let r = y + doorStart; r < y + doorStart + doorWidth; r++) grid[r][x + w - 1] = false;
            carveClearArea(x + w - 1, y + doorStart - 1, 4, doorWidth + 2);
        }
    }

    for (let i = 0; i < BUILDING_COUNT; i++) {
        const w = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
        const h = Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;

        const x = Math.floor(Math.random() * (cols - w - 2)) + 1;
        const y = Math.floor(Math.random() * (rows - h - 2)) + 1;

        // Check safe zone
        const dx = x + w / 2 - centerX;
        const dy = y + h / 2 - centerY;
        if (Math.sqrt(dx * dx + dy * dy) < SAFE_RADIUS) continue;

        const sides = ['top', 'bottom', 'left', 'right'];
        placeHollowBuilding(x, y, w, h, sides[Math.floor(Math.random() * sides.length)]);
    }

    // Story landmark structures. These are broad enough for the 48px player and
    // align with David/Goliath smooth-stone placements without requiring a
    // mission-specific map format.
    [
        { x: 22, y: 22, w: 11, h: 11, door: 'bottom' },
        { x: 88, y: 22, w: 11, h: 11, door: 'bottom' },
        { x: 56, y: 48, w: 12, h: 10, door: 'bottom' },
        { x: 32, y: 86, w: 11, h: 11, door: 'top' },
        { x: 84, y: 86, w: 11, h: 11, door: 'top' }
    ].forEach(function (building) {
        placeHollowBuilding(building.x, building.y, building.w, building.h, building.door);
    });

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
})();
