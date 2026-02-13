const Constants = require('../../../shared/Constants');

/**
 * Narrow Paths Generator
 * Uses Recursive Backtracking to create a maze with guaranteed 2-cell wide paths (50px).
 *
 * @param {number} width 
 * @param {number} height 
 * @param {number} cellSize 
 */
function generateMaze(width, height, cellSize) {
    if (cellSize === undefined) cellSize = Constants.CELL_SIZE;

    // We want 2-cell wide paths.
    // The maze logic will operate on a "logical grid" where each logical cell is 2x2 physical cells.
    // Plus 2 cells border on each side? Or just standard buffer.

    // Physical dimensions
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

    // Initialize physical grid: true = wall
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = true;
        }
    }

    // Logical grid dimensions (approx half size)
    // We leave a 1-cell border around the edge of the world
    const BORDER = 1;

    // We want ensuring path width of 2 cells.
    // Effectively we are carving 2x2 blocks.
    // Logical step = 2.

    // Playable area
    const startCol = BORDER;
    const startRow = BORDER;
    const endCol = cols - BORDER;
    const endRow = rows - BORDER;

    const logicalCols = Math.floor((endCol - startCol) / 2);
    const logicalRows = Math.floor((endRow - startRow) / 2);

    const visited = new Array(logicalRows).fill(0).map(() => new Array(logicalCols).fill(false));

    // Recursive Backtracking
    function getNeighbors(lr, lc) {
        const neighbors = [];
        // Up
        if (lr > 0) neighbors.push({ r: lr - 1, c: lc, dr: -1, dc: 0 });
        // Down
        if (lr < logicalRows - 1) neighbors.push({ r: lr + 1, c: lc, dr: 1, dc: 0 });
        // Left
        if (lc > 0) neighbors.push({ r: lr, c: lc - 1, dr: 0, dc: -1 });
        // Right
        if (lc < logicalCols - 1) neighbors.push({ r: lr, c: lc + 1, dr: 0, dc: 1 });

        // Shuffle
        for (let i = neighbors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }
        return neighbors;
    }

    // Stack for backtracking
    // Start at a random spot
    const stack = [];
    const startLr = Math.floor(Math.random() * logicalRows);
    const startLc = Math.floor(Math.random() * logicalCols);
    visited[startLr][startLc] = true;
    stack.push({ r: startLr, c: startLc });

    // Helper to carve a 2x2 block
    function carveLogicalCell(lr, lc) {
        const pr = startRow + lr * 2;
        const pc = startCol + lc * 2;

        grid[pr][pc] = false;
        grid[pr][pc + 1] = false;
        grid[pr + 1][pc] = false;
        grid[pr + 1][pc + 1] = false;
    }

    // Helper to carve connection between cells
    function carveConnection(r1, c1, r2, c2) {
        const pr1 = startRow + r1 * 2;
        const pc1 = startCol + c1 * 2;
        const pr2 = startRow + r2 * 2;
        const pc2 = startCol + c2 * 2;

        // Connect them by clearing the wall between 2x2 blocks
        // The midpoint will be playing field for the connection
        const midR = (pr1 + pr2) / 2;
        const midC = (pc1 + pc2) / 2;

        // Carve the 2x2 area between them? 
        // Actually, if we carve the current cell + the next cell, they touch.
        // We just need to make sure the wall BETWEEN them is removed.
        // Since we are stepping by 2, they are adjacent 2x2 blocks.
        // E.g., (0,0) -> (0,1) logical
        // Physical: (r,c) -> (r, c+2)
        // We need to ensure cells are carved.

        // Carve destination
        carveLogicalCell(r2, c2);

        // Fill gap if any? adjacent 2x2s share an edge, so no gap.
        // Wait, standard grid:
        // C C W C C
        // C C W C C
        // If we move right, we skip ONE wall row?
        // No, our logical step is 2. 
        // 0,1 -> 2,3
        // So they are contiguous.
        // carveLogicalCell clears r, r+1 and c, c+1
        // Next is r, r+1 and c+2, c+3
        // So yes, they touch perfectly.
    }

    carveLogicalCell(startLr, startLc);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getNeighbors(current.r, current.c);

        const unvisited = neighbors.filter(n => !visited[n.r][n.c]);

        if (unvisited.length > 0) {
            const next = unvisited[0];
            visited[next.r][next.c] = true;
            carveConnection(current.r, current.c, next.r, next.c);
            stack.push({ r: next.r, c: next.c });
        } else {
            stack.pop();
        }
    }

    // Add some loops (remove random walls between logical cells)
    // to prevent dead ends from being too annoying
    const LOOP_FACTOR = 0.1; // 10% of walls removed
    // Iterate all logical cells, check right/down neighbors, remove wall if not connected?
    // Actually they are already connected if maze.
    // We want to add EXTRA connections.

    for (let r = 0; r < logicalRows; r++) {
        for (let c = 0; c < logicalCols; c++) {
            if (Math.random() < LOOP_FACTOR) {
                // Try connect to right
                if (c < logicalCols - 1) {
                    // Check if physically connected?
                    // We can just blindly carve and if it was already carved, no harm.
                    // But we want to connect checking if they were NOT connected in MST? 
                    // No, physical grid is all we have.
                    // Actually, since it's a perfect maze, all adjacent are connected eventually.
                    // But we want direct connection.
                    // Just carving the 2x2s makes them connected.
                    // Wait, recursive backtracking only connects the path taken.
                    // Neighbors NOT in the path are separated by walls (implicitly, because we didn't carve).
                    // BUT... we carved 2x2 blocks.
                    // If (r,c) is open and (r, c+1) is open, they ARE connected physically because they touch.
                    // The only "walls" are the ones we didn't carve.
                    // Recursive Backtracking visits ALL cells.
                    // So ALL cells are carved.
                    // So the entire map is one giant open room of 2x2 blocks?
                    // NO! 
                    // With spacing=2, we visit (0,0) physical, then (0,2).
                    // The "Wall" between them would be nothing if we carve 2x2.
                    // (0,0)-(1,1) is space. (0,2)-(1,3) is space.
                    // Col 1 and Col 2 touch.
                    // So we must have walls BETWEEN logical cells.
                    // Ah, step needs to be 3 if we want walls?
                    // Or we check physical.
                }
            }
        }
    }

    // RE-THINK: 2-cell wide paths with walls between them.
    // If path is 2 cells wide (50px), and wall is 1 cell wide (25px).
    // Total stride = 3 cells.
    // If we want GUARANTEED 2-cell path, we need 3-cell stride.

    // Reset grid
    for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) grid[r][c] = true; }

    const stride = 3;
    const lCols = Math.floor((cols - BORDER * 2) / stride);
    const lRows = Math.floor((rows - BORDER * 2) / stride);

    const lVisited = new Array(lRows).fill(0).map(() => new Array(lCols).fill(false));
    const lStack = [];

    const lStartR = Math.floor(Math.random() * lRows);
    const lStartC = Math.floor(Math.random() * lCols);
    lVisited[lStartR][lStartC] = true;
    lStack.push({ r: lStartR, c: lStartC });

    function carve2x2(lr, lc) {
        const pr = BORDER + lr * stride;
        const pc = BORDER + lc * stride;
        // Carve 2x2 at top-left of the 3x3 block
        grid[pr][pc] = false;
        grid[pr][pc + 1] = false;
        grid[pr + 1][pc] = false;
        grid[pr + 1][pc + 1] = false;
    }

    function connect(r1, c1, r2, c2) {
        // Carve the wall between them.
        // Neighbor is either right (c+1), down (r+1), etc.
        const pr1 = BORDER + r1 * stride;
        const pc1 = BORDER + c1 * stride;
        // 2x2 is at (pr1, pc1).

        if (r2 > r1) { // Down
            // Carve the 1 row gap below the 2x2
            const wallR = pr1 + 2;
            grid[wallR][pc1] = false;
            grid[wallR][pc1 + 1] = false;
        } else if (r2 < r1) { // Up
            const wallR = pr1 - 1;
            grid[wallR][pc1] = false;
            grid[wallR][pc1 + 1] = false;
        } else if (c2 > c1) { // Right
            const wallC = pc1 + 2;
            grid[pr1][wallC] = false;
            grid[pr1 + 1][wallC] = false;
        } else { // Left
            const wallC = pc1 - 1;
            grid[pr1][wallC] = false;
            grid[pr1 + 1][wallC] = false;
        }
    }

    carve2x2(lStartR, lStartC);

    while (lStack.length > 0) {
        const cur = lStack[lStack.length - 1];
        const nbrs = [];

        // Check neighbors
        const dirs = [
            { r: cur.r - 1, c: cur.c },
            { r: cur.r + 1, c: cur.c },
            { r: cur.r, c: cur.c - 1 },
            { r: cur.r, c: cur.c + 1 }
        ];

        for (const d of dirs) {
            if (d.r >= 0 && d.r < lRows && d.c >= 0 && d.c < lCols && !lVisited[d.r][d.c]) {
                nbrs.push(d);
            }
        }

        if (nbrs.length > 0) {
            // Pick random
            const next = nbrs[Math.floor(Math.random() * nbrs.length)];
            lVisited[next.r][next.c] = true;
            carve2x2(next.r, next.c);
            connect(cur.r, cur.c, next.r, next.c);
            lStack.push(next);
        } else {
            lStack.pop();
        }
    }

    // Add loops / break walls using sparse chance
    // Iterate vertical walls
    for (let r = 0; r < lRows - 1; r++) {
        for (let c = 0; c < lCols; c++) {
            // Gap between (r,c) and (r+1,c)
            // If they are not connected? (Check if wall exists)
            // But we can just try to open it with low prob
            if (Math.random() < 0.05) {
                connect(r, c, r + 1, c);
            }
        }
    }
    // Iterate horizontal walls
    for (let r = 0; r < lRows; r++) {
        for (let c = 0; c < lCols - 1; c++) {
            if (Math.random() < 0.05) {
                connect(r, c, r, c + 1);
            }
        }
    }

    // --- Output Generation (Walls & Spawn) ---

    // Spawn in random open cell
    let spawnX = width / 2;
    let spawnY = height / 2;

    // Find a valid spawn 3x3 block center
    const spawnLr = Math.floor(Math.random() * lRows);
    const spawnLc = Math.floor(Math.random() * lCols);
    // Center of that 2x2
    const pr = BORDER + spawnLr * stride;
    const pc = BORDER + spawnLc * stride;
    spawnX = (pc + 1) * cellSize; // right in the middle of 2x2
    spawnY = (pr + 1) * cellSize;

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

    return { walls, grid, cols, rows, spawnX, spawnY };
}

module.exports = generateMaze;
