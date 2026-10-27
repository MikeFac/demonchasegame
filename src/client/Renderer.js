class Renderer {
    constructor(canvas, ctx, assets) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.assets = assets;
        this.viewMode = '2d';

        // World background state (plans/2d-background-graphics-plan.md Phase 1)
        this._themePatterns = {};
        this._shadowSprite = null;
        this._wallRectsSource = null;
        this._wallRects = [];
        this._wallMaxHeight = 0;
        this._wallCellCount = 0;
        this._visibleWalls = [];
        this._buildings = [];
        this._paths = null;

        // Phase 0 dev switches — opt-in via URL so production is unaffected.
        const search = (typeof window !== 'undefined' && window.location && window.location.search) || '';
        let params = null;
        try {
            params = search ? new URLSearchParams(search) : null;
        } catch (e) {
            params = null;
        }
        this.perfEnabled = !!params && params.get('perf') === '1';
        this.themeOverride = params ? params.get('theme') : null;
        this._perf = { frameStart: 0, fpsWindowStart: 0, frames: 0, fps: 0, ms: {}, counts: {} };

        // UI constants from centralized UILayout
        const UI = window.UILayout;
        this.QUALITY_LINE_HEIGHT = UI.QUALITY_LINE_HEIGHT;
        this.HUD_ROW_HEIGHT = UI.HUD_ROW_HEIGHT;
        this.PLAYABLE_TOP = UI.playableTop;
        this.BUTTON_HEIGHT = UI.BUTTON_HEIGHT;
        this.ANSWER_SECTION_HEIGHT = UI.ANSWER_SECTION_HEIGHT;
        this.BUTTON_WIDTH = UI.BUTTON_WIDTH;
        this.BUTTON_PADDING = UI.BUTTON_PADDING;

        this.ONBOARDING_GUIDE_LAYOUT = {
            bodyLineHeight: 18,
            bodyMaxLines: 3,
            boxPaddingX: 16,
            defaultHeight: 56,
            hudBox: { x: 34, yOffset: UI.HUD_ROW_HEIGHT + 30, width: 240, height: 64 },
            moveBox: { x: 36, yOffset: UI.HUD_ROW_HEIGHT + 10, width: 280, height: 64 },
            answersBox: { x: 24, widthInset: 48, minTopOffset: UI.HUD_ROW_HEIGHT + 18, safeBottomOffset: 198, targetGap: 14 },
            learnBox: { x: 24, yOffset: UI.HUD_ROW_HEIGHT + 10, widthInset: 48, height: 56 },
            titleY: 22,
            bodyStartY: 42
        };

        this.START_HERE_SUMMARY_LAYOUT = {
            maxWidth: 420,
            outerInsetX: 24,
            outerInsetY: 28,
            buttonInsetX: 64
        };
    }

    clear() {
        Viewport.clear(this.ctx, this.canvas);
    }

    drawLoadingScreen() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, Viewport.width, Viewport.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(t('ui.loading'), Viewport.width / 2 - 50, Viewport.height / 2);
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake = { x: 0, y: 0 }, damageNumbers = [], deathParticles = [], mouseX = null, mouseY = null) {
        this.clear();

        if (uiState.startHereSummaryVisible) {
            this.drawStartHereSummaryModal(uiState.startHereSummaryState);
            return;
        }

        // Draw game-over modal if visible (overlays everything)
        if (uiState.gameOverModalVisible) {
            this.drawGameOverModal(this.canvas, uiState.finalStats, uiState.restartButtonRect);
            return;  // Don't draw game elements behind modal
        }

        // Draw UI Top Bar (no screen shake)
        this.drawTopBar(uiState);

        // Apply screen shake to game world ONLY (disabled with reduced motion)
        this.ctx.save();
        if (screenShake && screenShake.duration > 0 && (!window.VisualJuice || VisualJuice.isEnabled())) {
            this.ctx.translate(screenShake.x, screenShake.y);
        }

        // Draw Walls
        // World background: ground first, then merged/culled wall blocks.
        const perf = this.perfEnabled;
        this._perf.frameStart = perf ? performance.now() : 0;
        const themeName = this.themeOverride || gameState.terrainTheme;

        let layerStart = perf ? performance.now() : 0;
        this.drawGround(themeName, camera);
        this.drawPaths(camera, themeName);
        if (perf) this._perf.ms.ground = performance.now() - layerStart;

        layerStart = perf ? performance.now() : 0;
        this.drawWalls(walls, camera, themeName);
        if (perf) this._perf.ms.walls = performance.now() - layerStart;

        // All entity shadows in one pass, before any entity is drawn.
        this.drawShadows(
            gameState.players,
            monsters,
            healingPoints,
            gameState.collectibles,
            uiState.npcInteractions,
            camera
        );

        layerStart = perf ? performance.now() : 0;

        // Draw Players
        this.drawPlayers(gameState.players, player, playerCode, camera, inventoryState, uiState.visuals);

        // Draw talkable mission NPCs in the world (not phase-only portraits).
        this.drawMissionNpcs(uiState.npcInteractions, uiState.nearbyNpcInteractionId, camera);

        // Draw Monsters
        this.drawMonsters(monsters, camera, uiState.explosionTimer, uiState.visuals);

        // Draw Healing Points
        this.drawHealingPoints(healingPoints, camera);

        // Draw Collectibles (all armor of god items)
        this.drawCollectibles(gameState.collectibles, camera);

        // Draw Bullets
        this.drawBullets(gameState.bullets, camera);

        // Draw Damage Numbers (floaty combat feedback)
        this.drawDamageNumbers(damageNumbers, camera);

        // Draw Death Particle Animations
        this.drawDeathParticles(deathParticles, camera);

        // Draw procedural combat effects (sparks, rings, death burst, soul wisps)
        this.drawEffects(uiState.visuals, camera);

        if (perf) this._perf.ms.entities = performance.now() - layerStart;

        // Restore context before drawing UI (undo screen shake)
        this.ctx.restore();

        // Draw HUD (Health, Level, etc.)
        this.drawHUD(player, gameState, uiState);

        // Draw current mission task after the core HUD so story missions have a clear next action.
        this.drawMissionTaskCard(uiState);

        // Draw onboarding guidance for the authored start mission.
        this.drawOnboardingGuide(uiState, player, camera);

        // Draw contextual combat hint above the player.
        this.drawCombatHint(player, camera, uiState.combatHint);

        // Draw monster tooltip on hover
        this.drawMonsterTooltip(monsters, camera, mouseX, mouseY);

        // Draw Inventory HUD (button, panel, active buff timers)
        this.drawInventoryHUD(inventoryState || { inventory: {}, activeBuffs: {}, inventoryOpen: false });

        // Draw Verse Test Button (floating "T" icon)
        this.drawVerseTestButton();

        // Draw Level/Game Messages
        this.drawMessages(uiState);

        // Draw frozen movement indicator (during level transitions)
        this.drawFrozenIndicator(uiState.movementFrozen);

        // Draw Bible Verse / Bottom UI (quiz answers)
        if (uiState.currentVerse) {
            this.displayBibleVerse(uiState.currentVerse.text, uiState.currentVerse.reference, uiState.quiz);
        }

        // Draw flash messages (achievement notifications)
        this.drawFlashMessages(uiState.flashMessages);

        // Low-health red edge vignette (screen-space, below menus/modals)
        this.drawLowHealthVignette(player);

        // Draw menu panel LAST so it appears on top of everything
        if (uiState.menuState && uiState.menuState.menuOpen) {
            this.drawMenuPanel(uiState.menuState);
        }

        // Draw goals overlay on top of everything (including menu)
        if (uiState.goalsOverlayVisible) {
            this.drawGoalsPanel(uiState);
        }

        // Draw category picker on top of everything
        this.drawCategoryPicker(uiState);

        // Draw speed first-launch prompt (topmost overlay)
        if (uiState.speedPromptVisible && !uiState.storyPause && !uiState.goalsOverlayVisible) {
            this.drawSpeedPrompt();
        }

        if (uiState.storyPause && uiState.storyPause.type === 'questHub') {
            this.drawQuestHubOverlay(uiState.storyPause);
        } else {
            this.drawStoryPauseOverlay(uiState.storyPause);
        }

        // Opt-in performance overlay (?perf=1). No-op when disabled.
        this.drawPerfOverlay();
    }

    drawMissionNpcs(interactions, nearbyInteractionId, camera) {
        if (!Array.isArray(interactions)) return;
        interactions.forEach((interaction) => {
            if (!interaction || !interaction.position) return;
            const x = interaction.position.x - camera.x;
            const y = interaction.position.y - camera.y;
            if (x < -45 || x > Viewport.width + 45 || y < -65 || y > Viewport.height + 45) return;

            const nearby = interaction.id === nearbyInteractionId;
            this.ctx.save();
            this.ctx.fillStyle = nearby ? '#ffd76a' : '#6cc8ff';
            this.ctx.beginPath();
            this.ctx.arc(x, y - 12, nearby ? 19 : 16, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#20314f';
            this.ctx.fillRect(x - 13, y + 1, 26, 29);
            this.ctx.strokeStyle = nearby ? '#fff3a3' : '#d8f3ff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 13, y + 1, 26, 29);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(interaction.npcName || 'NPC', x, y - 38);
            if (nearby) {
                this.ctx.fillStyle = 'rgba(9, 19, 35, 0.9)';
                this.ctx.fillRect(x - 52, y + 38, 104, 23);
                this.ctx.strokeStyle = '#ffd76a';
                this.ctx.strokeRect(x - 52, y + 38, 104, 23);
                this.ctx.fillStyle = '#fff3a3';
                this.ctx.font = 'bold 11px Arial';
                this.ctx.fillText('Tap NPC or press E', x, y + 54);
            }
            this.ctx.restore();
        });
    }

    drawTopBar(uiState) {
        const { vQuality, menuState } = uiState;

        // Quality Line background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, Viewport.width, this.QUALITY_LINE_HEIGHT);

        // Category indicator (tappable). Long localized category names must not
        // run under the Learn button, so shrink then truncate to the gap.
        const ci = UILayout.categoryIndicator;
        const learnRect = UILayout.getLearnVersesButton(Viewport.width);
        const maxCategoryWidth = Math.max(44, learnRect.x - ci.x - 6);
        const displayQuality = (typeof tCategory === 'function') ? tCategory(vQuality) : vQuality;
        const arrow = ' \u25bc';
        let categoryLabel = `${displayQuality}${arrow}`;
        let categoryFont = 16;
        for (const size of [16, 14, 13, 12]) {
            this.ctx.font = `bold ${size}px Arial`;
            if (this.ctx.measureText(categoryLabel).width <= maxCategoryWidth) {
                categoryFont = size;
                break;
            }
            categoryFont = size;
        }
        this.ctx.font = `bold ${categoryFont}px Arial`;
        if (this.ctx.measureText(categoryLabel).width > maxCategoryWidth) {
            let base = displayQuality;
            while (base.length > 1 && this.ctx.measureText(`${base}\u2026${arrow}`).width > maxCategoryWidth) {
                base = base.slice(0, -1);
            }
            categoryLabel = `${base}\u2026${arrow}`;
        }
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(categoryLabel, ci.x, ci.y + 16);

        // Learn Verses button (center of top bar)
        this.drawLearnVersesButton();

        // Speed control (left of hamburger)
        this.drawSpeedControl(uiState.currentGameSpeed || 'normal', uiState);

        // Hamburger Menu Button
        this.drawHamburgerButton(menuState);
    }

    drawLearnVersesButton() {
        const lb = UILayout.getLearnVersesButton(Viewport.width);
        const btnX = lb.x;
        const btnY = lb.y;
        const btnW = lb.width;
        const btnH = lb.height;

        // Gold gradient background
        const gradient = this.ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');

        // Rounded rectangle
        const radius = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(btnX + radius, btnY);
        this.ctx.lineTo(btnX + btnW - radius, btnY);
        this.ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + radius);
        this.ctx.lineTo(btnX + btnW, btnY + btnH - radius);
        this.ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - radius, btnY + btnH);
        this.ctx.lineTo(btnX + radius, btnY + btnH);
        this.ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - radius);
        this.ctx.lineTo(btnX, btnY + radius);
        this.ctx.quadraticCurveTo(btnX, btnY, btnX + radius, btnY);
        this.ctx.closePath();

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Text: compact localized label at 320 px, full label otherwise.
        const label = lb.compact
            ? t('ui.learnVersesShort', '📖 LEARN')
            : t('ui.learnVersesHere');
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.font = lb.compact ? 'bold 10px Arial' : 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, btnX + btnW / 2, btnY + 14);
        this.ctx.textAlign = 'left';
    }

    drawHamburgerButton(menuState) {
        const hb = UILayout.hamburgerButton;
        const btnX = UILayout.getHamburgerButtonX(Viewport.width);
        const btnY = hb.y;
        const btnW = hb.width;
        const btnH = hb.height;

        const isOpen = menuState && menuState.menuOpen;

        // Button background - more visible
        this.ctx.fillStyle = isOpen ? '#444' : '#2a2a2a';
        this.ctx.fillRect(btnX, btnY, btnW, btnH);

        // Thicker border
        this.ctx.strokeStyle = isOpen ? '#fff' : '#aaa';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        // Hamburger icon (three lines) - thicker and more visible
        this.ctx.fillStyle = '#fff';
        const lineWidth = 16;
        const lineHeight = 3;  // Thicker lines
        const lineX = btnX + (btnW - lineWidth) / 2;
        const lineSpacing = 5;
        const startY = btnY + 5;

        for (let i = 0; i < 3; i++) {
            this.ctx.fillRect(lineX, startY + i * lineSpacing, lineWidth, lineHeight);
        }
    }

    drawSpeedControl(currentSpeed, uiState) {
        const sc = UILayout.speedControl;
        const baseX = UILayout.getSpeedControlX(Viewport.width);
        const baseY = sc.y;
        const chevW = sc.chevronWidth;
        const labelW = sc.labelWidth;
        const h = sc.height;

        const speedColors = { verySlow: '#b39ddb', slow: '#4fc3f7', normal: '#ffffff', fast: '#ff8a65' };
        const color = speedColors[currentSpeed] || '#ffffff';
        const displayMap = { verySlow: '0.25\u00d7', slow: 'Slow', normal: '1\u00d7', fast: 'Fast' };
        const display = displayMap[currentSpeed] || '1\u00d7';

        this.ctx.fillStyle = 'rgba(40, 40, 50, 0.85)';
        this.ctx.fillRect(baseX, baseY, chevW + labelW + chevW, h);

        this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('\u25c0', baseX + chevW / 2, baseY + h / 2 + 5);

        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 13px Arial';
        this.ctx.fillText(display, baseX + chevW + labelW / 2, baseY + h / 2 + 4);

        this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('\u25b6', baseX + chevW + labelW + chevW / 2, baseY + h / 2 + 5);

        this.ctx.textAlign = 'left';
    }

    drawStoryPauseOverlay(storyPause) {
        if (!storyPause) return;

        const margin = 10;
        const isPuzzle = storyPause.type === 'puzzle';
        const isMemorize = isPuzzle && storyPause.puzzleMode === 'verseMemorize';
        const boxH = isMemorize
            ? Math.min(460, Viewport.height - 20)
            : isPuzzle
            ? Math.min(340, Math.max(270, Math.floor(Viewport.height * 0.5)))
            : Math.min(210, Math.max(166, Math.floor(Viewport.height * 0.34)));
        const boxY = Viewport.height - boxH - margin;
        const boxX = margin;
        const boxW = Viewport.width - margin * 2;
        const line = (storyPause.lines && storyPause.lines[storyPause.lineIndex]) || storyPause.text || '';
        const title = storyPause.speaker || storyPause.title || 'Story';
        const phaseLabel = this._getStoryPausePhaseLabel(storyPause);
        const btnW = 112;
        const btnH = 30;
        const btnX = boxX + boxW - btnW - 14;
        const btnY = boxY + boxH - btnH - 12;

        storyPause.buttonRects = [];

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
        this.ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        // Story pause should visually own the whole lower interaction area,
        // otherwise quiz prompts/buttons behind it compete with dialogue.
        this.ctx.fillStyle = 'rgba(3, 6, 15, 0.78)';
        this.ctx.fillRect(0, Math.max(0, boxY - 18), Viewport.width, Viewport.height - Math.max(0, boxY - 18));

        this.ctx.fillStyle = 'rgba(5, 8, 18, 0.97)';
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#ffd666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        if (phaseLabel) {
            this.ctx.font = 'bold 12px Arial';
            const badgeW = Math.min(190, Math.max(96, this.ctx.measureText(phaseLabel).width + 28));
            const badgeH = 24;
            const badgeX = boxX + boxW - badgeW - 14;
            const badgeY = boxY + 13;
            this.ctx.fillStyle = 'rgba(255, 214, 102, 0.16)';
            this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            this.ctx.strokeStyle = 'rgba(255, 214, 102, 0.72)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
            this.ctx.fillStyle = '#ffe49a';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(phaseLabel, badgeX + badgeW / 2, badgeY + 16);
        }

        this.ctx.fillStyle = '#ffd666';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(title, boxX + 14, boxY + 26);

        // For verse memorization, the verse text is drawn inside _drawVerseMemorizePuzzle
        // with blanks — skip the full text draw here to avoid showing the answers
        if (!(isPuzzle && storyPause.puzzleMode === 'verseMemorize')) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '15px Arial';
            this._drawWrappedText(line, boxX + 14, boxY + 54, boxW - 28, 21, 3);
        }

        if (isPuzzle && storyPause.puzzleMode === 'verseMemorize') {
            this._drawVerseMemorizePuzzle(storyPause, boxX, boxY, boxW, boxH, btnX, btnY, btnW, btnH);
        } else if (isPuzzle) {
            const options = Array.isArray(storyPause.options) ? storyPause.options : [];
            const cols = 2;
            const gap = 10;
            const optW = (boxW - 28 - gap) / cols;
            const optH = 34;
            const startX = boxX + 14;
            const startY = boxY + 118;

            options.forEach((option, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = startX + col * (optW + gap);
                const y = startY + row * (optH + gap);
                const selected = storyPause.selectedAnswer === option;
                const correctSelected = selected && storyPause.isCorrect;
                const wrongSelected = selected && storyPause.selectedAnswer && !storyPause.isCorrect;

                storyPause.buttonRects.push({
                    id: 'option',
                    value: option,
                    x,
                    y,
                    width: optW,
                    height: optH
                });

                this.ctx.fillStyle = correctSelected
                    ? 'rgba(76, 175, 80, 0.36)'
                    : (wrongSelected ? 'rgba(244, 67, 54, 0.32)' : 'rgba(255, 214, 102, 0.16)');
                this.ctx.fillRect(x, y, optW, optH);
                this.ctx.strokeStyle = correctSelected ? '#7CFF8A' : (wrongSelected ? '#ff8a80' : '#ffd666');
                this.ctx.lineWidth = 1.5;
                this.ctx.strokeRect(x, y, optW, optH);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(option, x + optW / 2, y + 22);
            });

            if (storyPause.feedback) {
                this.ctx.fillStyle = storyPause.isCorrect ? '#7CFF8A' : '#ffb3aa';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(storyPause.feedback, boxX + 14, boxY + boxH - 22);
            }

            if (storyPause.completed) {
                storyPause.buttonRects.push({
                    id: 'continue',
                    x: btnX,
                    y: btnY,
                    width: btnW,
                    height: btnH
                });
                this.ctx.fillStyle = 'rgba(255, 214, 102, 0.22)';
                this.ctx.fillRect(btnX, btnY, btnW, btnH);
                this.ctx.strokeStyle = '#ffd666';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(btnX, btnY, btnW, btnH);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 13px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(storyPause.prompt || 'Continue', btnX + btnW / 2, btnY + 20);
            }
        } else {
            storyPause.buttonRects.push({
                id: 'continue',
                x: btnX,
                y: btnY,
                width: btnW,
                height: btnH
            });

            this.ctx.fillStyle = 'rgba(255, 214, 102, 0.18)';
            this.ctx.fillRect(btnX, btnY, btnW, btnH);
            this.ctx.strokeStyle = '#ffd666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 13px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(storyPause.prompt || 'Continue', btnX + btnW / 2, btnY + 20);

            const total = storyPause.lines ? storyPause.lines.length : 0;
            if (total > 1) {
                this.ctx.fillStyle = 'rgba(255,255,255,0.58)';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${storyPause.lineIndex + 1}/${total}`, boxX + 14, boxY + boxH - 18);
            }
        }

        this.ctx.restore();
    }

    drawQuestHubOverlay(hub) {
        if (!hub) return;
        const ctx = this.ctx;
        const canvas = this.canvas;
        const cards = hub.stepCards || [];
        const margin = 10;

        hub.buttonRects = [];

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        // Title
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Choose Your Path', Viewport.width / 2, 30);

        // Progress
        ctx.fillStyle = '#a5c8ff';
        ctx.font = '12px Arial';
        ctx.fillText(hub.completedCount + ' / ' + hub.totalSteps + ' steps complete', Viewport.width / 2, 48);

        const cardH = 48;
        const cardGap = 6;
        const cardW = Viewport.width - margin * 2;
        const cardX = margin;
        var startY = 58;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const y = startY + i * (cardH + cardGap);

            // Card background
            if (card.complete) {
                ctx.fillStyle = 'rgba(76,175,80,0.15)';
            } else if (card.unlocked) {
                ctx.fillStyle = card.isBoss ? 'rgba(204,34,34,0.2)' : 'rgba(74,144,226,0.15)';
            } else {
                ctx.fillStyle = 'rgba(60,60,80,0.12)';
            }
            ctx.fillRect(cardX, y, cardW, cardH);

            // Card border
            if (card.complete) {
                ctx.strokeStyle = '#4caf50';
            } else if (card.unlocked) {
                ctx.strokeStyle = card.isBoss ? '#ff6666' : '#4a90e2';
            } else {
                ctx.strokeStyle = '#444';
            }
            ctx.lineWidth = card.unlocked ? 2 : 1;
            ctx.strokeRect(cardX, y, cardW, cardH);

            // Label
            ctx.textAlign = 'left';
            if (card.complete) {
                ctx.fillStyle = '#4caf50';
                ctx.font = 'bold 14px Arial';
                ctx.fillText('[Done] ' + card.label, cardX + 10, y + 22);
            } else if (card.unlocked) {
                ctx.fillStyle = card.isBoss ? '#ff6666' : '#ffd666';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(card.label, cardX + 10, y + 22);
            } else {
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.fillText('[Locked] ' + card.label, cardX + 10, y + 22);
            }

            // Type indicator
            ctx.fillStyle = card.unlocked ? '#a5c8ff' : '#555';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(card.typeText, cardX + cardW - 10, y + 22);

            // Lock reason
            if (!card.unlocked && !card.complete && card.lockedReason) {
                ctx.fillStyle = '#888';
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(card.lockedReason, cardX + 10, y + 38);
            }

            // Store clickable rect for unlocked cards
            if (card.unlocked) {
                hub.buttonRects.push({
                    id: 'questStep',
                    stepId: card.stepId,
                    isBoss: card.isBoss,
                    x: cardX,
                    y: y,
                    width: cardW,
                    height: cardH
                });
            }
        }

        // Boss button (if all done and no bossArena step)
        if (hub.showBossButton) {
            var bossY = startY + cards.length * (cardH + cardGap) + 6;
            ctx.fillStyle = 'rgba(204,34,34,0.25)';
            ctx.fillRect(cardX, bossY, cardW, cardH);
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(cardX, bossY, cardW, cardH);
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Fight the Boss!', Viewport.width / 2, bossY + 30);
            hub.buttonRects.push({
                id: 'questBoss',
                x: cardX,
                y: bossY,
                width: cardW,
                height: cardH
            });
        }

        ctx.restore();
    }

    _getStoryPausePhaseLabel(storyPause) {
        if (!storyPause) return '';
        if (storyPause.type === 'puzzle') return storyPause.speaker || 'Challenge';
        switch (storyPause.phaseId) {
            case 'intro':
                return 'Story Moment';
            case 'victory':
                return 'Victory';
            default:
                return storyPause.type === 'dialogue' ? 'Dialogue' : '';
        }
    }

    _drawVerseMemorizePuzzle(storyPause, boxX, boxY, boxW, boxH, btnX, btnY, btnW, btnH) {
        const ctx = this.ctx;
        const blanks = storyPause.blanks || [];
        const blankOptions = storyPause.blankOptions || [];
        const currentIdx = storyPause.currentBlankIndex || 0;

        // Render the verse text with blanks
        const verseText = storyPause.text || '';
        const words = verseText.split(/\s+/);
        let displayWords = words.slice();
        for (let b = 0; b < blanks.length; b++) {
            const blank = blanks[b];
            if (b < currentIdx) {
                displayWords[blank.index] = '[' + blank.word + ']';
            } else {
                displayWords[blank.index] = '_____';
            }
        }

        // Draw the verse with blanks
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        const verseDisplay = displayWords.join(' ');
        this._drawWrappedText(verseDisplay, boxX + 14, boxY + 54, boxW - 28, 20, 4);

        // Progress indicator
        if (blanks.length > 0) {
            ctx.fillStyle = '#ffd666';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('Word ' + (currentIdx + 1) + ' of ' + blanks.length, boxX + 14, boxY + 142);
        }

        // Word option buttons for the current blank
        if (currentIdx < blanks.length && !storyPause.completed) {
            const cols = 2;
            const gap = 8;
            const optW = (boxW - 28 - gap) / cols;
            const optH = 30;
            const startX = boxX + 14;
            const startY = boxY + 152;
            const usedWords = storyPause.usedWords || [];

            let btnIdx = 0;
            blankOptions.forEach((option) => {
                if (usedWords.indexOf(option) >= 0) return;

                const col = btnIdx % cols;
                const row = Math.floor(btnIdx / cols);
                const x = startX + col * (optW + gap);
                const y = startY + row * (optH + gap);
                if (y + optH > boxY + boxH - btnH - 20) return;

                storyPause.buttonRects.push({
                    id: 'memorizeOption',
                    value: option,
                    x, y, width: optW, height: optH
                });

                ctx.fillStyle = 'rgba(255, 214, 102, 0.16)';
                ctx.fillRect(x, y, optW, optH);
                ctx.strokeStyle = '#ffd666';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x, y, optW, optH);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(option, x + optW / 2, y + 20);
                btnIdx++;
            });
        }

        if (storyPause.feedback) {
            ctx.fillStyle = storyPause.isCorrect ? '#7CFF8A' : '#ffb3aa';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(storyPause.feedback, boxX + 14, boxY + boxH - 22);
        }

        if (storyPause.completed) {
            storyPause.buttonRects.push({ id: 'continue', x: btnX, y: btnY, width: btnW, height: btnH });
            ctx.fillStyle = 'rgba(255, 214, 102, 0.22)';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = '#ffd666';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(storyPause.prompt || 'Continue', btnX + btnW / 2, btnY + 20);
        }
    }

    _drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines) {
        if (!text) return;
        const words = String(text).split(/\s+/);
        let line = '';
        let lineY = y;
        let linesDrawn = 0;

        for (let i = 0; i < words.length; i++) {
            const testLine = line ? `${line} ${words[i]}` : words[i];
            if (this.ctx.measureText(testLine).width > maxWidth && line) {
                this.ctx.fillText(line, x, lineY);
                linesDrawn++;
                if (maxLines && linesDrawn >= maxLines) return;
                line = words[i];
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }

        if (line && (!maxLines || linesDrawn < maxLines)) {
            this.ctx.fillText(line, x, lineY);
        }
    }

    _drawSpeedOnboardingTooltip(ctrlX, ctrlY, ctrlW, ctrlH) {
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
        const boxW = Math.min(170, Viewport.width - 12);
        const boxH = 50;
        const boxX = Math.max(6, Math.min(
            ctrlX + ctrlW / 2 - boxW / 2,
            Viewport.width - boxW - 6
        ));
        // Keep the callout below the two-row HUD so it never covers stats.
        const boxY = this.PLAYABLE_TOP + 6;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 214, 102, ${0.75 + pulse * 0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(ctrlX - 2, ctrlY - 2, ctrlW + 4, ctrlH + 4);
        this.ctx.fillStyle = `rgba(255, 214, 102, ${0.08 + pulse * 0.06})`;
        this.ctx.fillRect(ctrlX - 2, ctrlY - 2, ctrlW + 4, ctrlH + 4);

        this.drawGuideArrow(boxX + boxW / 2, boxY, ctrlX + ctrlW / 2, ctrlY + ctrlH + 2, 3);

        this.ctx.fillStyle = 'rgba(9, 12, 20, 0.92)';
        this.ctx.strokeStyle = '#ffd666';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#ffd666';
        this.ctx.font = 'bold 13px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t('hud.adjustSpeed', 'Adjust Speed'), boxX + boxW / 2, boxY + 18);
        this.ctx.fillStyle = '#d6deff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('\u25c0 slower    faster \u25b6', boxX + boxW / 2, boxY + 36);
        this.ctx.textAlign = 'left';
        this.ctx.restore();
    }

    drawMenuPanel(menuState) {
        const mp = UILayout.menuPanel;
        const panelX = UILayout.getMenuPanelX(Viewport.width);
        const panelY = mp.topOffset;
        const panelW = mp.width;
        const itemH = mp.itemHeight;
        const padding = mp.padding;

        const musicState = menuState.musicState || {};
        const isPlaying = musicState.isPlaying;

        const testShieldOn = menuState.verseTestShielded || false;
        const itemCount = 15;
        const panelHeight = padding * 2 + itemCount * itemH + (itemCount - 1) * (padding / 2);

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(panelX, panelY, panelW, panelHeight);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(panelX, panelY, panelW, panelHeight);

        // Menu items
        const items = [
            { id: 'review', label: t('menu.review') },
            { id: 'playPause', label: isPlaying ? t('menu.stop') : t('menu.start') },
            { id: 'nextSong', label: t('menu.nextSong') },
            { id: 'goals', label: t('menu.goals') },
            { id: 'verseCotD', label: t('menu.verseCotD') },
            { id: 'verseTest', label: t('menu.verseTest') },
            { id: 'toggleTestShield', label: testShieldOn ? t('menu.testShieldOn') : t('menu.testShieldOff') },
            { id: 'songs', label: t('menu.songs') },
            { id: 'affinityHelp', label: t('menu.affinityHelp') },
            { id: 'futureFeatures', label: t('game.futureFeatures', 'Future Features'), color: '#F5C542' },
            { id: 'viewMode2d', label: `${menuState.viewMode === '2d' ? '✓' : '○'} ${t('menu.view2d')}` },
            { id: 'viewModeThirdPerson', label: `${menuState.viewMode === 'third-person' ? '✓' : '○'} ${t('menu.view25d')}` },
            { id: 'viewModeFirstPerson', label: `${menuState.viewMode === 'first-person' ? '✓' : '○'} ${t('menu.viewFirstPerson')}` },
            { id: 'shareGame', label: t('game.shareGame', '📤 Share Game'), color: '#4CAF50' },
            { id: 'leave', label: t('menu.leaveGame'), color: '#ff4444' }
        ];

        items.forEach((item, index) => {
            const itemY = panelY + padding + index * (itemH + padding / 2);

            // Item background
            this.ctx.fillStyle = item.id === 'leave' ? 'rgba(255, 50, 50, 0.15)' : 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(panelX + padding, itemY, panelW - padding * 2, itemH);

            // Item text
            this.ctx.fillStyle = item.color || '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(item.label, panelX + padding * 2, itemY + itemH / 2 + 4);
        });
    }

    drawCategoryPicker(uiState) {
        if (!uiState.categoryPickerOpen) return;

        const categories = uiState.allCategories || [];
        const currentCategory = uiState.vQuality;
        const cp = UILayout.categoryPicker;
        const padding = cp.padding;
        const itemH = cp.itemHeight;
        const cols = cp.columns;
        const itemSpacing = cp.itemSpacing;

        const rows = Math.ceil(categories.length / cols);
        const colWidth = (cp.width - padding * 2 - itemSpacing * (cols - 1)) / cols;
        const panelH = padding + rows * (itemH + itemSpacing) + padding + 30; // +30 for title

        const panelX = UILayout.getCategoryPickerX(Viewport.width);
        const panelY = UILayout.getCategoryPickerY(Viewport.height);

        // Overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        // Panel background
        this.ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        this.ctx.fillRect(panelX, panelY, cp.width, panelH);
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, cp.width, panelH);

        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t('ui.selectCategory'), panelX + cp.width / 2, panelY + 22);
        this.ctx.textAlign = 'left';

        // Category items in 2-column grid
        categories.forEach((cat, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemX = panelX + padding + col * (colWidth + itemSpacing);
            const itemY = panelY + 30 + padding + row * (itemH + itemSpacing);
            const isActive = cat === currentCategory;

            // Item background
            this.ctx.fillStyle = isActive ? 'rgba(74, 144, 226, 0.4)' : 'rgba(255, 255, 255, 0.08)';
            this.ctx.fillRect(itemX, itemY, colWidth, itemH);

            if (isActive) {
                this.ctx.strokeStyle = '#4a90e2';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(itemX, itemY, colWidth, itemH);
            }

            // Item text
            this.ctx.fillStyle = isActive ? '#4a90e2' : '#ffffff';
            this.ctx.font = isActive ? 'bold 13px Arial' : '13px Arial';
            const displayName = (typeof tCategory === 'function') ? tCategory(cat) : cat;
            this.ctx.fillText(displayName, itemX + 8, itemY + itemH / 2 + 4);
        });
    }

    drawHUD(player, gameState, uiState) {
        const ctx = this.ctx;
        const width = Viewport.width;
        const rowY = this.QUALITY_LINE_HEIGHT;
        const rowH = this.HUD_ROW_HEIGHT;
        const rowBottom = rowY + rowH;
        const centerY = rowY + rowH / 2 + 1;
        const padX = 6;

        // Row 2 background: sits below the category/speed/menu row and above
        // the playable area. Opaque enough to hide the 3D layer behind it.
        ctx.fillStyle = 'rgba(8, 12, 20, 0.94)';
        ctx.fillRect(0, rowY, width, rowH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, rowBottom - 1, width, 1);

        if (!player) return;

        const maxHealth = Math.max(1, player.maxHealth || 100);
        const health = Math.max(0, Math.min(player.health || 0, maxHealth));
        const hpFraction = health / maxHealth;

        // --- Health bar (left) ---
        const barW = Math.max(40, Math.min(64, Math.round(width * 0.15)));
        const barH = 9;
        const barX = padX;
        const barY = rowY + Math.round((rowH - barH) / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = hpFraction > 0.5 ? '#43d16b' : (hpFraction > 0.25 ? '#ffd23f' : '#ff4d4d');
        ctx.fillRect(barX, barY, Math.round(barW * hpFraction), barH);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Numeric HP; drop the localized "HP:" prefix only if the row is tight.
        ctx.font = 'bold 10px Arial';
        const fullHpText = t('ui.hpDisplay', health, maxHealth);
        const compactHpText = `${health}/${maxHealth}`;
        const hpMaxWidth = Math.max(34, Math.min(64, width * 0.17));
        const hpText = ctx.measureText(fullHpText).width <= hpMaxWidth ? fullHpText : compactHpText;
        const hpTextX = barX + barW + 5;
        const hpTextW = ctx.measureText(hpText).width;
        ctx.fillStyle = hpFraction <= 0.25 ? '#ff8b8b' : '#f2f6ff';
        ctx.fillText(hpText, hpTextX, centerY);

        // --- Demons remaining (right, localized short form) ---
        const totalToKill = gameState.monstersToKill || 0;
        const killed = gameState.monstersKilled || 0;
        const remaining = Math.max(0, totalToKill - killed);
        let demonsText = t('hud.demonsLeftShort', remaining, totalToKill);
        if (demonsText === 'hud.demonsLeftShort') {
            demonsText = `Demons ${remaining}/${totalToKill}`;
        }
        ctx.font = 'bold 10px Arial';
        if (ctx.measureText(demonsText).width > width * 0.32) {
            // Language-neutral fallback for very small screens / long locales.
            demonsText = `\uD83D\uDC79 ${remaining}/${totalToKill}`;
        }
        const demonsW = ctx.measureText(demonsText).width;
        ctx.fillStyle = '#ffdd66';
        ctx.textAlign = 'right';
        ctx.fillText(demonsText, width - padX, centerY);
        ctx.textAlign = 'left';

        // --- Level / XP / ammo (middle) ---
        const middleStart = hpTextX + hpTextW + 9;
        const middleEnd = width - padX - demonsW - 8;

        const ammoText = width < 360 ? `\u2022 ${player.ammo || 0}` : `\uD83D\uDD2B ${player.ammo || 0}`;
        const ammoW = ctx.measureText(ammoText).width;

        let cursor = middleStart;
        let levelText = t('ui.levelShort', player.level || 1);
        let levelW = ctx.measureText(levelText).width;
        const levelChipW = levelW + 8;
        if (cursor + levelChipW + 6 + ammoW > middleEnd) {
            // Tight locale: keep the number, drop the translated prefix.
            levelText = String(player.level || 1);
            levelW = ctx.measureText(levelText).width;
        }
        const finalChipW = Math.min(levelW + 8, Math.max(18, middleEnd - cursor));
        if (finalChipW >= 16) {
            ctx.fillStyle = 'rgba(255, 214, 102, 0.16)';
            ctx.fillRect(cursor, centerY - 7, finalChipW, 14);
            ctx.fillStyle = '#ffd666';
            ctx.fillText(levelText, cursor + 4, centerY);
            cursor += finalChipW + 6;
        }

        if (player.votdDamageBonus && cursor + 12 < middleEnd - ammoW) {
            ctx.fillStyle = '#ffa726';
            ctx.fillText('\uD83D\uDD25', cursor, centerY);
            cursor += 12;
        }

        if (width >= 360) {
            ctx.font = '10px Arial';
            const xpText = `${player.xp || 0} XP`;
            const xpW = ctx.measureText(xpText).width;
            if (cursor + xpW + 8 <= middleEnd - ammoW) {
                ctx.fillStyle = 'rgba(196, 214, 255, 0.78)';
                ctx.fillText(xpText, cursor, centerY);
                cursor += xpW + 8;
            }
        }

        // Ammo is right-aligned inside the middle band so it never collides
        // with the localized demons counter.
        if (cursor + ammoW <= middleEnd) {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#9fd4ff';
            ctx.textAlign = 'right';
            ctx.fillText(ammoText, middleEnd, centerY);
            ctx.textAlign = 'left';
        }

        // Story collectible counter sits just under the HUD row.
        const story = gameState.integratedStory;
        if (story && story.targetCount) {
            ctx.fillStyle = '#F6D36B';
            ctx.font = 'bold 15px Arial';
            const label = story.label || 'Stones';
            ctx.fillText(`${label}: ${story.collected || 0} / ${story.targetCount}`, 18, rowBottom + 18);
        }

        // Floating score badge in the top-right of the playing window.
        const badgeW = 90;
        const badgeH = 28;
        const badgeX = width - badgeW - 10;
        const onboardingOpen = !!(uiState && (uiState.speedOnboardingVisible || uiState.speedPromptVisible));
        const badgeY = rowBottom + 6 + (onboardingOpen ? 58 : 0);
        const radius = 6;

        // Background: semi-transparent elegant dark blue/black
        ctx.fillStyle = 'rgba(26, 26, 46, 0.65)';
        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + badgeW - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
        ctx.lineTo(badgeX + radius, badgeY + badgeH);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.closePath();
        ctx.fill();

        // Subtle gold/orange border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw star emoji and score value
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.fillText(`⭐ ${player.score || 0}`, badgeX + badgeW / 2, badgeY + 18);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Speed-control onboarding callout is UI, so draw it after the world
        // (drawTopBar runs before the world and would be covered by tiles).
        if (uiState && uiState.speedOnboardingVisible) {
            const sc = UILayout.speedControl;
            const speedX = UILayout.getSpeedControlX(width);
            this._drawSpeedOnboardingTooltip(
                speedX,
                sc.y,
                sc.chevronWidth * 2 + sc.labelWidth,
                sc.height
            );
        }
    }

    drawOnboardingGuide(uiState, player, camera) {
        const guide = uiState && uiState.onboardingGuide;
        if (!guide) return;

        const layout = this.ONBOARDING_GUIDE_LAYOUT;
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
        const titleFont = 'bold 18px Arial';
        const bodyFont = '14px Arial';
        let targetRect = null;
        let box = null;
        let arrowFrom = null;
        let arrowTo = null;
        let worldMarker = null;

        if (guide.target === 'hud') {
            // Health bar lives in the second HUD row now, not the old stats line.
            targetRect = {
                x: 6,
                y: this.QUALITY_LINE_HEIGHT + 4,
                width: Math.min(150, Viewport.width * 0.42),
                height: this.HUD_ROW_HEIGHT - 8
            };
            box = {
                x: layout.hudBox.x,
                y: this.QUALITY_LINE_HEIGHT + layout.hudBox.yOffset,
                width: layout.hudBox.width,
                height: layout.hudBox.height
            };
            arrowFrom = { x: box.x + 104, y: box.y - 2 };
            arrowTo = { x: targetRect.x + targetRect.width, y: targetRect.y + targetRect.height / 2 };
        } else if (guide.target === 'move') {
            box = {
                x: layout.moveBox.x,
                y: this.QUALITY_LINE_HEIGHT + layout.moveBox.yOffset,
                width: layout.moveBox.width,
                height: layout.moveBox.height
            };
            if (guide.worldX != null && guide.worldY != null && camera) {
                worldMarker = {
                    x: guide.worldX - camera.x,
                    y: guide.worldY - camera.y
                };
                arrowFrom = { x: box.x + 164, y: box.y + 4 };
                arrowTo = { x: worldMarker.x, y: worldMarker.y - 10 };
            }
        } else if (guide.target === 'answers') {
            targetRect = { x: 8, y: Viewport.height - this.ANSWER_SECTION_HEIGHT - 8, width: Viewport.width - 16, height: this.ANSWER_SECTION_HEIGHT + 2 };
            const answerGuideY = Math.max(this.QUALITY_LINE_HEIGHT + layout.answersBox.minTopOffset, Viewport.height - layout.answersBox.safeBottomOffset);
            box = {
                x: layout.answersBox.x,
                y: answerGuideY,
                width: Viewport.width - layout.answersBox.widthInset,
                height: layout.defaultHeight
            };
            arrowFrom = { x: box.x + box.width / 2, y: box.y + box.height };
            arrowTo = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + 2 };
        } else if (guide.target === 'learn') {
            const lb = UILayout.getLearnVersesButton(Viewport.width);
            targetRect = { x: lb.x - 4, y: lb.y - 3, width: lb.width + 8, height: lb.height + 6 };
            box = {
                x: layout.learnBox.x,
                y: this.QUALITY_LINE_HEIGHT + layout.learnBox.yOffset,
                width: Viewport.width - layout.learnBox.widthInset,
                height: layout.learnBox.height
            };
            arrowFrom = { x: box.x + box.width / 2, y: box.y };
            arrowTo = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height };
        }

        if (!box) return;

        this.ctx.save();
        this.ctx.font = bodyFont;
        const bodyLines = this.wrapText(guide.text || '', Math.max(120, box.width - layout.boxPaddingX * 2));
        const visibleBodyLines = bodyLines.slice(0, layout.bodyMaxLines);
        box.height = Math.max(box.height, layout.bodyStartY + visibleBodyLines.length * layout.bodyLineHeight + 12);
        this.ctx.restore();

        if (guide.target === 'answers') {
            const maxBottom = targetRect.y - layout.answersBox.targetGap;
            box.y = Math.min(box.y, maxBottom - box.height);
        }

        if (arrowFrom && guide.target === 'answers') {
            arrowFrom = { x: box.x + box.width / 2, y: box.y + box.height };
        } else if (arrowFrom && guide.target === 'learn') {
            arrowFrom = { x: box.x + box.width / 2, y: box.y };
        }

        this.ctx.save();

        if (targetRect) {
            this.ctx.strokeStyle = `rgba(255, 214, 102, ${0.75 + pulse * 0.2})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(targetRect.x, targetRect.y, targetRect.width, targetRect.height);
            this.ctx.fillStyle = `rgba(255, 214, 102, ${0.08 + pulse * 0.06})`;
            this.ctx.fillRect(targetRect.x, targetRect.y, targetRect.width, targetRect.height);
        }

        if (worldMarker) {
            this.drawMoveGuideMarker(worldMarker.x, worldMarker.y, pulse);
        }

        if (arrowFrom && arrowTo) {
            this.drawGuideArrow(arrowFrom.x, arrowFrom.y, arrowTo.x, arrowTo.y, 5);
        }

        this.ctx.fillStyle = 'rgba(9, 12, 20, 0.92)';
        this.ctx.strokeStyle = '#ffd666';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(box.x, box.y, box.width, box.height);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = titleFont;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(guide.title, box.x + box.width / 2, box.y + layout.titleY);
        this.ctx.font = bodyFont;
        this.ctx.fillStyle = '#d6deff';
        visibleBodyLines.forEach((line, index) => {
            this.ctx.fillText(line, box.x + box.width / 2, box.y + layout.bodyStartY + index * layout.bodyLineHeight);
        });
        this.ctx.textAlign = 'left';

        this.ctx.restore();
    }

    drawMissionTaskCard(uiState) {
        const log = uiState && uiState.missionTaskLog;
        if (!log || !Array.isArray(log.active) || log.active.length === 0 || uiState.storyPause) return;

        const ctx = this.ctx;
        const active = log.active[0];
        const second = log.active[1];
        const x = 12;
        const y = this.QUALITY_LINE_HEIGHT + 44;
        const w = Math.min(340, Viewport.width - 24);
        const h = second ? 98 : 76;

        ctx.save();
        ctx.fillStyle = 'rgba(74, 78, 84, 0.58)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#f6d36b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#f6d36b';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(log.title || 'Mission', x + 12, y + 19);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        this._drawWrappedText(active.action || active.label || 'Current objective', x + 12, y + 40, w - 24, 17, 2);

        if (active.hint) {
            ctx.fillStyle = '#9ecbff';
            ctx.font = '12px Arial';
            ctx.fillText(active.hint, x + 12, y + 68);
        } else if (active.progress && active.progress.text) {
            ctx.fillStyle = '#9ee6a8';
            ctx.font = '12px Arial';
            ctx.fillText('Progress: ' + active.progress.text, x + 12, y + 68);
        } else {
            ctx.fillStyle = '#9ecbff';
            ctx.font = '12px Arial';
            ctx.fillText('Open Goals for the mission log', x + 12, y + 68);
        }

        if (second) {
            ctx.fillStyle = '#cbd6e5';
            ctx.font = '12px Arial';
            this._drawWrappedText('Also: ' + (second.action || second.label), x + 12, y + 88, w - 24, 15, 1);
        }
        ctx.restore();
    }

    drawGuideArrow(fromX, fromY, toX, toY, lineWidth = 3) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLength = 18;

        this.ctx.save();
        this.ctx.strokeStyle = '#ffd666';
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffd666';
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawMoveGuideMarker(screenX, screenY, pulse) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 214, 102, ${0.85 + pulse * 0.1})`;
        this.ctx.fillStyle = `rgba(255, 214, 102, ${0.16 + pulse * 0.08})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 26 + pulse * 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff7d1';
        this.ctx.font = 'bold 18px Georgia';
        this.ctx.textAlign = 'center';
        this.        ctx.fillText(t('hud.move', 'MOVE'), screenX, screenY + 6);
        this.ctx.textAlign = 'left';
        this.ctx.restore();
    }

    drawDailyChallenge(canvas, dailyChallengeProgress, dailyChallengeGoal, dailyChallengeCompleted) {
        const x = 10;
        const y = Viewport.height - 30;  // Bottom-left corner

        if (dailyChallengeCompleted) {
            this.ctx.fillStyle = '#00ff00';  // Green for completed
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(t('ui.dailyChallengeComplete'), x, y);
        } else {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(t('ui.dailyChallengeProgress', dailyChallengeProgress, dailyChallengeGoal), x, y);
        }
    }

    drawVerseCounter(canvas, versesLearned, totalVerses) {
        const x = 10;
        const y = 50;  // Below player stats

        this.ctx.fillStyle = '#ffff00';  // Yellow
        this.ctx.font = '14px Arial';
        this.ctx.fillText(t('ui.versesLearnedProgress', versesLearned, totalVerses), x, y);

        // Progress bar
        const barX = x;
        const barY = y + 5;
        const barWidth = 150;
        const barHeight = 8;
        const progress = versesLearned / totalVerses;

        // Background bar
        this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress fill
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        // Border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    drawGameOverModal(canvas, finalStats, restartButtonRect) {
        const ctx = this.ctx;
        const isVictory = finalStats.result === 'victory';
        const isDefeat = finalStats.result === 'defeat';
        const isMultiplayer = !!finalStats.playerStats && !finalStats.isSoloGame;

        if (finalStats.showIntroMissionPitch) {
            this.drawIntroMissionPitchModal(canvas, restartButtonRect);
            return;
        }

        // Full-screen semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        // Modal container (centered, taller for multiplayer stats)
        const modalWidth = 300;
        const hasLeaderboard = isMultiplayer && finalStats.playerStats;
        const leaderboardCount = hasLeaderboard ? Object.keys(finalStats.playerStats).length : 0;
        const modalHeight = hasLeaderboard ? 320 + leaderboardCount * 22 : 280;
        const modalX = (Viewport.width - modalWidth) / 2;
        const modalY = (Viewport.height - modalHeight) / 2;

        // Modal background
        ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

        // Modal border (color depends on result)
        ctx.strokeStyle = isVictory ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

        // Title
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        if (isVictory) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText(t('ui.victory'), Viewport.width / 2, modalY + 45);
        } else if (isDefeat) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText(t('ui.allDefeated'), Viewport.width / 2, modalY + 45);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(t('ui.gameOverTitle'), Viewport.width / 2, modalY + 45);
        }

        // Final Stats
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';

        const statsX = modalX + 25;
        let statsY = modalY + 80;
        const lineHeight = 24;

        ctx.fillText(t('stats.levelReached', finalStats.level), statsX, statsY);
        statsY += lineHeight;
        ctx.fillText(t('stats.monstersKilled', finalStats.monstersKilled), statsX, statsY);
        statsY += lineHeight;
        ctx.fillText(t('stats.versesLearned', finalStats.versesLearned), statsX, statsY);
        statsY += lineHeight;

        // Final score stat in Game Over modal
        ctx.fillStyle = '#66ff66'; // Highlight score in bright green
        ctx.font = 'bold 16px Arial';
        let finalScore = typeof finalStats.score === 'number' ? finalStats.score : 0;
        if (finalStats.playerStats && finalStats.localPlayerCode && finalStats.playerStats[finalStats.localPlayerCode]) {
            finalScore = finalStats.playerStats[finalStats.localPlayerCode].score || 0;
        }
        ctx.fillText(`Final Score: ${finalScore} pts`, statsX, statsY);
        ctx.fillStyle = '#ffffff'; // Restore font color
        ctx.font = '16px Arial';
        statsY += lineHeight;

        const minutes = Math.floor(finalStats.timePlayed / 60);
        const seconds = finalStats.timePlayed % 60;
        ctx.fillText(t('stats.timePlayed', minutes, seconds), statsX, statsY);
        statsY += lineHeight;

        // Player leaderboard (multiplayer only)
        if (hasLeaderboard) {
            statsY += 8;
            ctx.fillStyle = '#aaaaaa';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(t('ui.players'), Viewport.width / 2, statsY);
            statsY += 20;

            ctx.font = '13px Arial';
            ctx.textAlign = 'left';
            const sorted = Object.values(finalStats.playerStats).sort((a, b) => (b.score || 0) - (a.score || 0) || (b.xp || 0) - (a.xp || 0));
            sorted.forEach((ps, i) => {
                ctx.fillStyle = i === 0 ? '#FFD700' : '#cccccc';
                ctx.fillText(`${i + 1}. ${ps.username} — Lv${ps.level} (${ps.score || 0} pts)`, statsX, statsY);
                statsY += 20;
            });
        }

        // Button
        const buttonWidth = 160;
        const buttonHeight = 40;
        const buttonX = (Viewport.width - buttonWidth) / 2;
        const buttonY = modalY + modalHeight - 55;

        // Store button rect for click detection
        restartButtonRect.x = buttonX;
        restartButtonRect.y = buttonY;
        restartButtonRect.width = buttonWidth;
        restartButtonRect.height = buttonHeight;

        // Button background
        ctx.fillStyle = isVictory ? '#00aa00' : '#00aa00';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Button border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Button text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        let buttonLabel;
        if (finalStats.isMission) {
            buttonLabel = t('game.backToMissions', 'Back to Missions');
        } else if (isMultiplayer && !finalStats.isSoloGame) {
            buttonLabel = t('ui.returnToLobby');
        } else {
            buttonLabel = t('ui.tryAgain');
        }
        ctx.fillText(buttonLabel, Viewport.width / 2, buttonY + 26);
    }

    drawStartHereSummaryModal(summaryState) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const summary = summaryState || {};
        const buttons = Array.isArray(summary.buttons) ? summary.buttons : [];
        const layout = this.START_HERE_SUMMARY_LAYOUT;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        const modalWidth = Math.min(layout.maxWidth, Viewport.width - layout.outerInsetX);
        const modalHeight = Math.min(420, Viewport.height - layout.outerInsetY);
        const modalX = (Viewport.width - modalWidth) / 2;
        const modalY = (Viewport.height - modalHeight) / 2;

        ctx.fillStyle = 'rgba(12, 16, 26, 0.97)';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(summary.title || t('game.missionComplete', 'Mission Complete'), Viewport.width / 2, modalY + 42);

        ctx.fillStyle = '#d6deff';
        ctx.font = '16px Arial';
        const lines = Array.isArray(summary.lines) ? summary.lines : [];
        lines.forEach((line, index) => {
            ctx.fillText(line, Viewport.width / 2, modalY + 86 + index * 32);
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Arial';
        ctx.fillText(summary.ctaLabel || t('game.chooseWhatNext', 'Choose what to do next'), Viewport.width / 2, modalY + 206);

        const buttonWidth = modalWidth - layout.buttonInsetX;
        const buttonHeight = 42;
        const buttonGap = 14;
        const startY = modalY + 232;
        summary.buttonRects = [];

        buttons.forEach((button, index) => {
            const x = modalX + 32;
            const y = startY + index * (buttonHeight + buttonGap);
            summary.buttonRects.push({ id: button.id, x, y, width: buttonWidth, height: buttonHeight });

            ctx.fillStyle = index === 0 ? '#2f7d45' : 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x, y, buttonWidth, buttonHeight);
            ctx.strokeStyle = index === 0 ? '#b7efc5' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, buttonWidth, buttonHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(button.label, x + buttonWidth / 2, y + 27);
        });

        ctx.textAlign = 'left';
    }

    drawIntroMissionPitchModal(canvas, restartButtonRect) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        const modalWidth = Math.min(336, Viewport.width - 24);
        const modalHeight = Math.min(455, Viewport.height - 28);
        const modalX = (Viewport.width - modalWidth) / 2;
        const modalY = (Viewport.height - modalHeight) / 2;

        ctx.fillStyle = 'rgba(12, 16, 26, 0.96)';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 3;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(t('game.verseBattles', 'VERSE BATTLES'), Viewport.width / 2, modalY + 38);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(t('game.verseBattlesSubtitle', 'Build Scripture engagement that lasts.'), Viewport.width / 2, modalY + 62);

        const bulletGroups = [
            [
                t('game.vbBullet1a', 'Lets you create a group and see'),
                t('game.vbBullet1b', 'verses your team learned.')
            ],
            [
                t('game.vbBullet2a', 'Features a powerful meditation app'),
                t('game.vbBullet2b', 'for hearing and learning verses.')
            ],
            [
                t('game.vbBullet3a', 'Features quality devotions'),
                t('game.vbBullet3b', 'on each verse.')
            ],
            [
                t('game.vbBullet4', 'Has a multiplayer mode.')
            ],
            [
                t('game.vbBullet5a', 'Allows you to configure'),
                t('game.vbBullet5b', 'difficulty and gameplay.')
            ],
            [
                t('game.vbBullet6a', 'Registered users may'),
                t('game.vbBullet6b', 'design worlds.')
            ]
        ];

        ctx.textAlign = 'left';
        ctx.font = '15px Arial';
        let lineY = modalY + 102;
        bulletGroups.forEach((group) => {
            ctx.fillStyle = '#ffd666';
            ctx.fillText('- ', modalX + 18, lineY);
            ctx.fillStyle = '#edf2ff';
            ctx.fillText(group[0], modalX + 34, lineY);
            if (group[1]) {
                ctx.fillText(group[1], modalX + 34, lineY + 18);
            }
            lineY += group[1] ? 48 : 36;
        });

        const buttonWidth = 190;
        const buttonHeight = 42;
        const buttonX = (Viewport.width - buttonWidth) / 2;
        const buttonY = modalY + modalHeight - 58;

        restartButtonRect.x = buttonX;
        restartButtonRect.y = buttonY;
        restartButtonRect.width = buttonWidth;
        restartButtonRect.height = buttonHeight;

        ctx.fillStyle = '#2f7f47';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('game.pressToReturn', 'Press to Return'), Viewport.width / 2, buttonY + 27);
        ctx.textAlign = 'left';
    }

    drawMessages(uiState) {
        const { gameOverFlag, isAnswerCorrect, levelCompleted, levelAdvanceCountdown } = uiState;

        if (gameOverFlag) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '29px Arial';
            this.ctx.fillText(t('ui.gameOver'), Viewport.width / 2 - 140, Viewport.height / 2);
            return;
        }

        if (isAnswerCorrect === true) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '17px Arial';
            this.ctx.fillText(t('ui.correct'), Viewport.width / 2 - 35, Viewport.height / 2);

            // Display verse reference below "Correct!" message
            if (typeof lastAnsweredReference !== 'undefined' && lastAnsweredReference) {
                this.ctx.fillStyle = '#90EE90'; // Light green
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(lastAnsweredReference, Viewport.width / 2, Viewport.height / 2 + 25);
                this.ctx.textAlign = 'left';
            }
        } else if (isAnswerCorrect === false) {
            this.ctx.fillStyle = 'red';
            this.ctx.font = '17px Arial';
            this.ctx.fillText(t('ui.incorrect'), Viewport.width / 2 - 35, Viewport.height / 2);
        }

        if (levelCompleted && levelAdvanceCountdown > 0) {
            // Semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, Viewport.height / 2 - 50, Viewport.width, 80);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 26px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(t('ui.levelComplete'), Viewport.width / 2, Viewport.height / 2 - 15);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(t('ui.nextLevelIn', levelAdvanceCountdown), Viewport.width / 2, Viewport.height / 2 + 15);
            this.ctx.textAlign = 'left';
        }
    }

    drawFrozenIndicator(movementFrozen) {
        if (!movementFrozen) return;

        // Draw a subtle frozen indicator at the bottom of the screen
        const indicatorY = Viewport.height - 30;

        // Background bar
        this.ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
        this.ctx.fillRect(50, indicatorY - 15, Viewport.width - 100, 25);

        // Border
        this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, indicatorY - 15, Viewport.width - 100, 25);

        // Text
        this.ctx.fillStyle = '#88ccff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t('ui.movementPaused'), Viewport.width / 2, indicatorY);
        this.ctx.textAlign = 'left';
    }

    drawPlayers(players, currentPlayer, playerCode, camera, inventoryState, visuals) {
        // If we have a playerCode but it's not in players yet, draw our local player anyway
        if (playerCode && currentPlayer && currentPlayer.x !== undefined) {
            const isInServerState = Object.keys(players).includes(playerCode);
            if (!isInServerState) {
                this.drawPlayer(currentPlayer, true, camera, inventoryState, visuals && visuals.players ? visuals.players.local : null);
            }
        }

        Object.keys(players).forEach(code => {
            const isMyPlayer = (code === playerCode);
            const playerData = isMyPlayer ? currentPlayer : players[code];

            if (playerData) {
                const visual = visuals && visuals.players
                    ? (isMyPlayer ? visuals.players.local : visuals.players[code])
                    : null;
                this.drawPlayer(playerData, isMyPlayer, camera, isMyPlayer ? inventoryState : null, visual);
            }
        });
    }

    drawPlayer(playerData, isCurrentPlayer, camera, inventoryState, visual) {
        const playerImage = isCurrentPlayer ? this.assets.playerImg : this.assets.otherPlayerImg;

        if (playerImage && (playerImage.complete || playerImage.tagName === 'CANVAS')) {
            const screenX = playerData.x - camera.x;
            const screenY = playerData.y - camera.y;

            const isGhost = playerData.state === 'ghost';
            const isDisconnected = playerData.state === 'disconnected';

            // Ghost/disconnected players rendered semi-transparent
            if (isGhost || isDisconnected) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.35;
            }

            const buffs = inventoryState ? inventoryState.activeBuffs : {};

            // Sandals of Peace: blue aura circle (150px radius)
            if (buffs.sandals && buffs.sandals.active) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.15;
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 150, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 0.4;
                this.ctx.strokeStyle = '#87CEEB';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Shield of Faith: golden glow
            if (buffs.shield && buffs.shield.active) {
                this.ctx.save();
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = 'gold';
                this.ctx.globalAlpha = 0.4;
                this.ctx.fillStyle = 'gold';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, playerData.width / 2 + 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }

            // Sword of the Spirit: red glow
            if (buffs.sword && buffs.sword.active) {
                this.ctx.save();
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#ff4444';
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, playerData.width / 2 + 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }

            // Breastplate of Righteousness: bronze glow
            if (buffs.breastplate && buffs.breastplate.active) {
                this.ctx.save();
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = '#CD7F32';
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#CD7F32';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, playerData.width / 2 + 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }

            // Extract correct frame from sprite sheet
            const frameIndex = playerData.currentFrame || 0;  // 0 or 1
            const facingDirection = playerData.facingDirection || 'right';
            const facing = facingDirection === 'left' ? -1 : 1;

            // Sprite sheet layout: 2x2 grid (96x96 total, 48x48 per frame)
            // Top row (y=0): right-facing frames
            // Bottom row (y=48): left-facing frames (already drawn left-facing)
            const sourceY = (facingDirection === 'right') ? 0 : 48;
            const sourceX = frameIndex * 48;  // 0 or 48

            // Procedural idle/walk/attack/knockback transforms around the
            // sprite centre. These are visual-only and never move playerData.
            const juice = window.VisualJuice;
            const juiceNow = Date.now();
            let idleDy = 0;
            let walkDy = 0;
            let walkLean = 0;
            let attackDx = 0;
            let attackDy = 0;
            let scaleX = 1;
            let scaleY = 1;
            let knockDx = 0;
            let knockDy = 0;
            if (juice) {
                if (visual && visual.moving) {
                    const walk = juice.walk(juiceNow, visual.speed || 2, visual.seed || 0);
                    walkDy = walk.dy;
                    walkLean = walk.lean * facing;
                } else {
                    const idle = juice.idle(juiceNow, visual ? (visual.seed || 0) : 0);
                    idleDy = idle.dy;
                    scaleX *= idle.sx;
                    scaleY *= idle.sy;
                }
                if (visual && visual.attackAt) {
                    const atk = juice.attack(juiceNow - visual.attackAt);
                    attackDx = atk.dx * facing;
                    attackDy = atk.dy;
                    scaleX *= atk.sx;
                    scaleY *= atk.sy;
                }
                if (visual) {
                    const knock = juice.knockback(visual, juiceNow);
                    knockDx = knock.dx;
                    knockDy = knock.dy;
                }
            }

            this.ctx.save();
            this.ctx.translate(screenX + attackDx + knockDx, screenY + idleDy + walkDy + attackDy + knockDy);
            if (walkLean) this.ctx.rotate(walkLean);
            this.ctx.scale(scaleX, scaleY);
            this.ctx.drawImage(
                playerImage,
                sourceX, sourceY, 48, 48,
                -playerData.width / 2, -playerData.height / 2,
                playerData.width, playerData.height
            );

            // Precomputed white-tinted sprite for hit flash (no per-frame tinting).
            const flash = juice ? juice.hitFlash(visual, juiceNow) : 0;
            if (flash > 0) {
                const flashSprite = this._getFlashSprite(playerImage);
                if (flashSprite) {
                    this.ctx.globalAlpha = flash;
                    this.ctx.drawImage(
                        flashSprite,
                        sourceX, sourceY, 48, 48,
                        -playerData.width / 2, -playerData.height / 2,
                        playerData.width, playerData.height
                    );
                }
            }
            this.ctx.restore();

            // Ghost label + skip health bar
            if (isGhost) {
                this.ctx.restore();
                this.ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(t('ui.ghost'), screenX, screenY - playerData.height / 2 - 18);
                // Name below ghost label
                const displayName = isCurrentPlayer ? t('ui.you', 'You') : (playerData.username || t('ui.player', 'Player'));
                this.ctx.fillStyle = 'rgba(200, 200, 255, 0.6)';
                this.ctx.fillText(displayName, screenX, screenY - playerData.height / 2 - 30);
                this.ctx.textAlign = 'left';
                return;
            }
            if (isDisconnected) {
                this.ctx.restore();
                this.ctx.fillStyle = 'rgba(255, 170, 0, 0.8)';
                this.ctx.font = 'bold 9px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(t('ui.offline'), screenX, screenY - playerData.height / 2 - 18);
                const displayName = playerData.username || t('ui.player', 'Player');
                this.ctx.fillStyle = 'rgba(255, 170, 0, 0.6)';
                this.ctx.fillText(displayName, screenX, screenY - playerData.height / 2 - 30);
                this.ctx.textAlign = 'left';
                return;
            }

            // Health bar with gradient (Green -> Yellow -> Red)
            const healthPercent = playerData.health / playerData.maxHealth;
            const healthBarX = screenX - 20;
            const healthBarY = screenY - playerData.height / 2 - 10;
            const healthBarWidth = 40;

            // Background bar
            this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
            this.ctx.fillRect(healthBarX - 1, healthBarY - 1, healthBarWidth + 2, 7);

            // Gradient health bar
            const gradient = this.ctx.createLinearGradient(healthBarX, 0, healthBarX + healthBarWidth, 0);

            if (healthPercent > 0.5) {
                // Green (pure and vibrant)
                gradient.addColorStop(0, '#00ff00');
                gradient.addColorStop(1, '#00dd00');
            } else if (healthPercent > 0.25) {
                // Yellow
                gradient.addColorStop(0, '#ffff00');
                gradient.addColorStop(1, '#ffdd00');
            } else {
                // Red
                gradient.addColorStop(0, '#ff3333');
                gradient.addColorStop(1, '#dd0000');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, 5);

            // Border
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, 5);

            // Name
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            const displayName = isCurrentPlayer ? t('ui.you', 'You') : (playerData.username || t('ui.player', 'Player'));
            this.ctx.fillText(displayName, screenX - 20, screenY - playerData.height / 2 - 15);
        }
    }

    drawMonsters(monsters, camera, explosionTimer, visuals) {
        const playableTop = this.PLAYABLE_TOP;
        const playableBottom = Viewport.height - this.ANSWER_SECTION_HEIGHT;

        monsters.forEach(monster => {
            const demonType = monster.demonType;
            const demonImage = this.assets.demonImages[demonType];
            const visual = visuals && visuals.monsters
                ? visuals.monsters[String(monster.id)]
                : null;

            const screenX = monster.x - camera.x;
            const screenY = monster.y - camera.y;

            // Visibility check
            if (screenY - monster.height / 2 < playableTop || screenY + monster.height / 2 > playableBottom) return;
            if (screenX + monster.width / 2 < 0 || screenX - monster.width / 2 > Viewport.width) return;

            // Freezing Aura: draw blue circle around paralyzer demons
            if (monster.freezeAura) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, Constants.FREEZE_AURA_RADIUS, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(100, 150, 255, 0.08)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.25)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                this.ctx.restore();
            }

            if (demonImage && demonImage.complete) {
                const juice = window.VisualJuice;
                const juiceNow = Date.now();
                let idleDy = 0;
                let walkDy = 0;
                let walkLean = 0;
                let attackDx = 0;
                let attackDy = 0;
                let scaleX = 1;
                let scaleY = 1;
                let knockDx = 0;
                let knockDy = 0;
                if (juice) {
                    if (visual && visual.moving) {
                        const walk = juice.walk(juiceNow, visual.speed || 2, visual.seed || 0);
                        walkDy = walk.dy;
                        walkLean = walk.lean;
                    } else {
                        const idle = juice.idle(juiceNow, visual ? (visual.seed || 0) : 0);
                        idleDy = idle.dy;
                        scaleX *= idle.sx;
                        scaleY *= idle.sy;
                    }
                    if (visual && visual.attackAt) {
                        const atk = juice.attack(juiceNow - visual.attackAt);
                        attackDx = atk.dx * (visual.attackDirX || 1);
                        attackDy = atk.dy;
                        scaleX *= atk.sx;
                        scaleY *= atk.sy;
                    }
                    if (visual) {
                        const knock = juice.knockback(visual, juiceNow);
                        knockDx = knock.dx;
                        knockDy = knock.dy;
                        const spawn = juice.spawnScale(visual, juiceNow, 260);
                        scaleX *= spawn;
                        scaleY *= spawn;
                    }
                }

                this.ctx.save();
                this.ctx.translate(screenX + attackDx + knockDx, screenY + idleDy + walkDy + attackDy + knockDy);
                if (walkLean) this.ctx.rotate(walkLean);
                this.ctx.scale(scaleX, scaleY);
                this.ctx.drawImage(
                    demonImage,
                    -monster.width / 2, -monster.height / 2,
                    monster.width, monster.height
                );

                // Precomputed white-tinted sprite: cheap, crisp hit flash.
                const flash = juice ? juice.hitFlash(visual, juiceNow) : 0;
                if (flash > 0) {
                    const flashSprite = this._getFlashSprite(demonImage);
                    if (flashSprite) {
                        this.ctx.globalAlpha = flash;
                        this.ctx.drawImage(
                            flashSprite,
                            -monster.width / 2, -monster.height / 2,
                            monster.width, monster.height
                        );
                    }
                }
                this.ctx.restore();
            }

            // Pride armor indicator: golden shield overlay
            if (monster.armorHits > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.4;
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(
                    screenX - monster.width / 2 - 2,
                    screenY - monster.height / 2 - 2,
                    monster.width + 4,
                    monster.height + 4
                );
                // Show armor count
                this.ctx.globalAlpha = 1.0;
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillStyle = '#FFD700';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`🛡${monster.armorHits}`, screenX, screenY - monster.height / 2 - 14);
                this.ctx.textAlign = 'left';
                this.ctx.restore();
            }

            // Dash indicator: red glow when dashing
            if (monster.isDashing) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(
                    screenX - monster.width / 2 - 3,
                    screenY - monster.height / 2 - 3,
                    monster.width + 6,
                    monster.height + 6
                );
                this.ctx.restore();
            }

            // Explosion
            if (monster.isAttacked && Math.floor(explosionTimer / 100) % 2 === 0) {
                const explosionImg = this.assets.explosionImg;
                if (explosionImg)
                    this.ctx.drawImage(explosionImg, screenX - explosionImg.width / 2, screenY - explosionImg.height / 2);
            }

            // Health bar with gradient
            if (monster.showHealth && monster.health > 0) {
                const healthPercent = monster.health / monster.maxHealth;
                const healthBarX = screenX - monster.width / 2;
                const healthBarY = screenY - monster.height / 2 - 10;

                // Background bar (dark gray)
                this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
                this.ctx.fillRect(healthBarX - 1, healthBarY - 1, monster.width + 2, 9);

                // Gradient health bar based on health percentage (Green -> Yellow -> Red)
                const gradient = this.ctx.createLinearGradient(healthBarX, 0, healthBarX + monster.width, 0);

                if (healthPercent > 0.6) {
                    // Green
                    gradient.addColorStop(0, '#00ff00');
                    gradient.addColorStop(1, '#7fff00');
                } else if (healthPercent > 0.3) {
                    // Yellow
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(1, '#ffdd00');
                } else {
                    // Red
                    gradient.addColorStop(0, '#ff0000');
                    gradient.addColorStop(1, '#cc0000');
                }

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(healthBarX, healthBarY, monster.width * healthPercent, 7);

                // Border
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(healthBarX, healthBarY, monster.width, 7);

                // Health text
                this.ctx.font = '11px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${monster.health}`, screenX, healthBarY - 3);
                this.ctx.textAlign = 'left';
            }

            if (monster.isBoss) {
                this.ctx.save();
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ffdc73';
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
                this.ctx.lineWidth = 3;
                const bossText = monster.bossLabel || `${monster.demonType} Guard`;
                const bossTextY = screenY - monster.height / 2 - 22;
                this.ctx.strokeText(bossText, screenX, bossTextY);
                this.ctx.fillText(bossText, screenX, bossTextY);
                this.ctx.textAlign = 'left';
                this.ctx.restore();
            }
        });
    }

    drawSpeedPrompt() {
        const ctx = this.ctx;
        const cw = Viewport.width;
        const ch = Viewport.height;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        const modalW = Math.min(310, cw - 30);
        const modalH = 150;
        const modalX = (cw - modalW) / 2;
        const modalY = (ch - modalH) / 2;

        ctx.fillStyle = 'rgba(12, 16, 26, 0.97)';
        ctx.fillRect(modalX, modalY, modalW, modalH);
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalW, modalH);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(t('hud.gameSpeed', 'Game Speed'), modalX + modalW / 2, modalY + 34);

        ctx.fillStyle = '#d6deff';
        ctx.font = '14px Arial';
        ctx.fillText(t('hud.tooFastOrSlow', 'Too fast or too slow?'), modalX + modalW / 2, modalY + 60);
        ctx.fillText(t('hud.useArrowsToAdjust', 'Use \u25c0 \u25b6 in the top bar to adjust.'), modalX + modalW / 2, modalY + 82);
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.fillText(t('hud.speedKeys', 'Keys: 1 (0.25x)  2 (slow)  3 (normal)  4 (fast)'), modalX + modalW / 2, modalY + 104);

        const btnW = 100;
        const btnH = 28;
        const btnX = (cw - btnW) / 2;
        const btnY = modalY + modalH - 38;
        ctx.fillStyle = '#2f7d45';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#b7efc5';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(t('hud.gotIt', 'Got it!'), modalX + modalW / 2, btnY + 19);
        ctx.textAlign = 'left';
    }

    // Helper: Draw a single tile from a sprite sheet
    // Supports different grid sizes and tile sizes
    drawTileFromSheet(sheet, tileIndex, destX, destY, destWidth = 25, destHeight = 25, gridSize = 8, tileSize = 32) {
        if (!sheet || !sheet.complete) return false;

        const row = Math.floor(tileIndex / gridSize);
        const col = tileIndex % gridSize;
        const sourceX = col * tileSize;
        const sourceY = row * tileSize;

        this.ctx.drawImage(
            sheet,
            sourceX, sourceY, tileSize, tileSize,  // Source: extract tile from sheet
            destX, destY, destWidth, destHeight    // Dest: render on screen
        );
        return true;
    }

    // ---------------------------------------------------------------------
    // World background — Phase 1 of plans/2d-background-graphics-plan.md
    //
    // Rendering is now layered: a procedural ground pattern for walkable space,
    // then solid wall blocks on top of it. Walls are merged into rectangles and
    // culled to the camera instead of iterating all ~11,700 cells per frame.
    // ---------------------------------------------------------------------

    _playfieldBottom() {
        return Viewport.height - this.ANSWER_SECTION_HEIGHT - 120;
    }

    _resolveTheme(themeName) {
        if (typeof TerrainThemes === 'undefined') return null;
        return TerrainThemes.get(this.themeOverride || themeName);
    }

    /**
     * Lazily build and cache the ground/wall patterns for a theme. Patterns are
     * tied to a specific 2D context, so they are rebuilt if the context changes.
     */
    _ensureThemePatterns(theme) {
        if (!theme) return null;
        const cached = this._themePatterns[theme.name];
        if (cached && cached.ctx === this.ctx) return cached;

        const entry = { ctx: this.ctx, ground: null, wall: null };
        try {
            if (typeof TerrainThemes.buildGroundTile === 'function') {
                const groundTile = TerrainThemes.buildGroundTile(theme.name);
                if (groundTile) entry.ground = this.ctx.createPattern(groundTile, 'repeat');
            }
            if (typeof TerrainThemes.buildWallTile === 'function') {
                const wallTile = TerrainThemes.buildWallTile(theme.name);
                if (wallTile) entry.wall = this.ctx.createPattern(wallTile, 'repeat');
            }
        } catch (err) {
            console.warn('Renderer: failed to build terrain patterns', err);
        }

        this._themePatterns[theme.name] = entry;
        return entry;
    }

    /**
     * Decorative ground paths (streets, plazas) supplied by hand-composed map
     * generators. Purely visual — collision is still the wall grid.
     */
    setPaths(paths) {
        this._paths = Array.isArray(paths) && paths.length ? paths : null;
    }

    drawPaths(camera, themeName) {
        if (!this._paths) return;
        const theme = this._resolveTheme(themeName);
        if (!theme) return;

        const top = this.PLAYABLE_TOP;
        const bottom = this._playfieldBottom();
        const height = bottom - top;
        if (height <= 0) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, Viewport.width, height);
        ctx.clip();

        for (let i = 0; i < this._paths.length; i++) {
            const p = this._paths[i];
            const sx = p.x - camera.x;
            const sy = p.y - camera.y;
            if (sx + p.w < 0 || sx > Viewport.width || sy + p.h < top || sy > bottom) continue;

            ctx.fillStyle = theme.path;
            ctx.fillRect(sx, sy, p.w, p.h);

            // A slightly darker lip keeps the road edge readable where it meets
            // the ground, which is otherwise the same value.
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
            ctx.fillRect(sx, sy, p.w, 2);
            ctx.fillRect(sx, sy + p.h - 2, p.w, 2);
        }

        ctx.restore();
    }

    /**
     * Draw the walkable ground across the playfield.
     *
     * This is what finally replaces the transparent canvas (and the page's CSS
     * gradient showing through it) with a real floor.
     */
    drawGround(themeName, camera) {
        const theme = this._resolveTheme(themeName);
        if (!theme) return;

        const top = this.PLAYABLE_TOP;
        const bottom = this._playfieldBottom();
        const height = bottom - top;
        if (height <= 0) return;

        const patterns = this._ensureThemePatterns(theme);
        const ctx = this.ctx;
        const T = (typeof TerrainThemes !== 'undefined' && TerrainThemes.GROUND_TILE_SIZE) || 64;

        // Align the pattern to world coordinates so the ground scrolls with the
        // camera instead of swimming under it.
        const ox = -(((camera.x % T) + T) % T);
        const oy = -(((camera.y % T) + T) % T);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, Viewport.width, height);
        ctx.clip();
        ctx.translate(ox, oy);

        if (patterns && patterns.ground) {
            ctx.fillStyle = patterns.ground;
        } else {
            ctx.fillStyle = theme.ground;
        }
        ctx.fillRect(-ox, top - oy, Viewport.width, height);

        ctx.restore();
    }

    /**
     * Rebuild merged wall rectangles + building placements when the wall set
     * changes (i.e. once per level, not once per frame).
     */
    _ensureWallGeometry(walls) {
        if (this._wallRectsSource === walls) return;
        this._wallRectsSource = walls;

        const cell = (typeof Constants !== 'undefined' && Constants.CELL_SIZE) || 25;
        const list = walls || [];

        this._wallCell = cell;
        this._wallCellSet = this._buildWallCellSet(list, cell);

        if (typeof WallRects === 'undefined') {
            // Defensive fallback: no merging, no culling.
            this._wallRects = list.map(w => ({ x: w.x, y: w.y, w: w.width, h: w.height }));
            this._wallMaxHeight = cell;
            this._wallCellCount = list.length;
            this._buildings = [];
            return;
        }

        const built = WallRects.build(list, cell);
        this._wallRects = built.rects;
        this._wallMaxHeight = built.maxHeight;
        this._wallCellCount = list.length;
        this._buildings = this._buildBuildings(list, cell);

        // Plots *exactly* covered by a building render the prop instead of a
        // block, so the prop is not framed by the block's edge shading.
        //
        // The match has to include the size: on maps where big wall masses merge
        // into one rectangle, a small building plot can share that rectangle's
        // origin, and keying on position alone blanked the entire mass.
        this._buildingKeys = new Set();
        for (let i = 0; i < this._buildings.length; i++) {
            const b = this._buildings[i];
            this._buildingKeys.add(b.x + ',' + b.y + ',' + b.w + ',' + b.h);
        }
    }

    /**
     * Occupancy set used to decide which rectangle edges are exposed.
     *
     * Only grid-aligned cells are recorded — those are the ones WallRects can
     * merge, so a lookup miss on an irregular map means "exposed", which is the
     * safe result. Keyed numerically (gy * 100000 + gx) because string keys in
     * the per-frame edge tests were measurably slower.
     */
    _buildWallCellSet(walls, cell) {
        const set = new Set();
        for (let i = 0; i < walls.length; i++) {
            const w = walls[i];
            if (!w || w.width !== cell || w.height !== cell) continue;
            if (w.x % cell !== 0 || w.y % cell !== 0) continue;
            set.add((w.y / cell) * 100000 + (w.x / cell));
        }
        return set;
    }

    /**
     * Coalesce [from, to) into runs where `test(i)` is truthy.
     * Returns a flat array of [start, end) index pairs.
     */
    _exposedRuns(from, to, test) {
        if (typeof WallRects === 'undefined' || typeof WallRects.exposedRuns !== 'function') {
            // No run coalescing available: treat the whole span as exposed.
            return from < to ? [from, to] : [];
        }
        return WallRects.exposedRuns(from, to, test);
    }

    /**
     * Deterministic building placements, computed once per level.
     *
     * The previous per-frame version rebuilt a Set of every wall for each
     * candidate cell (effectively O(n^2)) and allowed overlapping houses.
     */
    _buildBuildings(walls, cell) {
        const sheet = this.assets && this.assets.buildingTilesImg;
        if (!sheet || !sheet.complete || !walls.length) return [];
        const set = this._wallCellSet;
        if (!set || set.size === 0) return [];

        const buildingTiles = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        // Props are placed per solid "plot" rather than per random cell, and are
        // scaled to the plot. A fixed 100px sprite could not fit the city map's
        // 50px house footprints, so almost every roll was rejected and level 1
        // ended up with 8 props across the whole world.
        const MIN_PLOT = 2;
        const MAX_PLOT = 5;
        const claimed = new Set();
        const out = [];

        for (let i = 0; i < walls.length; i++) {
            const w = walls[i];
            if (!w || w.width !== cell || w.height !== cell) continue;
            if (w.x % cell !== 0 || w.y % cell !== 0) continue;

            const gx = w.x / cell;
            const gy = w.y / cell;
            if (claimed.has(gy * 100000 + gx)) continue;

            // Largest solid square with this cell as its top-left corner.
            let n = 0;
            for (let s = MAX_PLOT; s >= MIN_PLOT; s--) {
                if (this._isSolidPlot(set, gx, gy, s)) {
                    n = s;
                    break;
                }
            }
            if (!n) continue;

            // Claim the whole plot even when no prop is placed, so a smaller
            // prop is never nested inside a larger plot.
            for (let ox = 0; ox < n; ox++) {
                for (let oy = 0; oy < n; oy++) {
                    claimed.add((gy + oy) * 100000 + (gx + ox));
                }
            }

            let hash = (gx * 73856093) ^ (gy * 19349663);
            hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
            hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
            hash = (hash >> 16) ^ hash;
            const roll = Math.abs(hash % 1000) / 1000;

            // Standalone buildings (a plot with open ground around it, as on the
            // city map) are placed densely — an empty plot there reads as a bare
            // stone plinth. Plots embedded in a large mass stay sparse so those
            // masses keep their organic spacing.
            //
            // Small plots need three open sides to qualify: a 2x2 square inside a
            // two-cell-thick wall has two open sides (one either side of the wall)
            // and would otherwise line every wall with 50px huts.
            const openSides = this._openSides(set, gx, gy, n);
            let chance;
            if (n >= 4) chance = openSides >= 2 ? 0.92 : 0.35;
            else chance = openSides >= 3 ? 0.85 : 0;
            if (roll > chance) continue;

            const size = n * cell;
            out.push({
                x: gx * cell,
                y: gy * cell,
                w: size,
                h: size,
                tileIndex: buildingTiles[Math.abs(hash) % buildingTiles.length]
            });
        }

        return out;
    }

    /** How many of a plot's four sides border walkable ground (0-4). */
    _openSides(set, gx, gy, n) {
        const mid = n >> 1;
        let open = 0;
        if (!set.has((gy - 1) * 100000 + (gx + mid))) open++;
        if (!set.has((gy + n) * 100000 + (gx + mid))) open++;
        if (!set.has((gy + mid) * 100000 + (gx - 1))) open++;
        if (!set.has((gy + mid) * 100000 + (gx + n))) open++;
        return open;
    }

    /** True when the n x n plot with its top-left at (gx, gy) is entirely wall. */
    _isSolidPlot(set, gx, gy, n) {
        for (let oy = 0; oy < n; oy++) {
            for (let ox = 0; ox < n; ox++) {
                if (!set.has((gy + oy) * 100000 + (gx + ox))) return false;
            }
        }
        return true;
    }

    drawWalls(walls, camera, terrainTheme) {
        if (!walls || walls.length === 0) return;

        const theme = this._resolveTheme(terrainTheme);
        if (!theme) return;

        this._ensureWallGeometry(walls);

        const top = this.PLAYABLE_TOP;
        const bottom = this._playfieldBottom();
        const height = bottom - top;
        if (height <= 0) return;

        const patterns = this._ensureThemePatterns(theme);
        const ctx = this.ctx;
        const T = (typeof TerrainThemes !== 'undefined' && TerrainThemes.GROUND_TILE_SIZE) || 64;
        const ox = -(((camera.x % T) + T) % T);
        const oy = -(((camera.y % T) + T) % T);

        // World-space rect covering the playfield, used for culling.
        const view = { x: camera.x, y: camera.y + top, w: Viewport.width, h: height };
        const visible = this._visibleWalls;
        const count = (typeof WallRects !== 'undefined')
            ? WallRects.query(this._wallRects, this._wallMaxHeight, view, visible)
            : 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, Viewport.width, height);
        ctx.clip();
        ctx.translate(ox, oy);

        // Pass 1 — bodies. Texture only: any per-rectangle toning would show up
        // as a seam where two rectangles in the same wall mass meet.
        ctx.fillStyle = (patterns && patterns.wall) ? patterns.wall : theme.wall;
        const buildingKeys = this._buildingKeys;
        for (let i = 0; i < count; i++) {
            const r = visible[i];
            if (buildingKeys && buildingKeys.has(r.x + ',' + r.y + ',' + r.w + ',' + r.h)) continue;
            ctx.fillRect(r.x - camera.x - ox, r.y - camera.y - oy, r.w, r.h);
        }

        // Pass 2 — edges.
        //
        // A merged rectangle is an approximation of a wall mass, so its border
        // is not necessarily a visible edge: where two rectangles meet inside one
        // solid mass there is nothing to shade. Drawing the faces and outline
        // unconditionally (the previous behaviour) put a light top face, a dark
        // bottom face and two outlines along every internal boundary — which
        // read as unwanted horizontal lines, most visibly on the large solid
        // regions the `classic` map generator produces.
        //
        // So each of the four sides is painted only on the spans where the
        // neighbouring cell is walkable.
        const cell = this._wallCell || 25;
        const cellSet = this._wallCellSet;
        const topH = Math.max(2, Math.round(cell * 0.14));
        const faceH = Math.max(3, Math.round(cell * 0.18));
        const viewLeft = view.x;
        const viewRight = view.x + view.w;
        const viewTop = view.y;
        const viewBottom = view.y + view.h;

        for (let i = 0; i < count; i++) {
            const r = visible[i];
            const dx = r.x - camera.x - ox;
            const dy = r.y - camera.y - oy;

            // A building covers this plot: the prop is the visual, so only keep
            // a soft contact shadow that grounds it. A hard shadow band read as
            // a bar under each house.
            if (buildingKeys && buildingKeys.has(r.x + ',' + r.y + ',' + r.w + ',' + r.h)) {
                const shadow = this._ensureShadowSprite();
                if (shadow) {
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(shadow, dx + r.w * 0.08, dy + r.h - 16, r.w * 0.84, r.h * 0.2);
                    ctx.restore();
                }
                continue;
            }

            // Islands of walls that could not be merged to the grid: frame them
            // whole, since there is no occupancy data to test against.
            if (r.irregular || !cellSet) {
                ctx.fillStyle = theme.wallTop;
                ctx.fillRect(dx, dy, r.w, topH);
                ctx.fillStyle = theme.wallFace;
                ctx.fillRect(dx, dy + r.h - faceH, r.w, faceH);
                ctx.strokeStyle = theme.wallLine;
                ctx.lineWidth = 1;
                ctx.strokeRect(dx + 0.5, dy + 0.5, r.w - 1, r.h - 1);
                ctx.fillStyle = theme.groundShadow;
                ctx.fillRect(dx + 2, dy + r.h, r.w, 6);
                continue;
            }

            const gx0 = Math.round(r.x / cell);
            const gy0 = Math.round(r.y / cell);
            const cols = Math.round(r.w / cell);
            const rows = Math.round(r.h / cell);

            // Clamp the scans to the part of the rectangle that is on screen.
            const cMin = Math.max(0, Math.floor((viewLeft - r.x) / cell));
            const cMax = Math.min(cols, Math.ceil((viewRight - r.x) / cell));
            const rMin = Math.max(0, Math.floor((viewTop - r.y) / cell));
            const rMax = Math.min(rows, Math.ceil((viewBottom - r.y) / cell));

            // Bottom — the visible side face, plus the drop shadow it casts.
            const bottomRuns = this._exposedRuns(cMin, cMax, (c) => !cellSet.has((gy0 + rows) * 100000 + (gx0 + c)));
            for (let k = 0; k < bottomRuns.length; k += 2) {
                const x = dx + bottomRuns[k] * cell;
                const w = (bottomRuns[k + 1] - bottomRuns[k]) * cell;

                ctx.fillStyle = theme.groundShadow;
                ctx.fillRect(x + 2, dy + r.h, w, 6);
                ctx.fillStyle = 'rgba(0,0,0,0.13)';
                ctx.fillRect(x + 1, dy + r.h + 3, w + 3, 7);

                ctx.fillStyle = theme.wallFace;
                ctx.fillRect(x, dy + r.h - faceH, w, faceH);
                ctx.fillStyle = theme.wallLine;
                ctx.fillRect(x, dy + r.h - 1, w, 1);
            }

            // Top — lit face and bright lip.
            const topRuns = this._exposedRuns(cMin, cMax, (c) => !cellSet.has((gy0 - 1) * 100000 + (gx0 + c)));
            for (let k = 0; k < topRuns.length; k += 2) {
                const x = dx + topRuns[k] * cell;
                const w = (topRuns[k + 1] - topRuns[k]) * cell;

                ctx.fillStyle = theme.wallTop;
                ctx.fillRect(x, dy, w, topH);
                ctx.fillStyle = 'rgba(255,255,255,0.20)';
                ctx.fillRect(x, dy, w, 1);
            }

            // Left and right — a thin dark edge, enough to separate the mass
            // from the ground without drawing a heavy border.
            const leftRuns = this._exposedRuns(rMin, rMax, (k) => !cellSet.has((gy0 + k) * 100000 + (gx0 - 1)));
            for (let k = 0; k < leftRuns.length; k += 2) {
                const y = dy + leftRuns[k] * cell;
                const h = (leftRuns[k + 1] - leftRuns[k]) * cell;
                ctx.fillStyle = theme.wallFace;
                ctx.fillRect(dx, y, 2, h);
                ctx.fillStyle = theme.wallLine;
                ctx.fillRect(dx, y, 1, h);
            }

            const rightRuns = this._exposedRuns(rMin, rMax, (k) => !cellSet.has((gy0 + k) * 100000 + (gx0 + cols)));
            for (let k = 0; k < rightRuns.length; k += 2) {
                const y = dy + rightRuns[k] * cell;
                const h = (rightRuns[k + 1] - rightRuns[k]) * cell;
                ctx.fillStyle = theme.wallFace;
                ctx.fillRect(dx + r.w - 2, y, 2, h);
                ctx.fillStyle = theme.wallLine;
                ctx.fillRect(dx + r.w - 1, y, 1, h);
            }
        }
        // Pass 3 — buildings (cached placements, culled by camera).
        let buildingsDrawn = 0;
        if (this._buildings.length) {
            for (let i = 0; i < this._buildings.length; i++) {
                const b = this._buildings[i];
                const sx = b.x - camera.x;
                const sy = b.y - camera.y;
                if (sx + b.w < 0 || sx > Viewport.width || sy + b.h < top || sy > bottom) continue;
                this.drawTileFromSheet(
                    this.assets.buildingTilesImg,
                    b.tileIndex,
                    sx - ox,
                    sy - oy,
                    b.w,
                    b.h,
                    4,
                    100
                );
                buildingsDrawn++;
            }
        }

        ctx.restore();

        if (this.perfEnabled) {
            this._perf.counts.wallRectsDrawn = count;
            this._perf.counts.wallRectsTotal = this._wallRects.length;
            this._perf.counts.wallCells = this._wallCellCount;
            this._perf.counts.buildingsDrawn = buildingsDrawn;
            this._perf.counts.buildingsTotal = this._buildings.length;
        }
    }

    // ---------------------------------------------------------------------
    // Contact shadows
    // ---------------------------------------------------------------------

    _ensureShadowSprite() {
        if (this._shadowSprite) return this._shadowSprite;
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(0,0,0,0.70)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.34)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        this._shadowSprite = canvas;
        return canvas;
    }

    /** Stamp one soft shadow at a world position. */
    _stampShadow(camera, worldX, worldY, radiusX, radiusY, alpha) {
        const sprite = this._shadowSprite;
        if (!sprite) return;
        const sx = worldX - camera.x;
        const sy = worldY - camera.y;
        const top = this.PLAYABLE_TOP;
        const bottom = this._playfieldBottom();
        if (sx + radiusX < 0 || sx - radiusX > Viewport.width) return;
        if (sy + radiusY < top || sy - radiusY > bottom) return;

        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(sprite, sx - radiusX, sy - radiusY, radiusX * 2, radiusY * 2);
        this.ctx.globalAlpha = 1;
    }

    /**
     * All entity shadows are drawn in one pass before any entity, so a monster
     * drawn later cannot cast its shadow over a player drawn earlier.
     */
    drawShadows(players, monsters, healingPoints, collectibles, npcInteractions, camera) {
        if (!this._ensureShadowSprite()) return;

        const top = this.PLAYABLE_TOP;
        const bottom = this._playfieldBottom();
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, top, Viewport.width, bottom - top);
        this.ctx.clip();

        if (players) {
            for (const code in players) {
                const p = players[code];
                if (!p || !p.width) continue;
                this._stampShadow(camera, p.x, p.y + (p.height || 48) * 0.42, p.width * 0.44, p.width * 0.17, 0.62);
            }
        }

        if (monsters) {
            for (let i = 0; i < monsters.length; i++) {
                const m = monsters[i];
                if (!m || !m.width) continue;
                this._stampShadow(camera, m.x, m.y + (m.height || 48) * 0.42, m.width * 0.42, m.width * 0.16, 0.45);
            }
        }

        if (healingPoints) {
            for (let i = 0; i < healingPoints.length; i++) {
                const hp = healingPoints[i];
                this._stampShadow(camera, hp.x + 8, hp.y + 16, 10, 4, 0.35);
            }
        }

        if (collectibles) {
            for (let i = 0; i < collectibles.length; i++) {
                const c = collectibles[i];
                const w = c.width || 20;
                this._stampShadow(camera, c.x + w / 2, c.y + (c.height || 20), w * 0.5, w * 0.2, 0.35);
            }
        }

        if (npcInteractions) {
            for (let i = 0; i < npcInteractions.length; i++) {
                const npc = npcInteractions[i];
                if (!npc || !npc.position) continue;
                this._stampShadow(camera, npc.position.x, npc.position.y + 30, 18, 7, 0.4);
            }
        }

        this.ctx.restore();
    }

    // ---------------------------------------------------------------------
    // Phase 0 — opt-in performance overlay (?perf=1)
    // ---------------------------------------------------------------------

    drawPerfOverlay() {
        if (!this.perfEnabled) return;
        const perf = this._perf;
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

        perf.frames++;
        if (!perf.fpsWindowStart) perf.fpsWindowStart = now;
        if (now - perf.fpsWindowStart >= 500) {
            perf.fps = Math.round((perf.frames * 1000) / (now - perf.fpsWindowStart));
            perf.frames = 0;
            perf.fpsWindowStart = now;
        }
        if (perf.frameStart) {
            perf.ms.total = now - perf.frameStart;
        }

        const c = perf.counts;
        const m = perf.ms;
        const lines = [
            'fps ' + perf.fps + '   frame ' + (m.total || 0).toFixed(1) + 'ms',
            'ground ' + (m.ground || 0).toFixed(1) + '  walls ' + (m.walls || 0).toFixed(1) + '  ent ' + (m.entities || 0).toFixed(1),
            'wall rects ' + (c.wallRectsDrawn | 0) + '/' + (c.wallRectsTotal | 0) + '  cells ' + (c.wallCells | 0),
            'buildings ' + (c.buildingsDrawn | 0) + '/' + (c.buildingsTotal | 0),
            'dpr ' + Viewport.dpr + '  ' + Viewport.width + 'x' + Viewport.height
        ];

        const ctx = this.ctx;
        const boxW = 196;
        const boxH = lines.length * 13 + 10;
        const boxX = 6;
        const boxY = this.PLAYABLE_TOP + 4;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = 'rgba(140,255,160,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#9fe8a8';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], boxX + 6, boxY + 6 + i * 13);
        }
        ctx.restore();
    }

    drawHealingPoints(healingPoints, camera) {
        healingPoints.forEach(hp => {
            const screenX = hp.x - camera.x;
            const screenY = hp.y - camera.y;
            const w = hp.width || 16;
            const h = hp.height || 16;
            const thickness = Math.max(2, Math.floor(w / 4));

            this.ctx.fillStyle = '#00ff00';
            // Vertical bar
            this.ctx.fillRect(screenX - thickness / 2, screenY - h / 2, thickness, h);
            // Horizontal bar
            this.ctx.fillRect(screenX - w / 2, screenY - thickness / 2, w, thickness);
            
            // Optional: slight glow
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#00ff00';
            this.ctx.strokeRect(screenX - w / 2, screenY - thickness / 2, w, thickness);
            this.ctx.shadowBlur = 0;
        });
    }

    drawCollectibles(collectibles, camera) {
        if (!collectibles) return;

        const fallbackColors = {
            sword: '#FFD700', belt: '#DAA520', helmet: '#C0C0C0',
            breastplate: '#CD7F32', sandals: '#87CEEB', shield: '#FFD700'
        };

        collectibles.forEach(item => {
            const screenX = item.x - camera.x;
            const screenY = item.y - camera.y;

            // Visibility check
            if (screenX + item.width / 2 < 0 || screenX - item.width / 2 > Viewport.width ||
                screenY + item.height / 2 < 0 || screenY - item.height / 2 > Viewport.height) return;

            if (item.type === 'smoothStone' || item.storyObjectId === 'smoothStone') {
                this.ctx.save();
                this.ctx.shadowBlur = 9;
                this.ctx.shadowColor = '#F6D36B';
                this.ctx.fillStyle = '#C7B08A';
                this.ctx.strokeStyle = '#FFE08A';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.ellipse(screenX, screenY, item.width / 2, item.height / 2, -0.2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
                this.ctx.beginPath();
                this.ctx.ellipse(screenX - 5, screenY - 4, 5, 3, -0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return;
            }

            // Try to use loaded image (shield uses shieldImg)
            if (item.type === 'shield' && this.assets.shieldImg && this.assets.shieldImg.complete) {
                this.ctx.drawImage(this.assets.shieldImg, screenX - item.width / 2, screenY - item.height / 2, item.width, item.height);
                return;
            }

            // Fallback: colored diamond shape with glow
            const color = fallbackColors[item.type] || '#ffffff';
            this.ctx.save();
            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY - item.height / 2);
            this.ctx.lineTo(screenX + item.width / 2, screenY);
            this.ctx.lineTo(screenX, screenY + item.height / 2);
            this.ctx.lineTo(screenX - item.width / 2, screenY);
            this.ctx.closePath();
            this.ctx.fill();

            // Type initial in center
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(item.type[0].toUpperCase(), screenX, screenY);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.restore();
        });
    }

    drawInventoryHUD(inventoryState) {
        const inv = inventoryState.inventory || {};
        const buffs = inventoryState.activeBuffs || {};
        const isOpen = inventoryState.inventoryOpen;

        // Total item count
        const totalItems = Object.values(inv).reduce((sum, c) => sum + c, 0);

        // Floating "i" inventory button
        const ib = UILayout.inventoryButton;
        const btnX = UILayout.getInventoryButtonX();
        const btnY = ib.topOffset;
        const btnSize = ib.size;

        this.ctx.fillStyle = isOpen ? '#DAA520' : (totalItems > 0 ? '#2a2a2a' : '#1a1a1a');
        this.ctx.fillRect(btnX, btnY, btnSize, btnSize);
        this.ctx.strokeStyle = totalItems > 0 ? 'gold' : '#888';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(btnX, btnY, btnSize, btnSize);
        this.ctx.fillStyle = totalItems > 0 ? 'gold' : '#ccc';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('i', btnX + btnSize / 2, btnY + 20);
        this.ctx.textAlign = 'left';

        // Badge for total count
        if (totalItems > 0) {
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            this.ctx.arc(btnX + btnSize - 2, btnY + 4, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText(`${totalItems}`, btnX + btnSize - (totalItems >= 10 ? 8 : 5), btnY + 8);
        }

        // Active buff timers (stacked below button)
        const buffColors = {
            sword: '#FFD700', shield: '#FFD700', breastplate: '#CD7F32', sandals: '#87CEEB'
        };
        const buffNames = {
            sword: t('buffs.sword'), shield: t('buffs.shield'), breastplate: t('buffs.breastplate'), sandals: t('buffs.sandals')
        };
        let timerY = btnY + btnSize + 4;
        for (const type in buffs) {
            if (buffs[type].active) {
                const remaining = Math.ceil(Math.max(0, buffs[type].endTime - Date.now()) / 1000);
                this.ctx.fillStyle = buffColors[type] || '#fff';
                this.ctx.font = 'bold 11px Arial';
                this.ctx.fillText(`${buffNames[type]}: ${remaining}s`, 7, timerY + 10);
                timerY += 16;
            }
        }

        // Inventory panel when open
        if (isOpen) {
            const ip = UILayout.inventoryPanel;
            const panelX = UILayout.getInventoryPanelX();
            const panelY = ip.topOffset;
            const panelW = ip.width;
            const rowHeight = 28;

            const allTypes = ['sword', 'belt', 'helmet', 'breastplate', 'sandals', 'shield'];
            const visibleItems = allTypes.filter(t => inv[t] > 0);
            const panelH = Math.max(50, 24 + visibleItems.length * rowHeight + 8);

            // Store expanded height for click detection
            ip.expandedHeight = panelH;

            // Panel background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(panelX, panelY, panelW, panelH);
            this.ctx.strokeStyle = 'gold';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(panelX, panelY, panelW, panelH);

            // Title
            this.ctx.fillStyle = 'gold';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(t('ui.armorOfGod'), panelX + 8, panelY + 16);

            if (visibleItems.length === 0) {
                this.ctx.fillStyle = '#888';
                this.ctx.font = '11px Arial';
                this.ctx.fillText(t('ui.empty'), panelX + 8, panelY + 38);
            } else {
                const itemColors = {
                    sword: '#FFD700', belt: '#DAA520', helmet: '#C0C0C0',
                    breastplate: '#CD7F32', sandals: '#87CEEB', shield: '#FFD700'
                };
                const shortNames = {
                    sword: t('items.sword'), belt: t('items.belt'), helmet: t('items.helmet'),
                    breastplate: t('items.breastplate'), sandals: t('items.sandals'), shield: t('items.shield')
                };
                const activatable = ['sword', 'breastplate', 'sandals', 'shield'];

                visibleItems.forEach((type, idx) => {
                    const rowY = panelY + 24 + idx * rowHeight;

                    // Color dot
                    this.ctx.fillStyle = itemColors[type];
                    this.ctx.beginPath();
                    this.ctx.arc(panelX + 14, rowY + 10, 6, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Name + count
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '11px Arial';
                    this.ctx.fillText(`${shortNames[type]} x${inv[type]}`, panelX + 24, rowY + 14);

                    // Use button for activatable items
                    if (activatable.includes(type)) {
                        const isActive = buffs[type] && buffs[type].active;
                        const useBtnX = panelX + panelW - 50;
                        const useBtnW = 40;
                        const useBtnH = 22;

                        if (isActive) {
                            this.ctx.fillStyle = '#555';
                            this.ctx.fillRect(useBtnX, rowY, useBtnW, useBtnH);
                            this.ctx.fillStyle = '#aaa';
                            this.ctx.font = '10px Arial';
                            this.ctx.fillText(t('ui.active'), useBtnX + 3, rowY + 15);
                        } else {
                            this.ctx.fillStyle = '#228B22';
                            this.ctx.fillRect(useBtnX, rowY, useBtnW, useBtnH);
                            this.ctx.fillStyle = 'white';
                            this.ctx.font = 'bold 11px Arial';
                            this.ctx.fillText(t('ui.use'), useBtnX + 8, rowY + 15);
                        }
                    } else {
                        // Belt/Helmet: auto-use label
                        this.ctx.fillStyle = '#888';
                        this.ctx.font = '10px Arial';
                        this.ctx.fillText(t('ui.auto'), panelX + panelW - 45, rowY + 14);
                    }
                });
            }
        }
    }

    drawVerseTestButton() {
        const vtb = UILayout.verseTestButton;
        const btnX = UILayout.getVerseTestButtonX(Viewport.width);
        const btnY = UILayout.getVerseTestButtonY(Viewport.height);
        const btnSize = vtb.size;

        // Button background (semi-transparent)
        this.ctx.fillStyle = 'rgba(42, 42, 42, 0.6)';  // 60% opacity
        this.ctx.fillRect(btnX, btnY, btnSize, btnSize);
        this.ctx.strokeStyle = 'rgba(74, 144, 226, 0.7)';  // 70% opacity blue
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(btnX, btnY, btnSize, btnSize);

        // "T" icon
        this.ctx.fillStyle = 'rgba(74, 144, 226, 0.9)';  // 90% opacity blue
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('T', btnX + btnSize / 2, btnY + 20);
        this.ctx.textAlign = 'left';
    }

    drawBullets(bullets, camera) {
        if (!bullets) return;

        bullets.forEach(bullet => {
            const screenX = bullet.x - camera.x;
            const screenY = bullet.y - camera.y;

            // Visibility check
            if (screenX + 10 > 0 && screenX - 10 < Viewport.width &&
                screenY + 10 > 0 && screenY - 10 < Viewport.height) {

                // Bright glow halo
                this.ctx.save();
                this.ctx.fillStyle = '#ff0000';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#ff0000';
                this.ctx.globalAlpha = 0.6;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();

                // Solid core
                this.ctx.fillStyle = '#ff3333'; // Bright red
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    displayBibleVerse(verseText, verseReference, quiz) {
        if (quiz && quiz.mode === 'cloze') {
            this.displayClozeOptions(quiz);
            return;
        }

        const effectiveVerseText = (quiz && quiz.discipleshipContent)
            ? (quiz.promptText || verseText || '')
            : (verseText || (quiz ? quiz.promptText : '') || '');
        const effectiveReference = (quiz && quiz.verseReference)
            ? quiz.verseReference
            : (verseReference || '');

        const leftPadding = 14;
        const rightPadding = 7;
        const maxWidth = Viewport.width - leftPadding - rightPadding;
        const maxLines = 5;
        const lineHeight = 22;

        this.ctx.font = 'bold 16px Arial';

        let lines = [];
        let words = effectiveVerseText.split(' ');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            const metrics = this.ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        lines = lines.slice(0, maxLines);

        for (let i = 0; i < lines.length; i++) {
            const y = Viewport.height - 118 + i * lineHeight;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(lines[i], leftPadding, y);
        }

        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(effectiveReference, leftPadding, Viewport.height - 118 + lines.length * lineHeight);

        if (quiz) {
            this.displayQuizOptions(quiz);
        }
    }

    displayClozeOptions(quiz, verseLineCount) {
        const qo = UILayout.quizOptions;
        const leftPadding = qo.startX;
        const rightPadding = qo.rightPadding || 7;
        const canvasWidth = Viewport.width;

        // Layout from bottom up: buttons (24px) + gap (6px) + text area above
        const letterBtnHeight = 24;
        const letterBtnWidth = 44;
        const letterBtnSpacing = 5;
        const letterY = Viewport.height - letterBtnHeight - 6;
        const lineHeight = 22;
        const maxLines = 4;
        // Text starts above the buttons with enough room
        const clozeStartY = letterY - 8 - (maxLines * lineHeight);

        this.ctx.save();
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const displayText = (typeof QuizManager !== 'undefined' && QuizManager.getClozeDisplayText)
            ? QuizManager.getClozeDisplayText(quiz)
            : quiz.promptText;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';

        const maxTextWidth = canvasWidth - leftPadding - rightPadding;
        const lines = this.wrapText(displayText, maxTextWidth);

        let textY = clozeStartY;
        for (let i = 0; i < lines.length && i < maxLines; i++) {
            this.ctx.fillText(lines[i], leftPadding, textY);
            textY += lineHeight;
        }

        if (quiz.isComplete || quiz.showFullAnswer) {
            this.ctx.fillStyle = quiz.isComplete ? '#4CAF50' : '#f44336';
            this.ctx.font = 'bold 16px Arial';

            if (quiz.isComplete) {
                this.        ctx.fillText(t('game.clozeCorrect', '✓ Correct!'), leftPadding, textY + 4);

                // Display verse reference after "Correct!" for cloze quiz
                if (typeof lastAnsweredReference !== 'undefined' && lastAnsweredReference) {
                    this.ctx.fillStyle = '#90EE90';
                    this.ctx.font = '13px Arial';
                    this.ctx.fillText(lastAnsweredReference, leftPadding, textY + 22);
                }
            } else {
                this.ctx.fillText(t('game.clozeAnswer', '✗ Answer: {0}').replace('{0}', quiz.answers.join(', ')), leftPadding, textY + 4);
            }
            this.ctx.restore();
            return;
        }

        const letterButtons = quiz.letterOptions || [];
        const totalButtonsWidth = letterButtons.length * letterBtnWidth + (letterButtons.length - 1) * letterBtnSpacing;
        const letterStartX = (canvasWidth - totalButtonsWidth) / 2;

        this.ctx.font = 'bold 14px Arial';

        for (let i = 0; i < letterButtons.length; i++) {
            const letter = letterButtons[i];
            const btnX = letterStartX + i * (letterBtnWidth + letterBtnSpacing);

            this.ctx.fillStyle = '#e8e8e8';
            this.ctx.fillRect(btnX, letterY, letterBtnWidth, letterBtnHeight);

            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btnX, letterY, letterBtnWidth, letterBtnHeight);

            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(letter, btnX + letterBtnWidth / 2, letterY + letterBtnHeight / 2);
        }

        this.ctx.restore();
    }

    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }

    _isDiscipleshipGridQuiz(quiz) {
        return !!(quiz && quiz.discipleshipContent && Array.isArray(quiz.options) && quiz.options.length > 2);
    }

    _wrapTextWithLimit(text, maxWidth, maxLines, font) {
        const previousFont = this.ctx.font;
        if (font) {
            this.ctx.font = font;
        }

        const words = String(text || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            if (this.ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
                if (lines.length === maxLines - 1) {
                    break;
                }
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            const remainingWords = words.slice(lines.join(' ').split(/\s+/).filter(Boolean).length);
            let finalLine = remainingWords.length ? remainingWords.join(' ') : currentLine;
            if (lines.length === maxLines - 1) {
                while (finalLine && this.ctx.measureText(finalLine + '...').width > maxWidth) {
                    const parts = finalLine.split(' ');
                    parts.pop();
                    finalLine = parts.join(' ');
                }
                if (finalLine !== currentLine || remainingWords.length > currentLine.split(/\s+/).filter(Boolean).length) {
                    finalLine = (finalLine || currentLine) + '...';
                }
            }
            lines.push(finalLine);
        }

        this.ctx.font = previousFont;
        return lines.slice(0, maxLines);
    }

    _getDiscipleshipQuizLayout(quiz) {
        const optionCount = quiz.options.length;
        const columns = Math.min(2, optionCount);
        const rows = Math.ceil(optionCount / columns);
        const leftMargin = 14;
        const rightMargin = this.viewMode !== '2d' ? 108 : 14;
        const topGap = 8;
        const rowGap = 8;
        const columnGap = 10;
        const buttonHeight = optionCount >= 4 ? 38 : 34;
        const buttonWidth = Math.floor((Viewport.width - leftMargin - rightMargin - columnGap) / columns);
        const optionFont = '11px Arial';
        const labelLineHeight = 16;
        const labelLines = [];
        const labelHeight = labelLines.length * labelLineHeight;
        const totalHeight = labelHeight + topGap + rows * buttonHeight + (rows - 1) * rowGap;
        const topY = Viewport.height - totalHeight - 10;
        const buttons = [];

        for (let i = 0; i < optionCount; i++) {
            const column = i % columns;
            const row = Math.floor(i / columns);
            const x = leftMargin + column * (buttonWidth + columnGap);
            const y = topY + labelHeight + topGap + row * (buttonHeight + rowGap);
            buttons.push({
                x: x,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                textLines: this._wrapTextWithLimit(quiz.options[i].text, buttonWidth - 10, 2, optionFont)
            });
        }

        return {
            labelLines: labelLines,
            labelX: leftMargin,
            labelY: topY,
            labelLineHeight: labelLineHeight,
            buttons: buttons
        };
    }

    displayQuizOptions(quiz) {
        // Need-comparison uses its own vertical reference-list layout, which the
        // horizontal button row below cannot express.
        if (quiz && quiz.mode === 'need_comparison' && typeof window !== 'undefined' && window.NeedQuizMode) {
            window.NeedQuizMode.render(this.ctx, quiz);
            return;
        }

        if (this._isDiscipleshipGridQuiz(quiz)) {
            const layout = this._getDiscipleshipQuizLayout(quiz);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';

            layout.labelLines.forEach((line, index) => {
                this.ctx.fillText(line, layout.labelX, layout.labelY + 2 + index * layout.labelLineHeight);
            });

            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            layout.buttons.forEach((button, index) => {
                this.ctx.fillStyle = 'lightgray';
                this.ctx.fillRect(button.x, button.y, button.width, button.height);

                this.ctx.fillStyle = '#333';
                const lineHeight = 11;
                const lineBlockHeight = button.textLines.length * lineHeight;
                const startY = button.y + (button.height - lineBlockHeight) / 2 + lineHeight / 2;

                button.textLines.forEach((line, lineIndex) => {
                    this.ctx.fillText(line, button.x + button.width / 2, startY + lineIndex * lineHeight);
                });
            });

            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
            return;
        }

        const qo = UILayout.quizOptions;
        const buttonHeight = qo.height;
        const buttonSpacing = qo.spacing;
        const optionStartX = qo.startX;
        const rightPadding = qo.rightPadding || 7;
        const buttonY = UILayout.getQuizButtonY(Viewport.height);
        const optionCount = quiz.options.length;

        let buttonWidth;
        if (optionCount === 2) {
            buttonWidth = 70;
        } else if (optionCount === 4) {
            buttonWidth = 65;
        } else {
            buttonWidth = qo.width;
        }

        const totalButtonWidth = optionCount * buttonWidth + (optionCount - 1) * buttonSpacing;
        const maxLabelWidth = Viewport.width - optionStartX - rightPadding - totalButtonWidth - 14;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';

        const labelText = quiz.questionLabel;
        const labelTextWidth = this.ctx.measureText(labelText).width;

        let line1 = '';
        let line2 = '';
        let labelWidth = labelTextWidth;

        if (labelTextWidth > maxLabelWidth) {
            const words = labelText.split(' ');
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
                const testWidth = this.ctx.measureText(testLine).width;

                if (testWidth > maxLabelWidth && currentLine.length > 0) {
                    line1 = currentLine;
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }

            line2 = currentLine;
            labelWidth = Math.max(
                this.ctx.measureText(line1).width,
                this.ctx.measureText(line2).width
            );

            this.ctx.fillText(line1, optionStartX, buttonY + 2);
            this.ctx.fillText(line2, optionStartX, buttonY + 18);
        } else {
            this.ctx.fillText(labelText, optionStartX, buttonY + 10);
            labelWidth = labelTextWidth;
        }

        for (let i = 0; i < optionCount; i++) {
            const buttonX = optionStartX + labelWidth + 14 + i * (buttonWidth + buttonSpacing);

            this.ctx.fillStyle = 'lightgray';
            this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px Arial';
            const optText = quiz.options[i].text;
            const optTextWidth = this.ctx.measureText(optText).width;
            this.ctx.fillText(optText, buttonX + (buttonWidth - optTextWidth) / 2, buttonY + 14);
        }
    }

    drawDamageNumbers(damageNumbers, camera) {
        this.ctx.save();
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        damageNumbers.forEach(dn => {
            const elapsed = Date.now() - dn.startTime;
            const progress = elapsed / dn.duration;

            // Convert world coords to screen coords
            const screenX = dn.x - camera.x;
            const screenY = dn.y - camera.y;

            // Float upward
            const y = screenY - (progress * 30);  // Move up 30px

            // Fade out
            const alpha = 1 - progress;

            // Support custom text (e.g. "BLOCKED") or numeric damage
            const text = typeof dn.damage === 'string' ? dn.damage : '-' + dn.damage;

            // Draw shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, ' + (alpha * 0.5) + ')';
            this.ctx.fillText(text, screenX + 1, y + 1);

            // Draw damage number (support custom color)
            if (dn.color) {
                // Parse hex color and apply alpha
                const r = parseInt(dn.color.slice(1, 3), 16);
                const g = parseInt(dn.color.slice(3, 5), 16);
                const b = parseInt(dn.color.slice(5, 7), 16);
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                this.ctx.fillStyle = 'rgba(255, 100, 100, ' + alpha + ')';
            }
            this.ctx.fillText(text, screenX, y);
        });

        this.ctx.restore();
    }

    drawMonsterTooltip(monsters, camera, mouseX, mouseY) {
        if (!mouseX || !mouseY) return;

        const playableTop = this.PLAYABLE_TOP;
        const playableBottom = Viewport.height - this.ANSWER_SECTION_HEIGHT;

        // Check if cursor is over any monster
        for (const monster of monsters) {
            const screenX = monster.x - camera.x;
            const screenY = monster.y - camera.y;

            // Visibility check
            if (screenY - monster.height / 2 < playableTop || screenY + monster.height / 2 > playableBottom) continue;
            if (screenX + monster.width / 2 < 0 || screenX - monster.width / 2 > Viewport.width) continue;

            // Check if cursor is within monster bounds (with some margin)
            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < Math.max(monster.width / 2, monster.height / 2) + 10) {
                // Render tooltip
                const tooltipText = `${tDemon(monster.demonType)} HP: ${monster.health}/${monster.maxHealth}`;

                this.ctx.save();
                this.ctx.font = 'bold 12px Arial';
                const textMetrics = this.ctx.measureText(tooltipText);
                const textWidth = textMetrics.width + 10;
                const textHeight = 20;

                // Position tooltip above cursor
                let tooltipX = mouseX - textWidth / 2;
                let tooltipY = mouseY - textHeight - 5;

                // Keep tooltip on screen
                if (tooltipX < 5) tooltipX = 5;
                if (tooltipX + textWidth > Viewport.width - 5) tooltipX = Viewport.width - textWidth - 5;
                if (tooltipY < playableTop + 5) tooltipY = mouseY + 10;

                // Draw background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.fillRect(tooltipX - 5, tooltipY - 15, textWidth, textHeight);

                // Draw border
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(tooltipX - 5, tooltipY - 15, textWidth, textHeight);

                // Draw text
                this.ctx.fillStyle = '#ffff00';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(tooltipText, mouseX, tooltipY);
                this.ctx.restore();

                return; // Only show tooltip for first monster under cursor
            }
        }
    }

    drawGoalsPanel(uiState) {
        if (uiState && uiState.missionTaskLog) {
            this.drawMissionLogPanel(uiState.missionTaskLog);
            return;
        }

        const ctx = this.ctx;
        const canvas = this.canvas;

        // Full-screen semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        // Modal container (centered)
        const modalWidth = 280;
        const modalHeight = 200;
        const modalX = (Viewport.width - modalWidth) / 2;
        const modalY = (Viewport.height - modalHeight) / 2;

        // Modal background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

        // Modal border
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

        // Title
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('game.goals', 'Goals'), Viewport.width / 2, modalY + 28);

        // --- Daily Challenge ---
        const dcY = modalY + 50;
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';

        const dcProgress = uiState.dailyChallengeProgress || 0;
        const dcGoal = uiState.dailyChallengeGoal || 5;
        const dcCompleted = uiState.dailyChallengeCompleted || false;

        if (dcCompleted) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText(t('ui.dailyChallengeComplete', '✓ Daily Challenge Complete!'), modalX + 15, dcY);
        } else {
            ctx.fillText(t('ui.dailyChallengeProgress', 'Daily: {0}/{1} First Letter quizzes').replace('{0}', dcProgress).replace('{1}', dcGoal), modalX + 15, dcY);
        }

        // Daily progress bar
        const dcBarX = modalX + 15;
        const dcBarY = dcY + 8;
        const dcBarW = modalWidth - 30;
        const dcBarH = 12;
        const dcPercent = Math.min(dcProgress / dcGoal, 1);

        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.fillRect(dcBarX, dcBarY, dcBarW, dcBarH);
        ctx.fillStyle = dcCompleted ? '#00ff00' : '#ffcc00';
        ctx.fillRect(dcBarX, dcBarY, dcBarW * dcPercent, dcBarH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(dcBarX, dcBarY, dcBarW, dcBarH);

        // --- Verses Learned ---
        const vlY = dcBarY + 35;
        const vl = uiState.versesLearned || 0;
        const vt = uiState.totalVerses || 0;

        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText(t('ui.versesLearnedProgress', 'Verses Learned: {0} / {1}').replace('{0}', vl).replace('{1}', vt), modalX + 15, vlY);

        // Verses progress bar
        const vlBarY = vlY + 8;
        const vlPercent = Math.min(vl / vt, 1);

        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.fillRect(dcBarX, vlBarY, dcBarW, dcBarH);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(dcBarX, vlBarY, dcBarW * vlPercent, dcBarH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(dcBarX, vlBarY, dcBarW, dcBarH);

        // Dismiss hint
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('game.tapToClose', 'Tap anywhere to close'), Viewport.width / 2, modalY + modalHeight - 12);

        // Reset text align
        ctx.textAlign = 'left';
    }

    drawMissionLogPanel(log) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const modalWidth = Math.min(440, Viewport.width - 36);
        const modalHeight = Math.min(440, Viewport.height - 64);
        const modalX = (Viewport.width - modalWidth) / 2;
        const modalY = (Viewport.height - modalHeight) / 2;
        const left = modalX + 18;
        const rightW = modalWidth - 36;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, Viewport.width, Viewport.height);

        ctx.fillStyle = 'rgba(12, 20, 34, 0.96)';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        ctx.strokeStyle = '#f6d36b';
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

        ctx.fillStyle = '#f6d36b';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mission Log', Viewport.width / 2, modalY + 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(log.title || 'Mission', Viewport.width / 2, modalY + 49);

        ctx.textAlign = 'left';
        let y = modalY + 78;
        y = this._drawMissionLogSection('Active', log.active || [], left, y, rightW, '#9ee6a8', 'No active objectives');
        y = this._drawMissionLogSection('Completed', (log.completed || []).slice(-4), left, y + 8, rightW, '#a8c4ff', 'Nothing completed yet');
        this._drawMissionLogSection('Locked', (log.locked || []).slice(0, 5), left, y + 8, rightW, '#9aa4b5', 'No locked objectives');

        ctx.fillStyle = '#8994a8';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap anywhere to close', Viewport.width / 2, modalY + modalHeight - 12);
        ctx.restore();
    }

    _drawMissionLogSection(title, items, x, y, width, color, emptyText) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(title, x, y);
        y += 18;

        if (!items.length) {
            ctx.fillStyle = '#7d8798';
            ctx.font = '12px Arial';
            ctx.fillText(emptyText, x + 10, y);
            return y + 20;
        }

        const maxItems = Math.min(items.length, 5);
        for (let i = 0; i < maxItems; i++) {
            const item = items[i];
            const prefix = item.complete ? '\u2713 ' : (item.locked ? '\u25cb ' : '\u25b8 ');
            const progress = item.progress && item.progress.text ? ' (' + item.progress.text + ')' : '';
            ctx.fillStyle = item.locked ? '#8d96a8' : '#ffffff';
            ctx.font = item.active ? 'bold 12px Arial' : '12px Arial';
            const line = prefix + (item.action || item.label || 'Objective') + progress;
            this._drawWrappedText(line, x + 10, y, width - 20, 15, 2);
            y += 34;
            if (item.active && item.hint) {
                ctx.fillStyle = '#9ecbff';
                ctx.font = '11px Arial';
                this._drawWrappedText(item.hint, x + 22, y - 12, width - 34, 13, 1);
            } else if (item.locked && item.lockedReason) {
                ctx.fillStyle = '#9aa4b5';
                ctx.font = '11px Arial';
                this._drawWrappedText(item.lockedReason, x + 22, y - 12, width - 34, 13, 1);
            }
        }
        return y;
    }

    drawFlashMessages(flashMessages) {
        if (!flashMessages || flashMessages.length === 0) return;

        const ctx = this.ctx;
        const canvas = this.canvas;
        const now = Date.now();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let yOffset = 0;
        flashMessages.forEach(msg => {
            const elapsed = now - msg.startTime;
            if (elapsed >= msg.duration) return;

            let alpha = 1;
            const fadeStart = msg.duration - 300;
            if (elapsed > fadeStart) {
                alpha = 1 - (elapsed - fadeStart) / 300;
            }

            const y = Viewport.height / 2 - 60 + yOffset;

            // Shadow
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
            ctx.fillText(msg.text, Viewport.width / 2 + 1, y + 1);

            // Text
            ctx.fillStyle = msg.color.replace(')', `, ${alpha})`).replace('rgb(', 'rgba(');
            // Handle hex colors too
            if (msg.color.startsWith('#')) {
                const r = parseInt(msg.color.slice(1, 3), 16);
                const g = parseInt(msg.color.slice(3, 5), 16);
                const b = parseInt(msg.color.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            ctx.fillText(msg.text, Viewport.width / 2, y);

            yOffset += 24;
        });

        ctx.restore();
    }

    drawCombatHint(player, camera, combatHint) {
        if (!player || !camera || !combatHint) return;

        const line1 = combatHint.line1 || '';
        const line2 = combatHint.line2 || '';
        const elapsed = combatHint.duration - (combatHint.remainingMs || 0);
        const fadeWindow = 250;
        let alpha = 1;

        if (elapsed < fadeWindow) {
            alpha = elapsed / fadeWindow;
        } else if ((combatHint.remainingMs || 0) < fadeWindow) {
            alpha = (combatHint.remainingMs || 0) / fadeWindow;
        }
        alpha = Math.max(0, Math.min(1, alpha));

        const screenX = player.x - camera.x;
        const preferredY = player.y - camera.y - (player.height || 48) - 92;
        const screenY = Math.max(82, preferredY);
        const ctx = this.ctx;
        const line1Font = 'bold 28px Arial';
        const line2Font = 'bold 28px Arial';

        ctx.save();
        ctx.font = line1Font;
        const line1Width = ctx.measureText(line1).width;
        ctx.font = line2Font;
        const line2Width = ctx.measureText(line2).width;
        const boxWidth = Math.max(line1Width, line2Width) + 44;
        const boxHeight = 78;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(10, 10, 20, ${0.72 * alpha})`;
        ctx.strokeStyle = `rgba(255, 209, 102, ${0.95 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(screenX - boxWidth / 2, screenY - boxHeight / 2, boxWidth, boxHeight, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = line1Font;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(line1, screenX, screenY - 16);
        ctx.font = line2Font;
        ctx.fillStyle = `rgba(255, 209, 102, ${alpha})`;
        ctx.fillText(line2, screenX, screenY + 16);
        ctx.restore();
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xff) + Math.floor(255 * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * percent / 100));
        const b = Math.min(255, (num & 0xff) + Math.floor(255 * percent / 100));
        return `rgb(${r}, ${g}, ${b})`;
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xff) - Math.floor(255 * percent / 100));
        const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * percent / 100));
        const b = Math.max(0, (num & 0xff) - Math.floor(255 * percent / 100));
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Cache a white-tinted copy of a sprite. Built once per image, then
     * reused for every hit flash (never tint per frame).
     */
    _getFlashSprite(image) {
        if (!image) return null;
        if (!this._flashSpriteCache) this._flashSpriteCache = new WeakMap();
        const cached = this._flashSpriteCache.get(image);
        if (cached) return cached;
        try {
            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            if (!width || !height) return null;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const tintCtx = canvas.getContext('2d');
            tintCtx.drawImage(image, 0, 0);
            tintCtx.globalCompositeOperation = 'source-in';
            tintCtx.fillStyle = '#ffffff';
            tintCtx.fillRect(0, 0, width, height);
            this._flashSpriteCache.set(image, canvas);
            return canvas;
        } catch (error) {
            return null;
        }
    }

    _drawEffectTexture(image, x, y, size, alpha) {
        if (!image || !image.complete || !image.naturalWidth) return;
        this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        this.ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    }

    /**
     * Draw typed procedural effects: ring, spark, dust, death, soul, correct,
     * muzzle. All coordinates are world coordinates and get camera-offset here.
     */
    drawEffects(visuals, camera) {
        if (!visuals || !Array.isArray(visuals.effects) || visuals.effects.length === 0) return;
        if (!window.VisualJuice || !VisualJuice.isEnabled()) return;
        const ctx = this.ctx;
        const now = Date.now();

        visuals.effects.forEach((effect) => {
            if (!effect || !effect.duration) return;
            const p = Math.min(1, Math.max(0, (now - effect.start) / effect.duration));
            const alpha = 1 - p;
            const x = effect.x - camera.x;
            const y = effect.y - camera.y;
            const color = effect.color || '#ffd36b';

            ctx.save();
            if (effect.type === 'ring') {
                const radius = 6 + (effect.radius || 30) * p;
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 * alpha + 1;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = alpha * 0.22;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
                ctx.fill();
                this._drawEffectTexture(this.assets.juiceRingImg, x, y, 38 + p * 36, alpha * 0.9);
            } else if (effect.type === 'spark') {
                ctx.globalCompositeOperation = 'lighter';
                const count = effect.count || 7;
                for (let i = 0; i < count; i++) {
                    const angle = (effect.seed || 0) * Math.PI * 2 + (i / count) * Math.PI * 2;
                    const distance = 5 + p * 22;
                    const size = (1 - p) * 2.2 + 0.5;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = alpha * 0.55;
                ctx.fillStyle = '#fff6d8';
                ctx.beginPath();
                ctx.arc(x, y, 6 * (1 - p) + 2, 0, Math.PI * 2);
                ctx.fill();
                this._drawEffectTexture(this.assets.juiceSparkImg, x, y, 18 + p * 22, alpha * 0.95);
            } else if (effect.type === 'muzzle') {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 3 + p * 9, 0, Math.PI * 2);
                ctx.fill();
                this._drawEffectTexture(this.assets.juiceSparkImg, x, y, 14 + p * 12, alpha);
            } else if (effect.type === 'dust') {
                for (let i = 0; i < 5; i++) {
                    const angle = (effect.seed || 0) * Math.PI * 2 + (i / 5) * Math.PI * 2;
                    const distance = 4 + p * 16;
                    ctx.globalAlpha = alpha * 0.55;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance - p * 6, 2 + p * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                this._drawEffectTexture(this.assets.juiceSmokeImg, x, y, 18 + p * 16, alpha * 0.55);
            } else if (effect.type === 'death') {
                const radius = 8 + p * 34;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, `rgba(255, 220, 160, ${alpha * 0.85})`);
                gradient.addColorStop(0.45, `rgba(255, 106, 94, ${alpha * 0.55})`);
                gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 8; i++) {
                    const angle = (effect.seed || 0) * Math.PI * 2 + (i / 8) * Math.PI * 2;
                    const distance = 6 + p * 24;
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.fillStyle = i % 2 ? '#ffb36b' : '#ff6a5e';
                    ctx.beginPath();
                    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance - p * 10, 2.4 * (1 - p) + 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                this._drawEffectTexture(this.assets.juiceSmokeImg, x, y, 40 + p * 34, alpha * 0.8);
            } else if (effect.type === 'soul') {
                const rise = p * 44;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha * 0.9;
                const gradient = ctx.createRadialGradient(x, y - rise, 0, x, y - rise, 16);
                gradient.addColorStop(0, 'rgba(235, 250, 255, 0.95)');
                gradient.addColorStop(0.5, `rgba(160, 220, 255, ${alpha * 0.55})`);
                gradient.addColorStop(1, 'rgba(120, 190, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y - rise, 16, 0, Math.PI * 2);
                ctx.fill();
                this._drawEffectTexture(this.assets.juiceHolyImg, x, y - rise, 22, alpha * 0.7);
            } else if (effect.type === 'correct') {
                ctx.globalCompositeOperation = 'lighter';
                const radius = 10 + p * 46;
                ctx.globalAlpha = alpha * 0.75;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 * alpha + 1;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
                for (let i = 0; i < 12; i++) {
                    const angle = (effect.seed || 0) * Math.PI * 2 + (i / 12) * Math.PI * 2;
                    const distance = 8 + p * 34;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = '#fff2b0';
                    ctx.beginPath();
                    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2.2 * (1 - p) + 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                this._drawEffectTexture(this.assets.juiceHolyImg, x, y, 52 + p * 38, alpha * 0.95);
            }
            ctx.restore();
        });
    }

    drawLowHealthVignette(player) {
        if (!player || !window.VisualJuice) return;
        const maxHealth = Math.max(1, player.maxHealth || 100);
        const fraction = Math.max(0, Math.min(1, (player.health || 0) / maxHealth));
        const alpha = VisualJuice.lowHealthVignette(fraction, Date.now());
        if (alpha <= 0) return;
        const width = Viewport.width;
        const height = Viewport.height;
        const gradient = this.ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.28,
            width / 2, height / 2, Math.max(width, height) * 0.72
        );
        gradient.addColorStop(0, 'rgba(150, 0, 0, 0)');
        gradient.addColorStop(0.72, `rgba(150, 0, 0, ${alpha * 0.35})`);
        gradient.addColorStop(1, `rgba(190, 10, 10, ${alpha})`);
        this.ctx.save();
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
    }

    drawDeathParticles(deathParticles, camera) {
        if (!deathParticles || deathParticles.length === 0) return;

        // DEBUG: Log when we're trying to draw particles
        console.log(`🎨 Drawing ${deathParticles.length} death particles`);

        // Fallback rendering if sprite sheet not loaded
        if (!this.assets.particleBurstImg || !this.assets.particleBurstImg.complete) {
            if (deathParticles.length > 0) {
                console.warn('Particle sprite not loaded, using fallback rendering');
                deathParticles.forEach(particle => {
                    if (particle.type === 'heavenly') {
                        this._drawHeavenlyKillEffect2D(particle, camera);
                        return;
                    }
                    if (particle.type === 'confetti') {
                        this._drawConfettiBurst2D(particle, camera);
                        return;
                    }
                    const screenX = particle.x - camera.x;
                    const screenY = particle.y - camera.y;
                    const radius = 10 + (particle.frame * 2); // Expand over time
                    const alpha = 1 - (particle.frame / 24); // Fade out

                    this.ctx.save();
                    this.ctx.globalAlpha = alpha;
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }
            return;
        }

        const spriteSheet = this.assets.particleBurstImg;
        const frameSize = 64; // Each frame is 64x64 pixels
        const columns = 6;    // 6 columns in the sprite sheet

        deathParticles.forEach(particle => {
            if (particle.type === 'heavenly') {
                this._drawHeavenlyKillEffect2D(particle, camera);
                return;
            }
            if (particle.type === 'confetti') {
                this._drawConfettiBurst2D(particle, camera);
                return;
            }

            // Calculate which frame to show (0-23)
            const frame = Math.min(particle.frame, 23);

            // Calculate row and column in sprite sheet
            const row = Math.floor(frame / columns);
            const col = frame % columns;

            // Source rectangle in sprite sheet
            const sourceX = col * frameSize;
            const sourceY = row * frameSize;

            // Screen position (account for camera)
            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;

            // Draw centered on death position
            this.ctx.drawImage(
                spriteSheet,
                sourceX, sourceY, frameSize, frameSize,
                screenX - frameSize / 2, screenY - frameSize / 2,
                frameSize, frameSize
            );
        });
    }

    _drawHeavenlyKillEffect2D(particle, camera) {
        const progress = Math.min(1, (particle.frame || 0) / Math.max(1, (particle.maxFrames || 10) - 1));
        const screenX = particle.x - camera.x;
        const screenY = particle.y - camera.y - progress * 42;
        const glowRadius = 34 + progress * 30;
        const alpha = 1 - progress;

        this.ctx.save();
        this.ctx.globalAlpha = alpha * 0.95;

        const glow = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowRadius);
        glow.addColorStop(0, 'rgba(255, 252, 225, 1)');
        glow.addColorStop(0.35, 'rgba(255, 232, 145, 0.88)');
        glow.addColorStop(0.65, 'rgba(255, 214, 96, 0.55)');
        glow.addColorStop(1, 'rgba(255, 210, 90, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgba(255, 244, 188, ${0.18 * alpha})`;
        this.ctx.fillRect(screenX - glowRadius * 0.22, screenY - glowRadius * 1.9, glowRadius * 0.44, glowRadius * 2.2);

        this.ctx.strokeStyle = `rgba(255, 245, 205, ${0.8 * alpha})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY - glowRadius * 1.0);
        this.ctx.lineTo(screenX, screenY + glowRadius * 0.45);
        this.ctx.moveTo(screenX - glowRadius * 0.5, screenY - glowRadius * 0.12);
        this.ctx.lineTo(screenX + glowRadius * 0.5, screenY - glowRadius * 0.12);
        this.ctx.stroke();

        for (let i = 0; i < 10; i++) {
            const t = i / 9;
            const sparkleX = screenX + Math.cos((-0.85 + t * 1.7) * Math.PI) * (16 + progress * 18);
            const sparkleY = screenY - 10 - progress * 28 - i * 7;
            const sparkleSize = 2.5 + (1 - t) * 2.8;

            this.ctx.fillStyle = `rgba(255, 232, 136, ${alpha * (0.96 - t * 0.28)})`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = `rgba(255, 250, 225, ${0.95 * alpha})`;
        this.ctx.font = `bold ${Math.round(18 + glowRadius * 0.42)}px Georgia`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✦', screenX, screenY + 8);

        this.ctx.restore();
    }

    _drawConfettiBurst2D(particle, camera) {
        const progress = Math.min(1, (particle.frame || 0) / Math.max(1, (particle.maxFrames || 12) - 1));
        const alpha = 1 - progress;
        const originX = particle.x - camera.x;
        const originY = particle.y - camera.y - progress * 18;
        const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffffff', '#f78c6b'];

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        for (let i = 0; i < 18; i++) {
            const angle = (Math.PI * 2 * i) / 18;
            const burstRadius = 18 + progress * 85 + (i % 3) * 6;
            const pieceX = originX + Math.cos(angle) * burstRadius;
            const pieceY = originY + Math.sin(angle) * (burstRadius * 0.75) + progress * 22;
            const width = 6 + (i % 3);
            const height = 10 + (i % 4);

            this.ctx.save();
            this.ctx.translate(pieceX, pieceY);
            this.ctx.rotate(angle + progress * 6);
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.fillRect(-width / 2, -height / 2, width, height);
            this.ctx.restore();
        }

        this.ctx.restore();
    }
}
