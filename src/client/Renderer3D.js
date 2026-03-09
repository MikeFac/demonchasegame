class Renderer3D extends Renderer {
    constructor(canvas, ctx, assets) {
        super(canvas, ctx, assets);
        this.viewMode = '3d';
        this.wallCache = null;
        this.wallCacheKey = null;
        this.wallCellSize = 50;
        this.fov = Math.PI / 3;
        this.maxViewDistance = 1100;
        this.rayStepFactor = 0.2;
        this.columnWidth = 4;
        this.bobPhase = 0;
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake = { x: 0, y: 0 }, damageNumbers = [], deathParticles = [], mouseX = null, mouseY = null) {
        this.clear();

        if (uiState.gameOverModalVisible) {
            this.drawGameOverModal(this.canvas, uiState.finalStats, uiState.restartButtonRect);
            return;
        }

        this.drawTopBar(uiState);

        this.ctx.save();
        if (screenShake && screenShake.duration > 0) {
            this.ctx.translate(screenShake.x, screenShake.y);
        }

        const viewAngle = this._getViewAngle(player);
        const bobOffset = this._getCameraBob(player);
        const depthBuffer = this._drawWorld3D(player, walls, viewAngle, bobOffset);
        this._drawMonsterSprites(monsters, player, depthBuffer, viewAngle);
        this._drawBulletSprites(gameState.bullets || [], player, depthBuffer, viewAngle);
        this._drawWeaponFrame(player, bobOffset);
        this.ctx.restore();

        this.drawHUD(player, gameState);
        this.drawInventoryHUD(inventoryState || { inventory: {}, activeBuffs: {}, inventoryOpen: false });
        this.drawVerseTestButton();
        this.drawMessages(uiState);
        this.drawFrozenIndicator(uiState.movementFrozen);
        this._drawControlsOverlay();

        if (uiState.currentVerse) {
            this.displayBibleVerse(uiState.currentVerse.text, uiState.currentVerse.reference, uiState.quiz);
        }

        this.drawFlashMessages(uiState.flashMessages);

        if (uiState.menuState && uiState.menuState.menuOpen) {
            this.drawMenuPanel(uiState.menuState);
        }

        if (uiState.goalsOverlayVisible) {
            this.drawGoalsPanel(uiState);
        }

        this.drawCategoryPicker(uiState);
    }

    _getViewAngle(player) {
        if (player && typeof player.viewAngle === 'number') {
            return player.viewAngle;
        }
        return player && player.facingDirection === 'left' ? Math.PI : 0;
    }

    _drawWorld3D(player, walls, viewAngle, bobOffset) {
        const worldTop = this.QUALITY_LINE_HEIGHT;
        const worldHeight = this.canvas.height - worldTop;
        const horizon = worldTop + Math.floor(worldHeight * 0.4 + bobOffset);
        const sceneWidth = this.canvas.width;
        const projectionPlane = (sceneWidth / 2) / Math.tan(this.fov / 2);

        const skyGradient = this.ctx.createLinearGradient(0, worldTop, 0, horizon);
        skyGradient.addColorStop(0, '#081018');
        skyGradient.addColorStop(1, '#1d3346');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, worldTop, this.canvas.width, horizon - worldTop);

        const floorGradient = this.ctx.createLinearGradient(0, horizon, 0, this.canvas.height);
        floorGradient.addColorStop(0, '#2b2b24');
        floorGradient.addColorStop(1, '#0d0d0a');
        this.ctx.fillStyle = floorGradient;
        this.ctx.fillRect(0, horizon, this.canvas.width, this.canvas.height - horizon);

        this._drawAtmosphere(horizon, worldTop);
        this._rebuildWallCache(walls || []);

        const depthBuffer = new Array(sceneWidth);
        const wallHeight = this.wallCellSize;
        for (let screenX = 0; screenX < sceneWidth; screenX += this.columnWidth) {
            const cameraX = (screenX + this.columnWidth * 0.5) / sceneWidth;
            const rayAngle = viewAngle - this.fov / 2 + cameraX * this.fov;
            const rayHit = this._castRay(player.x, player.y, rayAngle);
            const correctedDistance = Math.max(1, rayHit.distance * Math.cos(rayAngle - viewAngle));
            const sliceHeight = Math.min(worldHeight * 1.3, (wallHeight * projectionPlane) / correctedDistance);
            const sliceTop = horizon - sliceHeight / 2;
            const sliceBottom = sliceTop + sliceHeight;
            const wallVariation = this._wallVariation(rayHit.cellX, rayHit.cellY);

            const brightness = Math.max(0.18, 1 - correctedDistance / this.maxViewDistance);
            const baseR = Math.round((118 + wallVariation * 22) * brightness);
            const baseG = Math.round((142 + wallVariation * 18) * brightness);
            const baseB = Math.round((166 + wallVariation * 14) * brightness);
            this.ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            this.ctx.fillRect(screenX, sliceTop, this.columnWidth + 1, sliceHeight);

            this.ctx.fillStyle = `rgba(255,255,255,${Math.max(0.02, brightness * 0.12)})`;
            this.ctx.fillRect(screenX, sliceTop, this.columnWidth + 1, Math.max(1, sliceHeight * 0.05));
            this._drawWallSlicePattern(screenX, this.columnWidth + 1, sliceTop, sliceBottom, sliceHeight, brightness, rayHit);

            const columnDepth = correctedDistance;
            for (let dx = 0; dx < this.columnWidth && screenX + dx < sceneWidth; dx++) {
                depthBuffer[screenX + dx] = columnDepth;
            }
        }

        this._drawCrosshair();
        this._drawVignette(worldTop, horizon);
        return depthBuffer;
    }

    _getCameraBob(player) {
        if (player && player.isMoving) {
            this.bobPhase += 0.18;
        } else {
            this.bobPhase *= 0.88;
            if (this.bobPhase < 0.02) this.bobPhase = 0;
        }
        return Math.sin(this.bobPhase) * 5;
    }

    _drawAtmosphere(horizon, worldTop) {
        this.ctx.fillStyle = 'rgba(245, 197, 66, 0.08)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width * 0.72, worldTop + 80, 60, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
            const y = horizon + i * 28;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    _drawCrosshair() {
        const cx = this.canvas.width / 2;
        const cy = this.QUALITY_LINE_HEIGHT + (this.canvas.height - this.QUALITY_LINE_HEIGHT) * 0.52;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy);
        this.ctx.lineTo(cx + 8, cy);
        this.ctx.moveTo(cx, cy - 8);
        this.ctx.lineTo(cx, cy + 8);
        this.ctx.stroke();
    }

    _drawWallSlicePattern(screenX, sliceWidth, sliceTop, sliceBottom, sliceHeight, brightness, rayHit) {
        const blockHeight = Math.max(12, sliceHeight / 5);
        this.ctx.strokeStyle = `rgba(18, 24, 30, ${0.22 * brightness + 0.08})`;
        this.ctx.lineWidth = 1;
        for (let y = sliceTop + blockHeight; y < sliceBottom; y += blockHeight) {
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, y);
            this.ctx.lineTo(screenX + sliceWidth, y);
            this.ctx.stroke();
        }

        if (((rayHit.cellX + rayHit.cellY) & 1) === 0) {
            this.ctx.fillStyle = `rgba(255,255,255,${0.03 + brightness * 0.03})`;
            this.ctx.fillRect(screenX, sliceTop, sliceWidth, sliceHeight);
        }

        if (rayHit.hitVertical) {
            this.ctx.fillStyle = `rgba(0,0,0,${0.08 + (1 - brightness) * 0.12})`;
            this.ctx.fillRect(screenX, sliceTop, sliceWidth, sliceHeight);
        }

        if (this._isRuneWall(rayHit.cellX, rayHit.cellY)) {
            const runeHeight = Math.max(18, sliceHeight * 0.14);
            const runeY = sliceTop + sliceHeight * 0.36;
            this.ctx.strokeStyle = `rgba(111, 214, 232, ${0.16 + brightness * 0.22})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + sliceWidth * 0.25, runeY);
            this.ctx.lineTo(screenX + sliceWidth * 0.75, runeY + runeHeight * 0.5);
            this.ctx.lineTo(screenX + sliceWidth * 0.35, runeY + runeHeight);
            this.ctx.stroke();
        }
    }

    _drawVignette(worldTop, horizon) {
        const edgeShade = this.ctx.createRadialGradient(
            this.canvas.width / 2,
            horizon,
            this.canvas.width * 0.18,
            this.canvas.width / 2,
            horizon,
            this.canvas.width * 0.78
        );
        edgeShade.addColorStop(0, 'rgba(0,0,0,0)');
        edgeShade.addColorStop(1, 'rgba(0,0,0,0.32)');
        this.ctx.fillStyle = edgeShade;
        this.ctx.fillRect(0, worldTop, this.canvas.width, this.canvas.height - worldTop);
    }

    _drawControlsOverlay() {
        const size = Math.min(88, Math.max(64, this.canvas.width * 0.14));
        const bottom = this.canvas.height - size - 22;
        const leftX = 18;
        const rightX = leftX + size + 10;
        const forwardX = this.canvas.width - size - 18;
        const forwardY = bottom - 18;
        const stopX = forwardX;
        const stopY = forwardY - size - 12;
        const fireX = this.canvas.width - size - 18;
        const fireY = this.QUALITY_LINE_HEIGHT + 58;

        this._drawControlButton(leftX, bottom, size, size, { type: 'turn-left' });
        this._drawControlButton(rightX, bottom, size, size, { type: 'turn-right' });
        this._drawControlButton(stopX, stopY, size, size, { type: 'stop' });
        this._drawControlButton(forwardX, forwardY, size, size + 14, { type: 'forward' });
        this._drawControlButton(fireX, fireY, size, size, { type: 'fire' });
    }

    _drawControlButton(x, y, width, height, spec) {
        const radius = 18;
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        const warm = spec.type === 'fire';
        gradient.addColorStop(0, warm ? 'rgba(131, 51, 27, 0.78)' : 'rgba(19, 28, 40, 0.76)');
        gradient.addColorStop(1, warm ? 'rgba(72, 18, 10, 0.86)' : 'rgba(7, 10, 16, 0.84)');

        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        this.ctx.strokeStyle = warm ? 'rgba(255, 188, 121, 0.58)' : 'rgba(255, 255, 255, 0.22)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255,255,255,0.06)';
        this.ctx.fillRect(x + 8, y + 8, width - 16, Math.max(10, height * 0.18));

        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.fillStyle = '#f7f1df';

        if (spec.type === 'turn-left') {
            this._drawArrowGlyph(-1, Math.min(width, height) * 0.28);
        } else if (spec.type === 'turn-right') {
            this._drawArrowGlyph(1, Math.min(width, height) * 0.28);
        } else if (spec.type === 'forward') {
            this._drawForwardGlyph(Math.min(width, height) * 0.26);
        } else if (spec.type === 'stop') {
            const s = Math.min(width, height) * 0.22;
            this.ctx.fillRect(-s, -s, s * 2, s * 2);
        } else if (spec.type === 'fire') {
            this._drawFireGlyph(Math.min(width, height) * 0.24);
        }
        this.ctx.restore();

        this.ctx.fillStyle = warm ? '#ffd9bf' : 'rgba(247, 241, 223, 0.92)';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        const labelY = y + height - 10;
        const label = spec.type === 'fire' ? 'FIRE' : (spec.type === 'stop' ? 'STOP' : '');
        if (label) {
            this.ctx.fillText(label, x + width / 2, labelY);
        }
        this.ctx.textAlign = 'left';
    }

    _drawArrowGlyph(direction, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(direction * size, 0);
        this.ctx.lineTo(-direction * size * 0.35, -size * 0.8);
        this.ctx.lineTo(-direction * size * 0.35, -size * 0.28);
        this.ctx.lineTo(-direction * size, -size * 0.28);
        this.ctx.lineTo(-direction * size, size * 0.28);
        this.ctx.lineTo(-direction * size * 0.35, size * 0.28);
        this.ctx.lineTo(-direction * size * 0.35, size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
    }

    _drawForwardGlyph(size) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(size * 0.82, size * 0.22);
        this.ctx.lineTo(size * 0.3, size * 0.22);
        this.ctx.lineTo(size * 0.3, size);
        this.ctx.lineTo(-size * 0.3, size);
        this.ctx.lineTo(-size * 0.3, size * 0.22);
        this.ctx.lineTo(-size * 0.82, size * 0.22);
        this.ctx.closePath();
        this.ctx.fill();
    }

    _drawFireGlyph(size) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.quadraticCurveTo(size * 0.72, -size * 0.1, size * 0.26, size);
        this.ctx.quadraticCurveTo(0, size * 0.56, -size * 0.26, size);
        this.ctx.quadraticCurveTo(-size * 0.72, -size * 0.1, 0, -size);
        this.ctx.fill();
        this.ctx.fillStyle = '#8a2c12';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * 0.32);
        this.ctx.quadraticCurveTo(size * 0.3, 0, size * 0.12, size * 0.58);
        this.ctx.quadraticCurveTo(0, size * 0.32, -size * 0.12, size * 0.58);
        this.ctx.quadraticCurveTo(-size * 0.3, 0, 0, -size * 0.32);
        this.ctx.fill();
    }

    _drawWeaponFrame(player, bobOffset) {
        const weaponY = this.canvas.height - 68 + bobOffset * 0.6;
        const centerX = this.canvas.width / 2;
        const spread = 48;

        this.ctx.fillStyle = 'rgba(22, 18, 12, 0.82)';
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - spread, weaponY);
        this.ctx.lineTo(centerX + spread, weaponY);
        this.ctx.lineTo(centerX + spread * 0.42, this.canvas.height);
        this.ctx.lineTo(centerX - spread * 0.42, this.canvas.height);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(214, 172, 97, 0.24)';
        this.ctx.fillRect(centerX - 9, weaponY + 4, 18, 22);
    }

    _drawMonsterSprites(monsters, player, depthBuffer, viewAngle) {
        const sorted = (monsters || []).slice().sort((a, b) => {
            const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
            const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
            return db - da;
        });

        sorted.forEach((monster) => {
            this._drawBillboard(monster, player, depthBuffer, viewAngle, {
                image: this.assets.demonImages && this.assets.demonImages[monster.demonType],
                tint: monster.isAttacked ? 'rgba(255,70,70,0.35)' : null,
                heightScale: 1.1,
                lift: 0.1
            });
        });
    }

    _drawBulletSprites(bullets, player, depthBuffer, viewAngle) {
        (bullets || []).forEach((bullet) => {
            this._drawBillboard(bullet, player, depthBuffer, viewAngle, {
                image: null,
                tint: 'rgba(255, 220, 120, 0.9)',
                widthScale: 0.18,
                heightScale: 0.18,
                lift: 0.02,
                circular: true
            });
        });
    }

    _drawBillboard(entity, player, depthBuffer, viewAngle, options) {
        const dx = entity.x - player.x;
        const dy = entity.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10 || distance > this.maxViewDistance) return;

        const entityAngle = Math.atan2(dy, dx);
        const relativeAngle = this._normalizeAngle(entityAngle - viewAngle);
        if (Math.abs(relativeAngle) > this.fov * 0.65) return;

        const sceneWidth = this.canvas.width;
        const sceneHeight = this.canvas.height - this.QUALITY_LINE_HEIGHT;
        const horizon = this.QUALITY_LINE_HEIGHT + sceneHeight * 0.4;
        const projectionPlane = (sceneWidth / 2) / Math.tan(this.fov / 2);
        const heightScale = options.heightScale || 1.0;
        const widthScale = options.widthScale || 0.7;
        const spriteHeight = Math.max(8, (entity.height || 28) * projectionPlane / distance * heightScale);
        const spriteWidth = Math.max(8, spriteHeight * widthScale);
        const screenX = sceneWidth / 2 + Math.tan(relativeAngle) * projectionPlane;
        const spriteLeft = Math.round(screenX - spriteWidth / 2);
        const spriteRight = Math.round(screenX + spriteWidth / 2);
        const lift = options.lift || 0;
        const spriteTop = horizon - spriteHeight * (0.5 + lift);

        const centerColumn = Math.max(0, Math.min(sceneWidth - 1, Math.round(screenX)));
        if (depthBuffer[centerColumn] !== undefined && distance > depthBuffer[centerColumn]) {
            return;
        }

        const visibleColumns = [];
        for (let x = Math.max(0, spriteLeft); x < Math.min(sceneWidth, spriteRight); x++) {
            const wallDistance = depthBuffer[x];
            if (wallDistance === undefined || distance <= wallDistance) {
                visibleColumns.push(x);
            }
        }
        if (visibleColumns.length === 0) return;

        if (options.image && options.image.complete) {
            const clipLeft = visibleColumns[0];
            const clipRight = visibleColumns[visibleColumns.length - 1] + 1;
            const srcX = ((clipLeft - spriteLeft) / spriteWidth) * options.image.width;
            const srcWidth = ((clipRight - clipLeft) / spriteWidth) * options.image.width;
            this.ctx.drawImage(
                options.image,
                srcX,
                0,
                Math.max(1, srcWidth),
                options.image.height,
                clipLeft,
                spriteTop,
                clipRight - clipLeft,
                spriteHeight
            );
        } else {
            this.ctx.fillStyle = options.tint || 'rgba(220, 70, 70, 0.85)';
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, spriteTop + spriteHeight / 2, spriteWidth / 2, spriteHeight / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (options.tint && options.image && options.image.complete) {
            this.ctx.fillStyle = options.tint;
            this.ctx.fillRect(visibleColumns[0], spriteTop, visibleColumns[visibleColumns.length - 1] - visibleColumns[0] + 1, spriteHeight);
        }

        if (!options.circular && entity.health && entity.maxHealth) {
            const healthPct = Math.max(0, entity.health / entity.maxHealth);
            const barWidth = spriteWidth * 0.8;
            const barX = screenX - barWidth / 2;
            const barY = spriteTop - 10;
            this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
            this.ctx.fillRect(barX, barY, barWidth, 5);
            this.ctx.fillStyle = healthPct > 0.5 ? '#70d070' : (healthPct > 0.25 ? '#e7c252' : '#d94b4b');
            this.ctx.fillRect(barX, barY, barWidth * healthPct, 5);
        }
    }

    _rebuildWallCache(walls) {
        const first = walls[0];
        const last = walls[walls.length - 1];
        const key = [
            walls.length,
            first ? `${first.x}:${first.y}:${first.width}:${first.height}` : 'none',
            last ? `${last.x}:${last.y}:${last.width}:${last.height}` : 'none'
        ].join('|');
        if (this.wallCache && this.wallCacheKey === key) return;

        this.wallCellSize = walls[0] && walls[0].width ? walls[0].width : 50;
        this.wallCache = new Set();
        walls.forEach((wall) => {
            const col = Math.floor(wall.x / this.wallCellSize);
            const row = Math.floor(wall.y / this.wallCellSize);
            this.wallCache.add(`${col},${row}`);
        });
        this.wallCacheKey = key;
    }

    _castRay(startX, startY, angle) {
        const step = Math.max(8, this.wallCellSize * this.rayStepFactor);
        let x = startX;
        let y = startY;
        let distance = 0;

        while (distance < this.maxViewDistance) {
            x += Math.cos(angle) * step;
            y += Math.sin(angle) * step;
            distance += step;

            const col = Math.floor(x / this.wallCellSize);
            const row = Math.floor(y / this.wallCellSize);
            if (this.wallCache.has(`${col},${row}`)) {
                const prevX = x - Math.cos(angle) * step;
                const prevY = y - Math.sin(angle) * step;
                const prevCol = Math.floor(prevX / this.wallCellSize);
                const prevRow = Math.floor(prevY / this.wallCellSize);
                const hitVertical = prevCol !== col;
                return { distance, cellX: col, cellY: row, hitVertical };
            }
        }

        return { distance: this.maxViewDistance, cellX: -1, cellY: -1, hitVertical: false };
    }

    _normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    _wallVariation(cellX, cellY) {
        const seed = (cellX * 73856093) ^ (cellY * 19349663);
        return ((seed % 9) - 4) / 10;
    }

    _isRuneWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 31 + cellY * 17) % 23) === 0;
    }
}

window.Renderer3D = Renderer3D;
