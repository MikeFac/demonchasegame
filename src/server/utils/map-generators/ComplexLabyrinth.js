const Constants = require('../../../shared/Constants');

/**
 * Complex Labyrinth Generator
 * Long winding paths, few rooms, using Recursive Backtracking on 3x3 blocks to make somewhat wide paths (75px).
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    const grid = [];

    // Initialize with walls
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = true;
        }
    }

    // Config: 3-cell wide paths (75px)
    // Stride = 4 to leave 1 wall between paths? 
    // If path is 3 wide, and wall is 1 wide, stride is 4.
    const pathWidth = 3;
    const wallWidth = 1;
    const stride = pathWidth + wallWidth;

    const BORDER = 2;

    // Effective maze grid
    const lCols = Math.floor((cols - BORDER * 2) / stride);
    const lRows = Math.floor((rows - BORDER * 2) / stride);

    const visited = new Array(lRows).fill(0).map(() => new Array(lCols).fill(false));
    const stack = [];

    // Helper to carve a WxH block at logical (lr, lc)
    function carveBlock(lr, lc) {
        const pr = BORDER + lr * stride;
        const pc = BORDER + lc * stride;

        for (let r = 0; r < pathWidth; r++) {
            for (let c = 0; c < pathWidth; c++) {
                if (pr + r < rows && pc + c < cols) {
                    grid[pr + r][pc + c] = false;
                }
            }
        }
    }

    // Helper to connect blocks (remove walls between them)
    function connect(r1, c1, r2, c2) {
        // Blocks are at (r1,c1) and (r2,c2)
        // We need to clear the wallWidth gap between them.
        // And we need to clear it typically aligned with the center or full width?
        // Let's clear full width for open flow.

        const pr1 = BORDER + r1 * stride;
        const pc1 = BORDER + c1 * stride;

        if (r2 > r1) { // Down
            // Clear rows between pr1+pathWidth and pr2
            const gapStartR = pr1 + pathWidth;
            const gapEndR = pr1 + stride; // start of next block
            for (let r = gapStartR; r < gapEndR; r++) {
                for (let c = 0; c < pathWidth; c++) {
                    grid[r][pc1 + c] = false;
                }
            }
        } else if (r2 < r1) { // Up
            const gapStartR = pr1 - wallWidth;
            const gapEndR = pr1;
            for (let r = gapStartR; r < gapEndR; r++) {
                for (let c = 0; c < pathWidth; c++) {
                    grid[r][pc1 + c] = false;
                }
            }
        } else if (c2 > c1) { // Right
            const gapStartC = pc1 + pathWidth;
            const gapEndC = pc1 + stride;
            for (let c = gapStartC; c < gapEndC; c++) {
                for (let r = 0; r < pathWidth; r++) {
                    grid[pr1 + r][c] = false;
                }
            }
        } else { // Left
            const gapStartC = pc1 - wallWidth;
            const gapEndC = pc1;
            for (let c = gapStartC; c < gapEndC; c++) {
                for (let r = 0; r < pathWidth; r++) {
                    grid[pr1 + r][c] = false;
                }
            }
        }
    }

    // Start DFS
    const startR = Math.floor(lRows / 2);
    const startC = Math.floor(lCols / 2);
    visited[startR][startC] = true;
    carveBlock(startR, startC);
    stack.push({ r: startR, c: startC });

    while (stack.length > 0) {
        const cur = stack[stack.length - 1];
        const nbrs = [];
        const dirs = [
            { r: cur.r - 1, c: cur.c },
            { r: cur.r + 1, c: cur.c },
            { r: cur.r, c: cur.c - 1 },
            { r: cur.r, c: cur.c + 1 }
        ];

        for (const d of dirs) {
            if (d.r >= 0 && d.r < lRows && d.c >= 0 && d.c < lCols && !visited[d.r][d.c]) {
                nbrs.push(d);
            }
        }

        if (nbrs.length > 0) {
            const next = nbrs[Math.floor(Math.random() * nbrs.length)];
            visited[next.r][next.c] = true;
            carveBlock(next.r, next.c);
            connect(cur.r, cur.c, next.r, next.c);
            stack.push(next);
        } else {
            stack.pop();
        }
    }

    // Add significant dead-end removal (loops) to make it less frustrating
    const LOOP_CHANCE = 0.2;
    for (let r = 0; r < lRows - 1; r++) {
        for (let c = 0; c < lCols; c++) {
            if (Math.random() < LOOP_CHANCE) connect(r, c, r + 1, c);
        }
    }
    for (let r = 0; r < lRows; r++) {
        for (let c = 0; c < lCols - 1; c++) {
            if (Math.random() < LOOP_CHANCE) connect(r, c, r, c + 1);
        }
    }

    // Create wall objects
    const walls = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                walls.push({
                    x: c * cellSize,
                    y: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    type: Math.floor(Math.random() * 4)
                });
            }
        }
    }

    // Spawn
    const spawnX = (BORDER + startC * stride + 1.5) * cellSize;
    const spawnY = (BORDER + startR * stride + 1.5) * cellSize;

    return { walls, grid, cols, rows, spawnX, spawnY };
}

module.exports = generateMaze;
