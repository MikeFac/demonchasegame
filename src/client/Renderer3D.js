function get3DControlLayout(canvas, qualityLineHeight, viewMode = 'third-person') {
    const firstPerson = viewMode === 'first-person';
    // Chase controls are taps, so they can be more compact. First-person
    // controls are held while moving/turning and retain a larger touch target.
    const size = firstPerson
        ? Math.min(76, Math.max(58, canvas.width * 0.12))
        : Math.min(66, Math.max(48, canvas.width * 0.105));
    const forwardExtra = firstPerson ? 14 : 10;
    const bottom = canvas.height - size - 22;
    const leftX = 18;
    const rightX = leftX + size + 10;
    const forwardX = canvas.width - size - 18;
    const forwardY = bottom - 18;
    const stopX = forwardX;
    const stopY = forwardY - size - 12;
    const fireX = canvas.width - size - 18;
    const fireY = qualityLineHeight + 58;

    return {
        size,
        left: { x: leftX, y: bottom, width: size, height: size },
        right: { x: rightX, y: bottom, width: size, height: size },
        forward: { x: forwardX, y: forwardY, width: size, height: size + forwardExtra },
        stop: { x: stopX, y: stopY, width: size, height: size },
        fire: { x: fireX, y: fireY, width: size, height: size }
    };
}

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
        this._drawHealingPointSprites(healingPoints, player, depthBuffer, viewAngle);
        this._drawMonsterSprites(monsters, player, depthBuffer, viewAngle);
        this._drawBulletSprites(gameState.bullets || [], player, depthBuffer, viewAngle);
        this._drawDeathParticles3D(deathParticles, player, depthBuffer, viewAngle);
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
        skyGradient.addColorStop(0, '#7ec8ff');
        skyGradient.addColorStop(0.55, '#bfe6ff');
        skyGradient.addColorStop(1, '#eef8ff');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, worldTop, this.canvas.width, horizon - worldTop);

        const floorGradient = this.ctx.createLinearGradient(0, horizon, 0, this.canvas.height);
        floorGradient.addColorStop(0, '#bcae8a');
        floorGradient.addColorStop(0.55, '#927f5d');
        floorGradient.addColorStop(1, '#62523c');
        this.ctx.fillStyle = floorGradient;
        this.ctx.fillRect(0, horizon, this.canvas.width, this.canvas.height - horizon);

        this._drawAtmosphere(horizon, worldTop, viewAngle);
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

            const brightness = Math.max(0.42, 1.08 - correctedDistance / (this.maxViewDistance * 1.12));
            const baseR = Math.round((176 + wallVariation * 18) * brightness);
            const baseG = Math.round((190 + wallVariation * 14) * brightness);
            const baseB = Math.round((205 + wallVariation * 12) * brightness);
            this.ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            this.ctx.fillRect(screenX, sliceTop, this.columnWidth + 1, sliceHeight);

            this.ctx.fillStyle = `rgba(255,255,255,${Math.max(0.08, brightness * 0.18)})`;
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

    _drawAtmosphere(horizon, worldTop, viewAngle) {
        this.ctx.fillStyle = 'rgba(255, 238, 170, 0.34)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width * 0.72, worldTop + 74, 96, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(255,255,255,0.11)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
            const y = horizon + i * 28;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        this._drawFloorDepthGuides(horizon);
        this._drawCeilingRibs(worldTop, horizon, viewAngle);
    }

    _drawFloorDepthGuides(horizon) {
        const vanishingX = this.canvas.width / 2;
        const floorTop = horizon + 12;
        const floorBottom = this.canvas.height;

        this.ctx.strokeStyle = 'rgba(255, 241, 205, 0.16)';
        this.ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
            const x = vanishingX + i * (this.canvas.width * 0.07);
            this.ctx.beginPath();
            this.ctx.moveTo(vanishingX + i * 4, floorTop);
            this.ctx.lineTo(x * 1.55, floorBottom);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        for (let i = 1; i <= 6; i++) {
            const t = i / 6;
            const y = floorTop + (floorBottom - floorTop) * t * t;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    _drawCeilingRibs(worldTop, horizon, viewAngle) {
        const vanishingX = this.canvas.width / 2 + Math.sin(viewAngle) * 28;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const xOffset = (i - 2) * (this.canvas.width * 0.18);
            this.ctx.beginPath();
            this.ctx.moveTo(vanishingX + xOffset * 0.3, worldTop + 18);
            this.ctx.lineTo(vanishingX + xOffset, horizon - 12);
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
        this.ctx.strokeStyle = `rgba(72, 82, 92, ${0.12 * brightness + 0.05})`;
        this.ctx.lineWidth = 1;
        for (let y = sliceTop + blockHeight; y < sliceBottom; y += blockHeight) {
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, y);
            this.ctx.lineTo(screenX + sliceWidth, y);
            this.ctx.stroke();
        }

        if (((rayHit.cellX + rayHit.cellY) & 1) === 0) {
            this.ctx.fillStyle = `rgba(255,255,255,${0.07 + brightness * 0.05})`;
            this.ctx.fillRect(screenX, sliceTop, sliceWidth, sliceHeight);
        }

        if (rayHit.hitVertical) {
            this.ctx.fillStyle = `rgba(50,58,68,${0.04 + (1 - brightness) * 0.08})`;
            this.ctx.fillRect(screenX, sliceTop, sliceWidth, sliceHeight);
        }

        this._drawInsetPanel(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit);
        this._drawArchSilhouette(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit);
        this._drawWallBaseShadow(screenX, sliceWidth, sliceBottom, sliceHeight, brightness);

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

        this._drawWallDecal(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit);

        if (this._isTorchWall(rayHit.cellX, rayHit.cellY) && sliceHeight > 50) {
            const torchY = sliceTop + sliceHeight * 0.42;
            const glow = Math.max(10, sliceHeight * 0.08);
            const flicker = this._getTorchFlicker(rayHit.cellX, rayHit.cellY);
            this.ctx.fillStyle = `rgba(255, 177, 92, ${0.05 + brightness * (0.09 + flicker * 0.08)})`;
            this.ctx.fillRect(screenX - sliceWidth, torchY - glow, sliceWidth * 3, glow * 2);
            this.ctx.fillStyle = `rgba(255, 220, 155, ${0.1 + brightness * (0.12 + flicker * 0.1)})`;
            this.ctx.fillRect(screenX, torchY, sliceWidth, Math.max(6, sliceHeight * 0.06));
        }
    }

    _drawInsetPanel(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit) {
        if (!this._isInsetWall(rayHit.cellX, rayHit.cellY) || sliceHeight < 42) return;

        const insetX = screenX + sliceWidth * 0.14;
        const insetY = sliceTop + sliceHeight * 0.18;
        const insetW = Math.max(1, sliceWidth * 0.72);
        const insetH = sliceHeight * 0.54;

        this.ctx.fillStyle = `rgba(109, 123, 138, ${0.08 + (1 - brightness) * 0.08})`;
        this.ctx.fillRect(insetX, insetY, insetW, insetH);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + brightness * 0.1})`;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(insetX, insetY, insetW, insetH);
    }

    _drawWallBaseShadow(screenX, sliceWidth, sliceBottom, sliceHeight, brightness) {
        const shadowHeight = Math.max(4, sliceHeight * 0.08);
        this.ctx.fillStyle = `rgba(54, 48, 36, ${0.06 + (1 - brightness) * 0.08})`;
        this.ctx.fillRect(screenX, sliceBottom - shadowHeight, sliceWidth, shadowHeight);
    }

    _drawArchSilhouette(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit) {
        if (sliceHeight < 68 || !this._isArchWall(rayHit.cellX, rayHit.cellY)) return;

        const archWidth = sliceWidth * 0.78;
        const archX = screenX + (sliceWidth - archWidth) / 2;
        const archTop = sliceTop + sliceHeight * 0.14;
        const archBottom = sliceTop + sliceHeight * 0.88;
        const archRadius = archWidth * 0.5;
        const sideWidth = Math.max(1, sliceWidth * 0.16);
        const darkness = 0.07 + (1 - brightness) * 0.1;

        this.ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        this.ctx.fillRect(archX, archTop + archRadius * 0.5, archWidth, archBottom - (archTop + archRadius * 0.5));

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(archX, archTop, archWidth, archBottom - archTop);
        this.ctx.clip();
        this.ctx.beginPath();
        this.ctx.arc(archX + archWidth / 2, archTop + archRadius, archRadius, Math.PI, 0, false);
        this.ctx.lineTo(archX + archWidth, archTop + archRadius);
        this.ctx.lineTo(archX, archTop + archRadius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + brightness * 0.05})`;
        this.ctx.fillRect(archX, archTop, sideWidth, archBottom - archTop);
        this.ctx.fillRect(archX + archWidth - sideWidth, archTop, sideWidth, archBottom - archTop);
        this.ctx.fillRect(archX + sideWidth, archTop, archWidth - sideWidth * 2, Math.max(1, sliceHeight * 0.035));
    }

    _drawWallDecal(screenX, sliceWidth, sliceTop, sliceHeight, brightness, rayHit) {
        if (sliceHeight < 54) return;

        if (this._isBannerWall(rayHit.cellX, rayHit.cellY)) {
            const bannerY = sliceTop + sliceHeight * 0.22;
            const bannerH = sliceHeight * 0.34;
            this.ctx.fillStyle = `rgba(93, 24, 24, ${0.18 + brightness * 0.2})`;
            this.ctx.fillRect(screenX + sliceWidth * 0.18, bannerY, sliceWidth * 0.64, bannerH);
            this.ctx.strokeStyle = `rgba(236, 203, 145, ${0.12 + brightness * 0.12})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + sliceWidth * 0.5, bannerY + bannerH * 0.15);
            this.ctx.lineTo(screenX + sliceWidth * 0.64, bannerY + bannerH * 0.46);
            this.ctx.lineTo(screenX + sliceWidth * 0.5, bannerY + bannerH * 0.78);
            this.ctx.lineTo(screenX + sliceWidth * 0.36, bannerY + bannerH * 0.46);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (this._isChainWall(rayHit.cellX, rayHit.cellY)) {
            const chainX = screenX + sliceWidth * 0.5;
            const chainTop = sliceTop + sliceHeight * 0.16;
            const chainBottom = sliceTop + sliceHeight * 0.74;
            this.ctx.strokeStyle = `rgba(172, 176, 184, ${0.12 + brightness * 0.14})`;
            this.ctx.lineWidth = 1.5;
            for (let y = chainTop; y < chainBottom; y += Math.max(6, sliceHeight * 0.07)) {
                this.ctx.beginPath();
                this.ctx.arc(chainX, y, Math.max(2, sliceWidth * 0.18), 0, Math.PI * 2);
                this.ctx.stroke();
            }
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
        edgeShade.addColorStop(1, 'rgba(88,110,132,0.14)');
        this.ctx.fillStyle = edgeShade;
        this.ctx.fillRect(0, worldTop, this.canvas.width, this.canvas.height - worldTop);
    }

    _drawControlsOverlay() {
        const controls = get3DControlLayout(this.canvas, this.QUALITY_LINE_HEIGHT, this.viewMode);
        const firstPerson = this.viewMode === 'first-person';
        this._drawControlButton(controls.left.x, controls.left.y, controls.left.width, controls.left.height, { type: 'turn-left' });
        this._drawControlButton(controls.right.x, controls.right.y, controls.right.width, controls.right.height, { type: 'turn-right' });
        this._drawControlButton(controls.stop.x, controls.stop.y, controls.stop.width, controls.stop.height, { type: firstPerson ? 'back' : 'stop' });
        this._drawControlButton(controls.forward.x, controls.forward.y, controls.forward.width, controls.forward.height, { type: 'forward', hold: firstPerson });
        this._drawControlButton(controls.fire.x, controls.fire.y, controls.fire.width, controls.fire.height, { type: 'fire' });
    }

    _drawControlButton(x, y, width, height, spec) {
        const radius = Math.min(18, Math.min(width, height) * 0.28);
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        const warm = spec.type === 'fire';
        gradient.addColorStop(0, warm ? 'rgba(193, 102, 55, 0.84)' : 'rgba(204, 224, 242, 0.84)');
        gradient.addColorStop(1, warm ? 'rgba(124, 46, 18, 0.9)' : 'rgba(120, 151, 179, 0.88)');

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

        this.ctx.strokeStyle = warm ? 'rgba(255, 214, 168, 0.72)' : 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255,255,255,0.18)';
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
        } else if (spec.type === 'back') {
            this.ctx.rotate(Math.PI);
            this._drawForwardGlyph(Math.min(width, height) * 0.26);
        } else if (spec.type === 'fire') {
            this._drawFireGlyph(Math.min(width, height) * 0.24);
        }
        this.ctx.restore();

        this.ctx.fillStyle = warm ? '#ffd9bf' : 'rgba(247, 241, 223, 0.92)';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        const labelY = y + height - 10;
        const label = spec.type === 'fire'
            ? 'FIRE'
            : (spec.type === 'stop'
                ? 'STOP'
                : (spec.type === 'back'
                    ? 'BACK'
                    : (spec.type === 'forward' && spec.hold
                        ? 'HOLD'
                        : ((spec.type === 'turn-left' || spec.type === 'turn-right') ? 'HOLD' : ''))));
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

    _drawHealingPointSprites(healingPoints, player, depthBuffer, viewAngle) {
        (healingPoints || []).forEach((healingPoint) => {
            const projected = this._projectBillboard(healingPoint, player, depthBuffer, viewAngle, {
                widthScale: 0.72,
                heightScale: 0.95,
                lift: 0.08
            });
            if (!projected) return;

            this._drawCrossPickup(projected);
            this._drawCrossAura(projected.screenX, projected.spriteTop + projected.spriteHeight * 0.54, projected.spriteWidth * 0.42, 0.22);
        });
    }

    _drawDeathParticles3D(deathParticles, player, depthBuffer, viewAngle) {
        (deathParticles || []).forEach((particle) => {
            if (particle.type === 'heavenly') {
                this._drawHeavenlyKillEffect3D(particle, player, depthBuffer, viewAngle);
                return;
            }

            const projected = this._projectBillboard(particle, player, depthBuffer, viewAngle, {
                widthScale: 0.85,
                heightScale: 0.85,
                lift: 0.04,
                baseHeight: 60 + Math.min(24, (particle.frame || 0) * 2)
            });
            if (!projected) return;

            const frame = Math.max(0, Math.min(23, particle.frame || 0));
            const alpha = Math.max(0.08, 1 - frame / 24);
            const burstRadius = projected.spriteWidth * (0.3 + frame * 0.03);
            const centerY = projected.spriteTop + projected.spriteHeight * 0.5;

            this._drawExplosionBurst(projected.screenX, centerY, burstRadius, alpha);
        });
    }

    _drawHeavenlyKillEffect3D(particle, player, depthBuffer, viewAngle) {
        const projected = this._projectBillboard(particle, player, depthBuffer, viewAngle, {
            widthScale: 0.8,
            heightScale: 1.15,
            lift: 0.16,
            baseHeight: 96
        });
        if (!projected) return;

        const progress = Math.min(1, (particle.frame || 0) / Math.max(1, (particle.maxFrames || 10) - 1));
        const alpha = 1 - progress;
        const centerX = projected.screenX;
        const centerY = projected.spriteTop + projected.spriteHeight * 0.46 - progress * projected.spriteHeight * 0.2;
        const glowRadius = projected.spriteWidth * (0.62 + progress * 0.24);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        const glow = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        glow.addColorStop(0, 'rgba(255, 251, 225, 1)');
        glow.addColorStop(0.4, 'rgba(255, 229, 140, 0.88)');
        glow.addColorStop(0.68, 'rgba(255, 214, 96, 0.56)');
        glow.addColorStop(1, 'rgba(255, 210, 90, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgba(255, 245, 196, ${0.18 * alpha})`;
        this.ctx.fillRect(centerX - glowRadius * 0.18, centerY - glowRadius * 1.85, glowRadius * 0.36, glowRadius * 2.15);

        this.ctx.strokeStyle = `rgba(255, 245, 205, ${0.82 * alpha})`;
        this.ctx.lineWidth = Math.max(3, projected.spriteWidth * 0.04);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - glowRadius * 0.95);
        this.ctx.lineTo(centerX, centerY + glowRadius * 0.4);
        this.ctx.moveTo(centerX - glowRadius * 0.48, centerY - glowRadius * 0.12);
        this.ctx.lineTo(centerX + glowRadius * 0.48, centerY - glowRadius * 0.12);
        this.ctx.stroke();

        for (let i = 0; i < 10; i++) {
            const spread = -0.95 + i * 0.22;
            const sparkleX = centerX + Math.sin(spread) * glowRadius * 0.7;
            const sparkleY = centerY - glowRadius * (0.18 + i * 0.14) - progress * 14;
            const sparkleR = Math.max(2, projected.spriteWidth * (0.028 + (9 - i) * 0.002));
            this.ctx.fillStyle = `rgba(255, 231, 144, ${alpha * (0.96 - i * 0.07)})`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, sparkleR, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = `rgba(255, 250, 225, ${0.95 * alpha})`;
        this.ctx.font = `bold ${Math.round(Math.max(18, projected.spriteWidth * 0.55))}px Georgia`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✦', centerX, centerY + projected.spriteHeight * 0.08);

        this.ctx.restore();
    }

    _drawBillboard(entity, player, depthBuffer, viewAngle, options) {
        const projected = this._projectBillboard(entity, player, depthBuffer, viewAngle, options);
        if (!projected) return;

        if (options.image && options.image.complete) {
            const srcX = ((projected.clipLeft - projected.spriteLeft) / projected.spriteWidth) * options.image.width;
            const srcWidth = ((projected.clipRight - projected.clipLeft) / projected.spriteWidth) * options.image.width;
            this.ctx.drawImage(
                options.image,
                srcX,
                0,
                Math.max(1, srcWidth),
                options.image.height,
                projected.clipLeft,
                projected.spriteTop,
                projected.clipRight - projected.clipLeft,
                projected.spriteHeight
            );
        } else {
            this.ctx.fillStyle = options.tint || 'rgba(220, 70, 70, 0.85)';
            this.ctx.beginPath();
            this.ctx.ellipse(projected.screenX, projected.spriteTop + projected.spriteHeight / 2, projected.spriteWidth / 2, projected.spriteHeight / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (options.tint && options.image && options.image.complete) {
            this.ctx.fillStyle = options.tint;
            this.ctx.fillRect(projected.clipLeft, projected.spriteTop, projected.clipRight - projected.clipLeft, projected.spriteHeight);
        }

        if (!options.circular && entity.health && entity.maxHealth) {
            const healthPct = Math.max(0, entity.health / entity.maxHealth);
            const barWidth = projected.spriteWidth * 0.8;
            const barX = projected.screenX - barWidth / 2;
            const barY = projected.spriteTop - 10;
            this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
            this.ctx.fillRect(barX, barY, barWidth, 5);
            this.ctx.fillStyle = healthPct > 0.5 ? '#70d070' : (healthPct > 0.25 ? '#e7c252' : '#d94b4b');
            this.ctx.fillRect(barX, barY, barWidth * healthPct, 5);
        }
    }

    _projectBillboard(entity, player, depthBuffer, viewAngle, options = {}) {
        const dx = entity.x - player.x;
        const dy = entity.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10 || distance > this.maxViewDistance) return null;

        const entityAngle = Math.atan2(dy, dx);
        const relativeAngle = this._normalizeAngle(entityAngle - viewAngle);
        if (Math.abs(relativeAngle) > this.fov * 0.65) return null;

        const sceneWidth = this.canvas.width;
        const sceneHeight = this.canvas.height - this.QUALITY_LINE_HEIGHT;
        const horizon = this.QUALITY_LINE_HEIGHT + sceneHeight * 0.4;
        const projectionPlane = (sceneWidth / 2) / Math.tan(this.fov / 2);
        const heightScale = options.heightScale || 1.0;
        const widthScale = options.widthScale || 0.7;
        const baseHeight = options.baseHeight || entity.height || 28;
        const spriteHeight = Math.max(8, baseHeight * projectionPlane / distance * heightScale);
        const spriteWidth = Math.max(8, spriteHeight * widthScale);
        const screenX = sceneWidth / 2 + Math.tan(relativeAngle) * projectionPlane;
        const spriteLeft = Math.round(screenX - spriteWidth / 2);
        const spriteRight = Math.round(screenX + spriteWidth / 2);
        const lift = options.lift || 0;
        const spriteTop = horizon - spriteHeight * (0.5 + lift);

        const centerColumn = Math.max(0, Math.min(sceneWidth - 1, Math.round(screenX)));
        if (depthBuffer[centerColumn] !== undefined && distance > depthBuffer[centerColumn]) {
            return null;
        }

        let clipLeft = null;
        let clipRight = null;
        for (let x = Math.max(0, spriteLeft); x < Math.min(sceneWidth, spriteRight); x++) {
            const wallDistance = depthBuffer[x];
            if (wallDistance === undefined || distance <= wallDistance) {
                if (clipLeft === null) clipLeft = x;
                clipRight = x + 1;
            }
        }

        if (clipLeft === null || clipRight === null || clipRight <= clipLeft) return null;

        return {
            distance,
            screenX,
            spriteLeft,
            spriteRight,
            spriteTop,
            spriteWidth,
            spriteHeight,
            clipLeft,
            clipRight
        };
    }

    _drawCrossPickup(projected) {
        const centerX = projected.screenX;
        const centerY = projected.spriteTop + projected.spriteHeight * 0.54;
        const bodyW = Math.max(8, projected.spriteWidth * 0.22);
        const bodyH = projected.spriteHeight * 0.76;
        const armW = projected.spriteWidth * 0.72;
        const armH = Math.max(8, projected.spriteHeight * 0.2);

        this.ctx.fillStyle = 'rgba(255,255,255,0.94)';
        this.ctx.fillRect(centerX - bodyW / 2, centerY - bodyH / 2, bodyW, bodyH);
        this.ctx.fillRect(centerX - armW / 2, centerY - armH / 2, armW, armH);
        this.ctx.strokeStyle = 'rgba(122, 41, 41, 0.18)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - bodyW / 2, centerY - bodyH / 2, bodyW, bodyH);
        this.ctx.strokeRect(centerX - armW / 2, centerY - armH / 2, armW, armH);
    }

    _drawCrossAura(x, y, radius, alpha) {
        const glow = this.ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
        glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
        glow.addColorStop(1, 'rgba(99, 193, 255, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    _drawExplosionBurst(x, y, radius, alpha) {
        const glow = this.ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
        glow.addColorStop(0, `rgba(255, 244, 205, ${alpha})`);
        glow.addColorStop(0.45, `rgba(255, 152, 71, ${alpha * 0.9})`);
        glow.addColorStop(1, 'rgba(120, 18, 0, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(255, 216, 140, ${alpha * 0.9})`;
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const inner = radius * 0.25;
            const outer = radius * 0.95;
            this.ctx.beginPath();
            this.ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
            this.ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
            this.ctx.stroke();
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

    _isTorchWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 19 + cellY * 11) % 17) === 0;
    }

    _isInsetWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 13 + cellY * 29) % 7) === 0;
    }

    _isBannerWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 23 + cellY * 7) % 19) === 0;
    }

    _isChainWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 17 + cellY * 37) % 21) === 0;
    }

    _isArchWall(cellX, cellY) {
        if (cellX < 0 || cellY < 0) return false;
        return ((cellX * 29 + cellY * 13) % 16) === 0;
    }

    _getTorchFlicker(cellX, cellY) {
        const t = performance.now() * 0.005;
        const seed = (cellX * 0.91) + (cellY * 1.37);
        return 0.5 + 0.5 * Math.sin(t + seed) * (0.7 + 0.3 * Math.sin(t * 1.7 + seed * 0.6));
    }
}

window.Renderer3D = Renderer3D;
