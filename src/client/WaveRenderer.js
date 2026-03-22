/**
 * WaveRenderer — Canvas renderer for Wave Assault mode.
 *
 * Renders a vertical shooter arena with:
 * - Scrolling star parallax background
 * - Player sprite at bottom (horizontal movement)
 * - Demon formation grid with sprites
 * - Upward projectiles + particle explosions
 * - HUD: wave number, health bar, score, kill count
 * - Overlays: wave intermission, quiz pause, victory/defeat
 */
class WaveRenderer {
    constructor(canvas, ctx, demonImages) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.demonImages = demonImages || {};

        // Stars for parallax background
        this.stars = [];
        for (var i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * 800,
                y: Math.random() * 1000,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 1.5 + 0.3,
                brightness: Math.random() * 0.6 + 0.4
            });
        }

        // Explosion particles
        this.particles = [];
        this._particleIdCounter = 0;

        // Screen shake
        this.screenShake = { x: 0, y: 0, duration: 0, intensity: 0 };

        // Flash messages
        this.flashMessages = [];

        // Scale factor for fitting arena to canvas
        this._scaleX = 1;
        this._scaleY = 1;
    }

    /**
     * Main render call — draws the entire wave game frame.
     * @param {Object} state — from WaveGameEngine._emitState()
     */
    render(state) {
        var ctx = this.ctx;
        var canvas = this.canvas;

        // Calculate scale to fit arena into canvas
        this._scaleX = canvas.width / state.arenaWidth;
        this._scaleY = canvas.height / state.arenaHeight;
        var scale = Math.min(this._scaleX, this._scaleY);
        var offsetX = (canvas.width - state.arenaWidth * scale) / 2;
        var offsetY = (canvas.height - state.arenaHeight * scale) / 2;

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Apply screen shake
        if (this.screenShake.duration > 0) {
            this.screenShake.duration--;
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            ctx.translate(this.screenShake.x, this.screenShake.y);
        }

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Draw background
        this._drawStarfield(state.arenaWidth, state.arenaHeight);

        // Draw projectiles
        this._drawProjectiles(state.projectiles);

        // Draw monsters
        this._drawMonsters(state.monsters);

        // Draw player
        this._drawPlayer(state.player);

        // Draw particles
        this._drawParticles();

        ctx.restore();

        // Draw HUD (unscaled, on top)
        this._drawHUD(state);

        // Draw overlays
        this._drawOverlays(state);

        // Draw flash messages
        this._drawFlashMessages();
    }

    // ==================== BACKGROUND ====================

    _drawStarfield(arenaW, arenaH) {
        var ctx = this.ctx;

        for (var i = 0; i < this.stars.length; i++) {
            var star = this.stars[i];
            star.y += star.speed;
            if (star.y > arenaH) {
                star.y = 0;
                star.x = Math.random() * arenaW;
            }

            var alpha = star.brightness;
            ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ==================== PLAYER ====================

    _drawPlayer(player) {
        if (!player || player.state === 'dead') return;
        var ctx = this.ctx;
        var x = player.x;
        var y = player.y;
        var w = player.width;
        var h = player.height;

        // Player ship body — a bright triangular shape
        ctx.save();
        ctx.translate(x, y);

        // Glow
        ctx.shadowColor = '#4af';
        ctx.shadowBlur = 15;

        // Main body
        ctx.fillStyle = '#3399ff';
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);         // Top point
        ctx.lineTo(-w / 2, h / 2);     // Bottom-left
        ctx.lineTo(w / 2, h / 2);      // Bottom-right
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#66ccff';
        ctx.beginPath();
        ctx.moveTo(0, -h / 4);
        ctx.lineTo(-w / 4, h / 4);
        ctx.lineTo(w / 4, h / 4);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.shadowBlur = 0;
        var engineFlicker = 0.7 + Math.random() * 0.3;
        ctx.fillStyle = 'rgba(255, 150, 50, ' + engineFlicker + ')';
        ctx.beginPath();
        ctx.moveTo(-w / 4, h / 2);
        ctx.lineTo(0, h / 2 + 12);
        ctx.lineTo(w / 4, h / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ==================== MONSTERS ====================

    _drawMonsters(monsters) {
        if (!monsters) return;
        var ctx = this.ctx;

        for (var i = 0; i < monsters.length; i++) {
            var monster = monsters[i];
            var x = monster.x;
            var y = monster.y;
            var w = monster.width;
            var h = monster.height;

            // Try to use demon sprite
            var demonImage = this.demonImages[monster.demonType];
            if (demonImage && demonImage.complete) {
                // Flash red when hit
                if (monster.isAttacked) {
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(x - w / 2, y - h / 2, w, h);
                    ctx.globalAlpha = 1.0;
                    ctx.restore();
                }
                ctx.drawImage(demonImage, x - w / 2, y - h / 2, w, h);
            } else {
                // Fallback: colored rectangle
                ctx.fillStyle = monster.isBoss ? '#ff2222' : '#ff6633';
                if (monster.isAttacked) {
                    ctx.fillStyle = '#ffffff';
                }
                ctx.fillRect(x - w / 2, y - h / 2, w, h);

                // Demon type label
                ctx.fillStyle = '#ffffff';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(monster.demonType, x, y + 3);
                ctx.textAlign = 'left';
            }

            // Health bar (when shown or damaged)
            if (monster.showHealth || monster.health < monster.maxHealth) {
                var barW = w;
                var barH = 4;
                var barX = x - barW / 2;
                var barY = y - h / 2 - 7;
                var hpRatio = monster.health / monster.maxHealth;

                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);

                var barColor = hpRatio > 0.5 ? '#00ff00' : (hpRatio > 0.25 ? '#ffaa00' : '#ff0000');
                ctx.fillStyle = barColor;
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }

            // Boss label
            if (monster.isBoss) {
                ctx.fillStyle = '#ffdd00';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(monster.bossLabel || monster.demonType, x, y - h / 2 - 12);
                ctx.textAlign = 'left';
            }

            // Dive indicator (red trail when diving)
            if (monster.state === 'dive') {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.moveTo(x - w / 4, y - h / 2);
                ctx.lineTo(x, y - h / 2 - 20);
                ctx.lineTo(x + w / 4, y - h / 2);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.restore();
            }
        }
    }

    // ==================== PROJECTILES ====================

    _drawProjectiles(projectiles) {
        if (!projectiles) return;
        var ctx = this.ctx;

        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            // Bright bolt
            ctx.save();
            ctx.shadowColor = '#ffdd00';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(p.x - 3, p.y - 7, 6, 14);
            ctx.restore();
        }
    }

    // ==================== PARTICLES ====================

    addExplosion(x, y, color) {
        for (var i = 0; i < 12; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 3 + 1;
            this.particles.push({
                id: ++this._particleIdCounter,
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.floor(Math.random() * 20),
                maxLife: 50,
                size: Math.random() * 4 + 2,
                color: color || '#ff8800'
            });
        }
    }

    _drawParticles() {
        var ctx = this.ctx;

        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vx *= 0.96;
            p.vy *= 0.96;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            var alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ==================== HUD ====================

    _drawHUD(state) {
        var ctx = this.ctx;
        var canvas = this.canvas;
        var player = state.player;

        // Top bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, 40);

        // Wave indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('WAVE ' + state.wave + '/' + state.totalWaves, 12, 26);

        // Score
        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SCORE: ' + (player.score || 0), canvas.width / 2, 26);

        // Kills
        ctx.fillStyle = '#ff8844';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Kills: ' + (state.stats.monstersKilled || 0), canvas.width - 12, 26);
        ctx.textAlign = 'left';

        // Health bar at bottom
        var barW = Math.min(300, canvas.width * 0.5);
        var barH = 14;
        var barX = (canvas.width - barW) / 2;
        var barY = canvas.height - 30;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        var hpRatio = Math.max(0, player.health / player.maxHealth);
        var hpColor = hpRatio > 0.5 ? '#44ff44' : (hpRatio > 0.25 ? '#ffaa00' : '#ff4444');
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HP: ' + Math.max(0, player.health) + '/' + player.maxHealth, canvas.width / 2, barY + 11);
        ctx.textAlign = 'left';
    }

    // ==================== OVERLAYS ====================

    _drawOverlays(state) {
        if (state.waveState === 'intermission') {
            this._drawIntermission(state);
        } else if (state.waveState === 'victory') {
            this._drawVictoryScreen(state);
        } else if (state.waveState === 'defeat') {
            this._drawDefeatScreen(state);
        }
    }

    _drawIntermission(state) {
        var ctx = this.ctx;
        var canvas = this.canvas;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#44ff44';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE ' + state.wave + ' CLEARED!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText('Next wave incoming...', canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = 'left';
    }

    _drawVictoryScreen(state) {
        var ctx = this.ctx;
        var canvas = this.canvas;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var cx = canvas.width / 2;
        var cy = canvas.height / 2;

        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', cx, cy - 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('All waves cleared!', cx, cy - 20);

        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Score: ' + (state.player.score || 0), cx, cy + 20);

        ctx.fillStyle = '#88ff88';
        ctx.font = '16px Arial';
        ctx.fillText('Demons Defeated: ' + (state.stats.monstersKilled || 0), cx, cy + 55);

        // Return button
        ctx.fillStyle = '#2d8844';
        ctx.fillRect(cx - 80, cy + 80, 160, 42);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 80, cy + 80, 160, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Back to Menu', cx, cy + 106);
        ctx.textAlign = 'left';

        // Store button rect for click detection
        this.endButtonRect = { x: cx - 80, y: cy + 80, width: 160, height: 42 };
    }

    _drawDefeatScreen(state) {
        var ctx = this.ctx;
        var canvas = this.canvas;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var cx = canvas.width / 2;
        var cy = canvas.height / 2;

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DEFEATED', cx, cy - 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Wave ' + state.wave + '/' + state.totalWaves, cx, cy - 20);

        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Score: ' + (state.player.score || 0), cx, cy + 20);

        ctx.fillStyle = '#ff8888';
        ctx.font = '16px Arial';
        ctx.fillText('Demons Defeated: ' + (state.stats.monstersKilled || 0), cx, cy + 55);

        // Try again button
        ctx.fillStyle = '#884422';
        ctx.fillRect(cx - 80, cy + 80, 160, 42);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 80, cy + 80, 160, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Try Again', cx, cy + 106);
        ctx.textAlign = 'left';

        this.endButtonRect = { x: cx - 80, y: cy + 80, width: 160, height: 42 };
    }

    // ==================== QUIZ PAUSE OVERLAY ====================

    drawQuizPause(quizData) {
        var ctx = this.ctx;
        var canvas = this.canvas;

        // Dimmed background
        ctx.fillStyle = 'rgba(0, 0, 20, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var cx = canvas.width / 2;

        ctx.fillStyle = '#6699ff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ VERSE CHALLENGE ⚔️', cx, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('Answer correctly for bonus health & score!', cx, 155);
        ctx.textAlign = 'left';
    }

    // ==================== FLASH MESSAGES ====================

    addFlashMessage(text, color, duration) {
        this.flashMessages.push({
            text: text,
            color: color || '#ffffff',
            startTime: Date.now(),
            duration: duration || 2000
        });
    }

    _drawFlashMessages() {
        var ctx = this.ctx;
        var now = Date.now();
        var canvas = this.canvas;

        for (var i = this.flashMessages.length - 1; i >= 0; i--) {
            var msg = this.flashMessages[i];
            var elapsed = now - msg.startTime;

            if (elapsed >= msg.duration) {
                this.flashMessages.splice(i, 1);
                continue;
            }

            var alpha = 1 - (elapsed / msg.duration);
            var yOffset = elapsed * 0.03;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = msg.color;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(msg.text, canvas.width / 2, canvas.height / 2 - 50 - yOffset);
            ctx.textAlign = 'left';
            ctx.restore();
        }
    }

    // ==================== SCREEN SHAKE ====================

    triggerShake(intensity, duration) {
        this.screenShake.intensity = intensity || 5;
        this.screenShake.duration = duration || 10;
    }

    // ==================== UTILITY ====================

    /**
     * Convert canvas coordinates to arena coordinates for click detection.
     */
    canvasToArena(canvasX, canvasY, arenaWidth, arenaHeight) {
        var scale = Math.min(this.canvas.width / arenaWidth, this.canvas.height / arenaHeight);
        var offsetX = (this.canvas.width - arenaWidth * scale) / 2;
        var offsetY = (this.canvas.height - arenaHeight * scale) / 2;

        return {
            x: (canvasX - offsetX) / scale,
            y: (canvasY - offsetY) / scale
        };
    }
}

// Expose globally
window.WaveRenderer = WaveRenderer;
