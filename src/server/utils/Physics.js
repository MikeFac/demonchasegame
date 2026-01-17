const Constants = require('../../shared/Constants');

class Physics {
    static isOverlapping(x, y, width, height, gameState, excludeId = null) {
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

        // Check overlap with walls
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

        return false;
    }

    static findNearestPlayer(monster, gameState) {
        let nearestPlayer = null;
        let shortestDistance = Infinity;

        for (const playerCode in gameState.players) {
            const player = gameState.players[playerCode];
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
}

module.exports = Physics;
