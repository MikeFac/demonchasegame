(function () {
    var Constants, Physics;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        Physics = require('../Physics');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        Physics = window.Physics;
    }

    class BulletManager {
        constructor(io, monsterManager, wallGrid, gameState) {
            this.io = io;
            this.monsterManager = monsterManager;
            this.wallGrid = wallGrid || null;
            this.gameState = gameState || null;
            this.bullets = [];
            this.bulletIdCounter = 0;
        }

        /**
         * Create a new bullet
         * @param {string} playerCode - Code of the player who shot
         * @param {Object} startPos - {x, y}
         * @param {Object} targetPos - {x, y}
         */
        addBullet(playerCode, startPos, targetPos) {
            var angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x);

            var bullet = {
                id: ++this.bulletIdCounter,
                playerCode: playerCode,
                x: startPos.x,
                y: startPos.y,
                vx: Math.cos(angle) * Constants.BULLET_SPEED,
                vy: Math.sin(angle) * Constants.BULLET_SPEED,
                radius: Constants.BULLET_RADIUS,
                active: true
            };

            this.bullets.push(bullet);
            return bullet;
        }

        /**
         * Update all bullets (movement, collision, cleanup)
         * @param {Object} gameState - Current game state
         */
        update(gameState) {
            var wallGrid = this.wallGrid;
            var monsterManager = this.monsterManager;
            var io = this.io;

            // 1. Move bullets
            this.bullets.forEach(function (bullet) {
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;

                if (bullet.x < 0 || bullet.x > Constants.WORLD_WIDTH ||
                    bullet.y < 0 || bullet.y > Constants.WORLD_HEIGHT) {
                    bullet.active = false;
                }
            });

            // 2. Check collisions (walls then monsters)
            for (var i = this.bullets.length - 1; i >= 0; i--) {
                var bullet = this.bullets[i];
                if (!bullet.active) continue;

                // Check collision with walls using spatial grid or fallback
                if (wallGrid) {
                    if (wallGrid.collidesCircle(bullet.x, bullet.y, bullet.radius)) {
                        bullet.active = false;
                    }
                } else if (gameState.walls) {
                    for (var wi = 0; wi < gameState.walls.length; wi++) {
                        if (Physics.checkCollisionCircleRect(
                            { x: bullet.x, y: bullet.y, radius: bullet.radius },
                            gameState.walls[wi]
                        )) {
                            bullet.active = false;
                            break;
                        }
                    }
                }
                if (!bullet.active) continue;

                // Check collision with monsters
                var player = gameState.players ? gameState.players[bullet.playerCode] : null;
                var hasSword = player && player.activeBuffs && player.activeBuffs.sword && player.activeBuffs.sword.active;
                var damage = hasSword ? Constants.BULLET_DAMAGE * Constants.SWORD_DAMAGE_MULTIPLIER : Constants.BULLET_DAMAGE;
                if (player && player.votdDamageBonus) {
                    damage = Math.ceil(damage * Constants.VOTD_DAMAGE_MULTIPLIER);
                }
                var maxHits = hasSword ? Constants.SWORD_PIERCE_COUNT : 1;

                if (!bullet.hitCount) bullet.hitCount = 0;

                for (var mi = 0; mi < gameState.monsters.length; mi++) {
                    var monster = gameState.monsters[mi];
                    if (Physics.checkCollisionCircleRect(
                        { x: bullet.x, y: bullet.y, radius: bullet.radius },
                        monster
                    )) {
                        if (!bullet.hitMonsters) bullet.hitMonsters = [];
                        if (bullet.hitMonsters.includes(monster.id)) continue;

                        bullet.hitMonsters.push(monster.id);
                        bullet.hitCount++;
                        monsterManager.damageMonster(monster.id, damage, bullet.playerCode);
                        io.emit('bulletHit', { x: bullet.x, y: bullet.y });

                        if (bullet.hitCount >= maxHits) {
                            bullet.active = false;
                            break;
                        }
                    }
                }
            }

            // 3. Cleanup inactive bullets
            this.bullets = this.bullets.filter(function (b) { return b.active; });

            // 4. Update GameState for client rendering
            gameState.bullets = this.bullets.map(function (b) {
                return {
                    id: b.id,
                    x: Math.round(b.x),
                    y: Math.round(b.y),
                    playerCode: b.playerCode
                };
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BulletManager;
    } else if (typeof window !== 'undefined') {
        window.BulletManager = BulletManager;
    }
})();
