const Constants = require('../../shared/Constants');
const Physics = require('../utils/Physics');

class BulletManager {
    constructor(io, monsterManager) {
        this.io = io;
        this.monsterManager = monsterManager;
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
        const angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x);

        const bullet = {
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
        // 1. Move bullets
        this.bullets.forEach(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Check boundaries
            if (bullet.x < 0 || bullet.x > Constants.WORLD_WIDTH ||
                bullet.y < 0 || bullet.y > Constants.WORLD_HEIGHT) {
                bullet.active = false;
            }
        });

        // 2. Check collisions with monsters
        // Optimization: Checking every bullet against every monster is O(N*M). 
        // With low counts (bullets < 10, monsters < 20), it's fine.

        // We iterate backwards to safely remove bullets if needed, though we mark them inactive instead
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.active) continue;

            // Check collision with walls (if we implement wall collision for bullets)
            // For now, let's just do monsters

            for (const monster of gameState.monsters) {
                if (Physics.checkCollisionCircleRect(
                    { x: bullet.x, y: bullet.y, radius: bullet.radius },
                    monster // Monster is {x, y, width, height}
                )) {
                    // Hit!
                    bullet.active = false;

                    // Damage monster
                    const killed = this.monsterManager.damageMonster(monster.id, Constants.BULLET_DAMAGE, bullet.playerCode);

                    if (!killed) {
                        // Optional: emit hit effect
                    }

                    break; // Bullet hits only one monster
                }
            }
        }

        // 3. Cleanup inactive bullets
        this.bullets = this.bullets.filter(b => b.active);

        // 4. Update GameState for client rendering
        // We only send basic data to save bandwidth
        gameState.bullets = this.bullets.map(b => ({
            id: b.id,
            x: Math.round(b.x),
            y: Math.round(b.y),
            playerCode: b.playerCode
        }));
    }
}

module.exports = BulletManager;
