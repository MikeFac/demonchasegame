function generateMaze(width, height, cellSize = 100) {
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    const walls = [];

    // Create grid of cells
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(false));
    const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));

    // Recursive backtracker
    function carve(row, col) {
        visited[row][col] = true;

        // Randomize directions
        const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0]
        ].sort(() => Math.random() - 0.5);

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && !visited[newRow][newCol]) {
                // Don't create wall between current and next cell
                grid[row][col] = true;
                carve(newRow, newCol);
            }
        }
    }

    // Start from random position
    carve(Math.floor(Math.random() * rows), Math.floor(Math.random() * cols));

    // Convert grid to walls (add walls around uncarved areas)
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (!visited[row][col] || Math.random() < 0.3) { // 30% chance to add obstacle in carved areas
                walls.push({
                    x: col * cellSize,
                    y: row * cellSize,
                    width: cellSize,
                    height: cellSize
                });
            }
        }
    }

    return walls;
}

module.exports = generateMaze;
