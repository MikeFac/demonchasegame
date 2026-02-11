const Constants = require('../../shared/Constants');
const Physics = require('../utils/Physics');

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

        // 2. Check collisions (walls then monsters)
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.active) continue;

            // Check collision with walls using spatial grid or fallback
            if (this.wallGrid) {
                if (this.wallGrid.collidesCircle(bullet.x, bullet.y, bullet.radius)) {
                    bullet.active = false;
                }
            } else if (gameState.walls) {
                for (const wall of gameState.walls) {
                    if (Physics.checkCollisionCircleRect(
                        { x: bullet.x, y: bullet.y, radius: bullet.radius },
                        wall
                    )) {
                        bullet.active = false;
                        break;
                    }
                }
            }
            if (!bullet.active) continue;

            // Check collision with monsters (Sword buff: 2x damage + pierce)
            const player = gameState.players ? gameState.players[bullet.playerCode] : null;
            const hasSword = player && player.activeBuffs && player.activeBuffs.sword && player.activeBuffs.sword.active;
            const damage = hasSword ? Constants.BULLET_DAMAGE * Constants.SWORD_DAMAGE_MULTIPLIER : Constants.BULLET_DAMAGE;
            const maxHits = hasSword ? Constants.SWORD_PIERCE_COUNT : 1;

            if (!bullet.hitCount) bullet.hitCount = 0;

            for (const monster of gameState.monsters) {
                if (Physics.checkCollisionCircleRect(
                    { x: bullet.x, y: bullet.y, radius: bullet.radius },
                    monster
                )) {
                    // Skip monsters already hit by this bullet (pierce)
                    if (!bullet.hitMonsters) bullet.hitMonsters = [];
                    if (bullet.hitMonsters.includes(monster.id)) continue;

                    bullet.hitMonsters.push(monster.id);
                    bullet.hitCount++;
                    this.monsterManager.damageMonster(monster.id, damage, bullet.playerCode);
                    this.io.emit('bulletHit', { x: bullet.x, y: bullet.y });

                    if (bullet.hitCount >= maxHits) {
                        bullet.active = false;
                        break;
                    }
                }
            }
        }

        // 3. Cleanup inactive bullets
        this.bullets = this.bullets.filter(b => b.active);

        // 4. Update GameState for client rendering
        gameState.bullets = this.bullets.map(b => ({
            id: b.id,
            x: Math.round(b.x),
            y: Math.round(b.y),
            playerCode: b.playerCode
        }));
    }
}

module.exports = BulletManager;
