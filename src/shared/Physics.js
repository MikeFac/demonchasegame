var Constants;
if (typeof module !== 'undefined' && module.exports) {
    Constants = require('./Constants');
} else {
    Constants = window.Constants;
}

class Physics {
    static isOverlapping(x, y, width, height, gameState, excludeId = null, wallGrid = null) {
        // Check overlap with players
        for (const playerCode in gameState.players) {
            const player = gameState.players[playerCode];
            if (
                x + width / 2 > player.x - player.width / 2 &&
                x - width / 2 < player.x + player.width / 2 &&
                y + height / 2 > player.y - player.height / 2 &&
                y - height / 2 < player.y + player.height / 2
            ) {
                return true;
            }
        }

        // Check overlap with monsters
        for (const monster of gameState.monsters) {
            if (monster.id === excludeId) continue;
            if (
                x + width / 2 > monster.x - monster.width / 2 &&
                x - width / 2 < monster.x + monster.width / 2 &&
                y + height / 2 > monster.y - monster.height / 2 &&
                y - height / 2 < monster.y + monster.height / 2
            ) {
                return true;
            }
        }

        // Check overlap with walls via spatial grid (O(1)) or fallback to array
        if (wallGrid) {
            if (wallGrid.collides(x, y, width, height)) return true;
        } else if (gameState.walls) {
            for (const wall of gameState.walls) {
                if (
                    x + width / 2 > wall.x &&
                    x - width / 2 < wall.x + wall.width &&
                    y + height / 2 > wall.y &&
                    y - height / 2 < wall.y + wall.height
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    static findNearestPlayer(monster, gameState) {
        let nearestPlayer = null;
        let shortestDistance = Infinity;

        for (const playerCode in gameState.players) {
            const player = gameState.players[playerCode];
            // Skip ghosts and disconnected players — monsters only target living players
            if (player.state && player.state !== 'alive') continue;

            const dx = player.x - monster.x;
            const dy = player.y - monster.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestPlayer = player;
            }
        }

        return nearestPlayer;
    }

    /**
     * Check collision between a circle and a rectangle
     * @param {Object} circle - {x, y, radius}
     * @param {Object} rect - {x, y, width, height} (x,y are center)
     * @returns {boolean}
     */
    static checkCollisionCircleRect(circle, rect) {
        // Calculate distance between circle center and rect center
        const distX = Math.abs(circle.x - rect.x);
        const distY = Math.abs(circle.y - rect.y);

        // If distance is greater than half_width + radius, they are too far apart
        if (distX > (rect.width / 2 + circle.radius)) { return false; }
        if (distY > (rect.height / 2 + circle.radius)) { return false; }

        // If distance is less than half_width, they definitely intersect
        if (distX <= (rect.width / 2)) { return true; }
        if (distY <= (rect.height / 2)) { return true; }

        // Corner case (circle center is outside the rect, but circle intersects corner)
        const dx = distX - rect.width / 2;
        const dy = distY - rect.height / 2;
        return (dx * dx + dy * dy <= (circle.radius * circle.radius));
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Physics;
} else {
    window.Physics = Physics;
}
