(function () {
    var Constants;
    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
    } else {
        Constants = window.Constants;
    }

    class Physics {
        static isOverlapping(x, y, width, height, gameState, excludeId, wallGrid) {
            if (excludeId === undefined) excludeId = null;
            if (wallGrid === undefined) wallGrid = null;

            // Check overlap with players
            for (var playerCode in gameState.players) {
                var player = gameState.players[playerCode];
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
            for (var i = 0; i < gameState.monsters.length; i++) {
                var monster = gameState.monsters[i];
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
                for (var wi = 0; wi < gameState.walls.length; wi++) {
                    var wall = gameState.walls[wi];
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
            var nearestPlayer = null;
            var shortestDistance = Infinity;

            for (var playerCode in gameState.players) {
                var player = gameState.players[playerCode];
                if (player.state && player.state !== 'alive') continue;

                var dx = player.x - monster.x;
                var dy = player.y - monster.y;
                var distance = Math.sqrt(dx * dx + dy * dy);

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
            var distX = Math.abs(circle.x - rect.x);
            var distY = Math.abs(circle.y - rect.y);

            if (distX > (rect.width / 2 + circle.radius)) { return false; }
            if (distY > (rect.height / 2 + circle.radius)) { return false; }

            if (distX <= (rect.width / 2)) { return true; }
            if (distY <= (rect.height / 2)) { return true; }

            var dx = distX - rect.width / 2;
            var dy = distY - rect.height / 2;
            return (dx * dx + dy * dy <= (circle.radius * circle.radius));
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Physics;
    } else {
        window.Physics = Physics;
    }
})();
