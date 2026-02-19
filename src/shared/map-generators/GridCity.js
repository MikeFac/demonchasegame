(function () {
var Constants;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('../Constants');
} else {
    Constants = window.Constants;
}

/**
 * Grid City Generator
 * Regular grid of city blocks with streets.
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    const grid = [];

    // Initialize as OPEN (streets)
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            // World border
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = true;
            } else {
                grid[r][c] = false;
            }
        }
    }

    // Config
    const BLOCK_SIZE = 6; // 6x6 cells (150px)
    const STREET_WIDTH = 4; // 4 cells (100px)
    const STRIDE = BLOCK_SIZE + STREET_WIDTH;

    const BORDER = 2; // Offset

    // Calculate number of blocks
    // Playable area: cols - BORDER*2
    const numBlockCols = Math.floor((cols - BORDER * 2) / STRIDE);
    const numBlockRows = Math.floor((rows - BORDER * 2) / STRIDE);

    for (let br = 0; br < numBlockRows; br++) {
        for (let bc = 0; bc < numBlockCols; bc++) {
            const rStart = BORDER + br * STRIDE;
            const cStart = BORDER + bc * STRIDE;

            // Fill block
            for (let r = 0; r < BLOCK_SIZE; r++) {
                for (let c = 0; c < BLOCK_SIZE; c++) {
                    if (rStart + r < rows && cStart + c < cols) {
                        grid[rStart + r][cStart + c] = true;
                    }
                }
            }

            // Randomly remove some blocks to make "parks" or open plazas?
            // 10% chance
            if (Math.random() < 0.1) {
                for (let r = 0; r < BLOCK_SIZE; r++) {
                    for (let c = 0; c < BLOCK_SIZE; c++) {
                        if (rStart + r < rows && cStart + c < cols) {
                            grid[rStart + r][cStart + c] = false;
                        }
                    }
                }
            }
        }
    }

    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    // Use standard wall tiles for buildings
                    type: Math.floor(Math.random() * 8) + 8 // 8-15
                });
            }
        }
    }

    // Spawn in a street intersection near center
    // Center block index
    let centerBr = Math.floor(numBlockRows / 2);
    let centerBc = Math.floor(numBlockCols / 2);

    // Intersection is at bottom-right of block?
    // Block ends at BORDER + br*STRIDE + BLOCK_SIZE
    // Street starts there.
    const spawnC = (BORDER + centerBc * STRIDE + BLOCK_SIZE + STREET_WIDTH / 2);
    const spawnR = (BORDER + centerBr * STRIDE + BLOCK_SIZE + STREET_WIDTH / 2);

    const spawnX = spawnC * cellSize;
    const spawnY = spawnR * cellSize;

    return { walls, grid, cols, rows, spawnX, spawnY };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = generateMaze;
} else {
    window.GridCity = generateMaze;
}
})();
