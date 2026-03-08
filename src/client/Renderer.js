class Renderer {
    constructor(canvas, ctx, assets) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.assets = assets;

        // UI constants from centralized UILayout
        const UI = window.UILayout;
        this.QUALITY_LINE_HEIGHT = UI.QUALITY_LINE_HEIGHT;
        this.BUTTON_HEIGHT = UI.BUTTON_HEIGHT;
        this.ANSWER_SECTION_HEIGHT = UI.ANSWER_SECTION_HEIGHT;
        this.BUTTON_WIDTH = UI.BUTTON_WIDTH;
        this.BUTTON_PADDING = UI.BUTTON_PADDING;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawLoadingScreen() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(t('ui.loading'), this.canvas.width / 2 - 50, this.canvas.height / 2);
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake = { x: 0, y: 0 }, damageNumbers = [], deathParticles = [], mouseX = null, mouseY = null) {
        this.clear();

        // Draw game-over modal if visible (overlays everything)
        if (uiState.gameOverModalVisible) {
            this.drawGameOverModal(this.canvas, uiState.finalStats, uiState.restartButtonRect);
            return;  // Don't draw game elements behind modal
        }

        // Draw UI Top Bar (no screen shake)
        this.drawTopBar(uiState);

        // Apply screen shake to game world ONLY
        this.ctx.save();
        if (screenShake && screenShake.duration > 0) {
            this.ctx.translate(screenShake.x, screenShake.y);
        }

        // Draw Walls
        this.drawWalls(walls, camera, gameState.terrainTheme);

        // Draw Players
        this.drawPlayers(gameState.players, player, playerCode, camera, inventoryState);

        // Draw Monsters
        this.drawMonsters(monsters, camera, uiState.explosionTimer);

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

        // Restore context before drawing UI (undo screen shake)
        this.ctx.restore();

        // Draw HUD (Health, Level, etc.)
        this.drawHUD(player, gameState);

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
    }

    drawTopBar(uiState) {
        const { vQuality, menuState } = uiState;

        // Quality Line background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.QUALITY_LINE_HEIGHT);

        // Category indicator (tappable)
        const ci = UILayout.categoryIndicator;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        const displayQuality = (typeof tCategory === 'function') ? tCategory(vQuality) : vQuality;
        const labelText = `${displayQuality} ▼`;
        this.ctx.fillText(labelText, ci.x, ci.y + 16);

        // Learn Verses button (center of top bar)
        this.drawLearnVersesButton();

        // Hamburger Menu Button
        this.drawHamburgerButton(menuState);
    }

    drawLearnVersesButton() {
        const lb = UILayout.learnVersesButton;
        const btnX = (this.canvas.width - lb.width) / 2;
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

        // Text
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t('ui.learnVersesHere'), btnX + btnW / 2, btnY + 14);
        this.ctx.textAlign = 'left';
    }

    drawHamburgerButton(menuState) {
        const hb = UILayout.hamburgerButton;
        const btnX = UILayout.getHamburgerButtonX(this.canvas.width);
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

    drawMenuPanel(menuState) {
        const mp = UILayout.menuPanel;
        const panelX = UILayout.getMenuPanelX(this.canvas.width);
        const panelY = mp.topOffset;
        const panelW = mp.width;
        const itemH = mp.itemHeight;
        const padding = mp.padding;

        const musicState = menuState.musicState || {};
        const isPlaying = musicState.isPlaying;

        const testShieldOn = menuState.verseTestShielded || false;
        const itemCount = 11;

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(panelX, panelY, panelW, itemH * itemCount + padding * (itemCount + 1));
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(panelX, panelY, panelW, itemH * itemCount + padding * (itemCount + 1));

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
            { id: 'shareGame', label: '📤 Share Game', color: '#4CAF50' },
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

        const panelX = UILayout.getCategoryPickerX(this.canvas.width);
        const panelY = UILayout.getCategoryPickerY(this.canvas.height);

        // Overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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

    drawHUD(player, gameState) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        const statsText = t('ui.statsLine', player.health, player.xp, player.level, player.ammo || 0);
        this.ctx.fillText(statsText, 7, this.QUALITY_LINE_HEIGHT - 7);

        // VOTD damage bonus indicator (subtle fire icon after stats)
        if (player.votdDamageBonus) {
            const statsWidth = this.ctx.measureText(statsText).width;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('\uD83D\uDD25', statsWidth + 12, this.QUALITY_LINE_HEIGHT - 7);
        }

        // Game Level
        this.ctx.fillStyle = 'yellow';
        this.ctx.font = 'bold 14px Arial';
        const gameLevelText = `${gameState.gameLevel}`;
        const gameLevelWidth = this.ctx.measureText(gameLevelText).width;
        this.ctx.fillText(gameLevelText, this.canvas.width - gameLevelWidth - 7, 40);
    }

    drawDailyChallenge(canvas, dailyChallengeProgress, dailyChallengeGoal, dailyChallengeCompleted) {
        const x = 10;
        const y = canvas.height - 30;  // Bottom-left corner

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
        const isMultiplayer = !!finalStats.playerStats;

        // Full-screen semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Modal container (centered, taller for multiplayer stats)
        const modalWidth = 300;
        const hasLeaderboard = isMultiplayer && finalStats.playerStats;
        const leaderboardCount = hasLeaderboard ? Object.keys(finalStats.playerStats).length : 0;
        const modalHeight = hasLeaderboard ? 320 + leaderboardCount * 22 : 280;
        const modalX = (canvas.width - modalWidth) / 2;
        const modalY = (canvas.height - modalHeight) / 2;

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
            ctx.fillText(t('ui.victory'), canvas.width / 2, modalY + 45);
        } else if (isDefeat) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText(t('ui.allDefeated'), canvas.width / 2, modalY + 45);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(t('ui.gameOverTitle'), canvas.width / 2, modalY + 45);
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
            ctx.fillText(t('ui.players'), canvas.width / 2, statsY);
            statsY += 20;

            ctx.font = '13px Arial';
            ctx.textAlign = 'left';
            const sorted = Object.values(finalStats.playerStats).sort((a, b) => (b.xp || 0) - (a.xp || 0));
            sorted.forEach((ps, i) => {
                ctx.fillStyle = i === 0 ? '#FFD700' : '#cccccc';
                ctx.fillText(`${i + 1}. ${ps.username} — Lv${ps.level} (${ps.xp || 0} XP)`, statsX, statsY);
                statsY += 20;
            });
        }

        // Button
        const buttonWidth = 160;
        const buttonHeight = 40;
        const buttonX = (canvas.width - buttonWidth) / 2;
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
            buttonLabel = 'Back to Missions';
        } else if (isMultiplayer && !finalStats.isSoloGame) {
            buttonLabel = t('ui.returnToLobby');
        } else {
            buttonLabel = t('ui.tryAgain');
        }
        ctx.fillText(buttonLabel, canvas.width / 2, buttonY + 26);
    }

    drawMessages(uiState) {
        const { gameOverFlag, isAnswerCorrect, levelCompleted, levelAdvanceCountdown } = uiState;

        if (gameOverFlag) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '29px Arial';
            this.ctx.fillText(t('ui.gameOver'), this.canvas.width / 2 - 140, this.canvas.height / 2);
            return;
        }

        if (isAnswerCorrect === true) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '17px Arial';
            this.ctx.fillText(t('ui.correct'), this.canvas.width / 2 - 35, this.canvas.height / 2);

            // Display verse reference below "Correct!" message
            if (typeof lastAnsweredReference !== 'undefined' && lastAnsweredReference) {
                this.ctx.fillStyle = '#90EE90'; // Light green
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(lastAnsweredReference, this.canvas.width / 2, this.canvas.height / 2 + 25);
                this.ctx.textAlign = 'left';
            }
        } else if (isAnswerCorrect === false) {
            this.ctx.fillStyle = 'red';
            this.ctx.font = '17px Arial';
            this.ctx.fillText(t('ui.incorrect'), this.canvas.width / 2 - 35, this.canvas.height / 2);
        }

        if (levelCompleted && levelAdvanceCountdown > 0) {
            // Semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, this.canvas.height / 2 - 50, this.canvas.width, 80);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 26px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(t('ui.levelComplete'), this.canvas.width / 2, this.canvas.height / 2 - 15);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(t('ui.nextLevelIn', levelAdvanceCountdown), this.canvas.width / 2, this.canvas.height / 2 + 15);
            this.ctx.textAlign = 'left';
        }
    }

    drawFrozenIndicator(movementFrozen) {
        if (!movementFrozen) return;

        // Draw a subtle frozen indicator at the bottom of the screen
        const indicatorY = this.canvas.height - 30;

        // Background bar
        this.ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
        this.ctx.fillRect(50, indicatorY - 15, this.canvas.width - 100, 25);

        // Border
        this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, indicatorY - 15, this.canvas.width - 100, 25);

        // Text
        this.ctx.fillStyle = '#88ccff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(t('ui.movementPaused'), this.canvas.width / 2, indicatorY);
        this.ctx.textAlign = 'left';
    }

    drawPlayers(players, currentPlayer, playerCode, camera, inventoryState) {
        // If we have a playerCode but it's not in players yet, draw our local player anyway
        if (playerCode && currentPlayer && currentPlayer.x !== undefined) {
            const isInServerState = Object.keys(players).includes(playerCode);
            if (!isInServerState) {
                this.drawPlayer(currentPlayer, true, camera, inventoryState);
            }
        }

        Object.keys(players).forEach(code => {
            const isMyPlayer = (code === playerCode);
            const playerData = isMyPlayer ? currentPlayer : players[code];

            if (playerData) {
                this.drawPlayer(playerData, isMyPlayer, camera, isMyPlayer ? inventoryState : null);
            }
        });
    }

    drawPlayer(playerData, isCurrentPlayer, camera, inventoryState) {
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

            // Sprite sheet layout: 2x2 grid (96x96 total, 48x48 per frame)
            // Top row (y=0): right-facing frames
            // Bottom row (y=48): left-facing frames (already drawn left-facing)
            const sourceY = (facingDirection === 'right') ? 0 : 48;
            const sourceX = frameIndex * 48;  // 0 or 48

            this.ctx.drawImage(
                playerImage,
                sourceX, sourceY, 48, 48,
                screenX - playerData.width / 2, screenY - playerData.height / 2,
                playerData.width, playerData.height
            );

            // Ghost label + skip health bar
            if (isGhost) {
                this.ctx.restore();
                this.ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(t('ui.ghost'), screenX, screenY - playerData.height / 2 - 18);
                // Name below ghost label
                const displayName = isCurrentPlayer ? 'You' : (playerData.username || 'Player');
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
                const displayName = playerData.username || 'Player';
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
            const displayName = isCurrentPlayer ? 'You' : (playerData.username || 'Player');
            this.ctx.fillText(displayName, screenX - 20, screenY - playerData.height / 2 - 15);
        }
    }

    drawMonsters(monsters, camera, explosionTimer) {
        const playableTop = this.QUALITY_LINE_HEIGHT + this.BUTTON_HEIGHT;
        const playableBottom = this.canvas.height - this.ANSWER_SECTION_HEIGHT;

        monsters.forEach(monster => {
            const demonType = monster.demonType;
            const demonImage = this.assets.demonImages[demonType];

            const screenX = monster.x - camera.x;
            const screenY = monster.y - camera.y;

            // Visibility check
            if (screenY - monster.height / 2 < playableTop || screenY + monster.height / 2 > playableBottom) return;
            if (screenX + monster.width / 2 < 0 || screenX - monster.width / 2 > this.canvas.width) return;

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
                this.ctx.drawImage(demonImage, screenX - monster.width / 2, screenY - monster.height / 2);
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

            // White flash on hit
            if (monster.isAttacked) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(
                    screenX - monster.width / 2,
                    screenY - monster.height / 2,
                    monster.width,
                    monster.height
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
        });
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

    drawWalls(walls, camera, terrainTheme) {
        if (!walls || walls.length === 0) return;

        // Building tiles from 4x4 grid (15 usable, excluding index 6 - doesn't fit)
        // Grid layout: Row 0: 0,1,2,3  Row 1: 4,5,6,7  Row 2: 8,9,10,11  Row 3: 12,13,14,15
        const buildingTiles = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        // ONE consistent grass tile (from 8x8 terrain sheet)
        const grassTile = 0;

        // Fallback color themes (used if sprite sheet not loaded)
        const themes = {
            stone: ['#4a4a4a', '#3d3d3d', '#555555', '#424242'],
            earth: ['#5c4033', '#4a3328', '#6b4c3b', '#503a2d'],
            crystal: ['#5b3a6b', '#4d2d5e', '#6b4a7b', '#553465']
        };
        const palette = themes[terrainTheme] || themes.stone;

        const useTiles = this.assets.buildingTilesImg && this.assets.buildingTilesImg.complete &&
            this.assets.terrainTilesImg && this.assets.terrainTilesImg.complete;

        this.ctx.save();
        const playableTop = this.QUALITY_LINE_HEIGHT + this.BUTTON_HEIGHT;
        const playableBottom = this.canvas.height - this.ANSWER_SECTION_HEIGHT - 120;

        this.ctx.beginPath();
        this.ctx.rect(0, playableTop, this.canvas.width, playableBottom - playableTop);
        this.ctx.clip();

        if (useTiles) {
            // TWO-PASS RENDERING to prevent grass from covering buildings

            // PASS 1: Draw ALL grass tiles first
            walls.forEach(wall => {
                const screenX = wall.x - camera.x;
                const screenY = wall.y - camera.y;

                if (screenX + wall.width > 0 && screenX < this.canvas.width &&
                    screenY + wall.height > 0 && screenY < this.canvas.height) {

                    // Draw grass background (8x8 grid, 32x32 tiles)
                    this.drawTileFromSheet(
                        this.assets.terrainTilesImg,
                        grassTile,
                        screenX,
                        screenY,
                        wall.width,
                        wall.height,
                        8,  // gridSize: 8x8 grid
                        32  // tileSize: 32x32 tiles
                    );

                    // Add subtle hue variation to grass for visual interest
                    // Use deterministic random based on position
                    let hash = wall.x * 73856093 + wall.y * 19349663;
                    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
                    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
                    hash = (hash >> 16) ^ hash;
                    const random = Math.abs(hash % 100) / 100;

                    // Apply visible tint using overlay mode (better for grass)
                    this.ctx.save();
                    this.ctx.globalCompositeOperation = 'overlay';
                    this.ctx.globalAlpha = 0.15 + random * 0.1; // 15-25% opacity for testing

                    // Vary between darker and lighter greens
                    const hueValue = random;
                    if (hueValue < 0.33) {
                        // Darker green
                        this.ctx.fillStyle = '#2d5016';
                    } else if (hueValue < 0.66) {
                        // Lighter/yellower green
                        this.ctx.fillStyle = '#d4ff88';
                    } else {
                        // Medium green
                        this.ctx.fillStyle = '#7fb347';
                    }

                    this.ctx.fillRect(screenX, screenY, wall.width, wall.height);
                    this.ctx.restore();
                }
            });

            // Helper: Check if a 100x100 building centered at (x,y) would stay fully on walls
            const isSafeForBuilding = (x, y, wallsList) => {
                // Building is 100x100, centered on this cell
                // Check if all 4 cardinal directions have walls within building bounds
                const buildingHalfSize = 50; // Building extends 50px in each direction

                // Create a set of wall positions for fast lookup
                const wallSet = new Set();
                wallsList.forEach(w => {
                    wallSet.add(`${w.x},${w.y}`);
                });

                // Check in all 4 cardinal directions at 2-cell intervals
                // Ensure walls exist in all directions within building footprint
                const directions = [
                    { dx: -50, dy: 0 },   // Left
                    { dx: 50, dy: 0 },    // Right
                    { dx: 0, dy: -50 },   // Up
                    { dx: 0, dy: 50 }     // Down
                ];

                for (const dir of directions) {
                    const checkX = x + dir.dx;
                    const checkY = y + dir.dy;

                    // Look for wall within ±25px of check point
                    let foundWall = false;
                    for (let offsetX = -25; offsetX <= 25; offsetX += 25) {
                        for (let offsetY = -25; offsetY <= 25; offsetY += 25) {
                            if (wallSet.has(`${checkX + offsetX},${checkY + offsetY}`)) {
                                foundWall = true;
                                break;
                            }
                        }
                        if (foundWall) break;
                    }

                    if (!foundWall) return false; // Missing wall in this direction
                }

                return true; // All directions have walls
            };

            // PASS 2: Draw buildings on top (so grass doesn't overwrite them)
            walls.forEach(wall => {
                const screenX = wall.x - camera.x;
                const screenY = wall.y - camera.y;

                if (screenX + wall.width > 0 && screenX < this.canvas.width &&
                    screenY + wall.height > 0 && screenY < this.canvas.height) {

                    // Deterministic random based on wall position
                    // Use better hash mixing for even distribution
                    let hash = wall.x * 73856093 + wall.y * 19349663;
                    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
                    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
                    hash = (hash >> 16) ^ hash;
                    const random = Math.abs(hash % 10000) / 10000;

                    // 2% chance for building (sweet spot density)
                    // Only place on walls where entire 100x100 building stays on grass
                    if (random < 0.02 && isSafeForBuilding(wall.x, wall.y, walls)) {
                        // Use all 16 building types with better distribution
                        const buildingIndex = Math.abs(hash) % buildingTiles.length;
                        const tileIndex = buildingTiles[buildingIndex];

                        // Draw building at 100x100 size centered on the cell
                        const buildingSize = 100;
                        const offsetX = screenX - (buildingSize - wall.width) / 2;
                        const offsetY = screenY - (buildingSize - wall.height) / 2;

                        // Building sheet: 4x4 grid, 100x100 tiles
                        this.drawTileFromSheet(
                            this.assets.buildingTilesImg,
                            tileIndex,
                            offsetX,
                            offsetY,
                            buildingSize,
                            buildingSize,
                            4,    // gridSize: 4x4 grid
                            100   // tileSize: 100x100 tiles
                        );
                    }
                }
            });
        } else {
            // Fallback: gradient rendering (single pass)
            walls.forEach(wall => {
                const screenX = wall.x - camera.x;
                const screenY = wall.y - camera.y;

                if (screenX + wall.width > 0 && screenX < this.canvas.width &&
                    screenY + wall.height > 0 && screenY < this.canvas.height) {

                    const baseColor = palette[wall.type || 0];

                    // Create vertical gradient (lighter at top, darker at bottom) for 3D effect
                    const gradient = this.ctx.createLinearGradient(
                        screenX, screenY,
                        screenX, screenY + wall.height
                    );
                    gradient.addColorStop(0, this.lightenColor(baseColor, 20));
                    gradient.addColorStop(1, this.darkenColor(baseColor, 20));

                    // Fill with gradient
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(screenX, screenY, wall.width, wall.height);

                    // Add dark border for depth
                    this.ctx.strokeStyle = this.darkenColor(baseColor, 40);
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(screenX, screenY, wall.width, wall.height);

                    // Add highlight on top edge for extra depth
                    this.ctx.strokeStyle = this.lightenColor(baseColor, 30);
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX, screenY);
                    this.ctx.lineTo(screenX + wall.width, screenY);
                    this.ctx.stroke();
                }
            });
        }

        this.ctx.restore();
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
            if (screenX + item.width / 2 < 0 || screenX - item.width / 2 > this.canvas.width ||
                screenY + item.height / 2 < 0 || screenY - item.height / 2 > this.canvas.height) return;

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
        const btnX = UILayout.getVerseTestButtonX(this.canvas.width);
        const btnY = UILayout.getVerseTestButtonY(this.canvas.height);
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
            if (screenX + 10 > 0 && screenX - 10 < this.canvas.width &&
                screenY + 10 > 0 && screenY - 10 < this.canvas.height) {

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

        const leftPadding = 14;
        const rightPadding = 7;
        const maxWidth = this.canvas.width - leftPadding - rightPadding;
        const maxLines = 5;
        const lineHeight = 22;

        this.ctx.font = 'bold 16px Arial';

        let lines = [];
        let words = verseText.split(' ');
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
            const y = this.canvas.height - 118 + i * lineHeight;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(lines[i], leftPadding, y);
        }

        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(verseReference, leftPadding, this.canvas.height - 118 + lines.length * lineHeight);

        if (quiz) {
            this.displayQuizOptions(quiz);
        }
    }

    displayClozeOptions(quiz, verseLineCount) {
        const qo = UILayout.quizOptions;
        const leftPadding = qo.startX;
        const rightPadding = qo.rightPadding || 7;
        const canvasWidth = this.canvas.width;

        // Layout from bottom up: buttons (24px) + gap (6px) + text area above
        const letterBtnHeight = 24;
        const letterBtnWidth = 44;
        const letterBtnSpacing = 5;
        const letterY = this.canvas.height - letterBtnHeight - 6;
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
                this.ctx.fillText('✓ Correct!', leftPadding, textY + 4);

                // Display verse reference after "Correct!" for cloze quiz
                if (typeof lastAnsweredReference !== 'undefined' && lastAnsweredReference) {
                    this.ctx.fillStyle = '#90EE90';
                    this.ctx.font = '13px Arial';
                    this.ctx.fillText(lastAnsweredReference, leftPadding, textY + 22);
                }
            } else {
                this.ctx.fillText('✗ Answer: ' + quiz.answers.join(', '), leftPadding, textY + 4);
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

    displayQuizOptions(quiz) {
        const qo = UILayout.quizOptions;
        const buttonHeight = qo.height;
        const buttonSpacing = qo.spacing;
        const optionStartX = qo.startX;
        const rightPadding = qo.rightPadding || 7;
        const buttonY = UILayout.getQuizButtonY(this.canvas.height);
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
        const maxLabelWidth = this.canvas.width - optionStartX - rightPadding - totalButtonWidth - 14;

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

        const playableTop = this.QUALITY_LINE_HEIGHT + this.BUTTON_HEIGHT;
        const playableBottom = this.canvas.height - this.ANSWER_SECTION_HEIGHT;

        // Check if cursor is over any monster
        for (const monster of monsters) {
            const screenX = monster.x - camera.x;
            const screenY = monster.y - camera.y;

            // Visibility check
            if (screenY - monster.height / 2 < playableTop || screenY + monster.height / 2 > playableBottom) continue;
            if (screenX + monster.width / 2 < 0 || screenX - monster.width / 2 > this.canvas.width) continue;

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
                if (tooltipX + textWidth > this.canvas.width - 5) tooltipX = this.canvas.width - textWidth - 5;
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
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Full-screen semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Modal container (centered)
        const modalWidth = 280;
        const modalHeight = 200;
        const modalX = (canvas.width - modalWidth) / 2;
        const modalY = (canvas.height - modalHeight) / 2;

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
        ctx.fillText('Goals', canvas.width / 2, modalY + 28);

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
            ctx.fillText('✓ Daily Challenge Complete!', modalX + 15, dcY);
        } else {
            ctx.fillText(`Daily: ${dcProgress}/${dcGoal} First Letter quizzes`, modalX + 15, dcY);
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
        const vt = uiState.totalVerses || 1618;

        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText(`Verses Learned: ${vl} / ${vt}`, modalX + 15, vlY);

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
        ctx.fillText('Tap anywhere to close', canvas.width / 2, modalY + modalHeight - 12);

        // Reset text align
        ctx.textAlign = 'left';
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

            const y = canvas.height / 2 - 60 + yOffset;

            // Shadow
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
            ctx.fillText(msg.text, canvas.width / 2 + 1, y + 1);

            // Text
            ctx.fillStyle = msg.color.replace(')', `, ${alpha})`).replace('rgb(', 'rgba(');
            // Handle hex colors too
            if (msg.color.startsWith('#')) {
                const r = parseInt(msg.color.slice(1, 3), 16);
                const g = parseInt(msg.color.slice(3, 5), 16);
                const b = parseInt(msg.color.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            ctx.fillText(msg.text, canvas.width / 2, y);

            yOffset += 24;
        });

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

    drawDeathParticles(deathParticles, camera) {
        if (!deathParticles || deathParticles.length === 0) return;

        // DEBUG: Log when we're trying to draw particles
        console.log(`🎨 Drawing ${deathParticles.length} death particles`);

        // Fallback rendering if sprite sheet not loaded
        if (!this.assets.particleBurstImg || !this.assets.particleBurstImg.complete) {
            if (deathParticles.length > 0) {
                console.warn('Particle sprite not loaded, using fallback rendering');
                // Draw simple expanding red circles as fallback
                deathParticles.forEach(particle => {
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
}
