class Renderer {
    constructor(canvas, ctx, assets) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.assets = assets;

        // Constants (should ideally come from shared Constants, but redundant here for now or passed in)
        this.QUALITY_LINE_HEIGHT = 45;
        this.BUTTON_HEIGHT = 21;
        this.ANSWER_SECTION_HEIGHT = 17;
        this.BUTTON_WIDTH = 84;
        this.BUTTON_PADDING = 4;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawLoadingScreen() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Loading...', this.canvas.width / 2 - 50, this.canvas.height / 2);
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState) {
        this.clear();

        // Draw UI Top Bar
        this.drawTopBar(uiState);

        // Draw Walls
        this.drawWalls(gameState.walls, camera);

        // Draw Players
        this.drawPlayers(gameState.players, player, playerCode, camera);

        // Draw Monsters
        this.drawMonsters(monsters, camera, uiState.explosionTimer);

        // Draw Healing Points
        this.drawHealingPoints(healingPoints, camera);

        // Draw HUD (Health, Level, etc.)
        this.drawHUD(player, gameState, uiState.lastAttackedMonster);

        // Draw Level/Game Messages
        this.drawMessages(uiState);

        // Draw Bible Verse / Bottom UI
        if (uiState.currentVerse) {
            this.displayBibleVerse(uiState.currentVerse.text, uiState.currentVerse.reference, uiState.quiz);
        }
    }

    drawTopBar(uiState) {
        const { vQuality, qualityButtons } = uiState;

        // Quality Line
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.QUALITY_LINE_HEIGHT);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Quality: ${vQuality}`, 7, 22);

        // Review Button
        this.drawReviewButton();

        // Quality Buttons
        const buttonStartX = this.canvas.width - (qualityButtons.length * (this.BUTTON_WIDTH + 7)) - 7 + 8;
        qualityButtons.forEach((button, index) => {
            const buttonX = buttonStartX + index * (this.BUTTON_WIDTH + 7);
            this.ctx.fillStyle = button.color;
            this.ctx.fillRect(buttonX, 5, this.BUTTON_WIDTH, this.BUTTON_HEIGHT);

            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillText(button.text, buttonX + this.BUTTON_PADDING, 5 + this.BUTTON_HEIGHT - this.BUTTON_PADDING);
        });
    }

    drawReviewButton() {
        const reviewButtonWidth = 60;
        const reviewButtonHeight = 13;
        const reviewButtonX = this.canvas.width - reviewButtonWidth - 20;
        const reviewButtonY = 29;

        this.ctx.fillStyle = 'gray'; // Button color
        this.ctx.fillRect(reviewButtonX, reviewButtonY, reviewButtonWidth, reviewButtonHeight);

        this.ctx.fillStyle = 'white'; // Text color
        this.ctx.font = '10px Arial';
        this.ctx.fillText('Review', reviewButtonX + 5, reviewButtonY + 10);
    }

    drawHUD(player, gameState, lastAttackedMonster) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`, 7, this.QUALITY_LINE_HEIGHT - 7);

        if (lastAttackedMonster && lastAttackedMonster.health > 0) {
            const enemyText = `Enemy: ${lastAttackedMonster.demonType} ${lastAttackedMonster.health}`;
            this.ctx.fillText(enemyText, this.ctx.measureText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`).width + 14, this.QUALITY_LINE_HEIGHT - 7);
        }

        // Game Level
        this.ctx.fillStyle = 'yellow';
        this.ctx.font = 'bold 14px Arial';
        const gameLevelText = `${gameState.gameLevel}`;
        const gameLevelWidth = this.ctx.measureText(gameLevelText).width;
        this.ctx.fillText(gameLevelText, this.canvas.width - gameLevelWidth - 7, 40);
    }

    drawMessages(uiState) {
        const { gameOverFlag, isAnswerCorrect, levelCompleted } = uiState;

        if (gameOverFlag) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '29px Arial';
            this.ctx.fillText('G A M E   O V E R', this.canvas.width / 2 - 140, this.canvas.height / 2);
            return;
        }

        if (isAnswerCorrect === true) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '17px Arial';
            this.ctx.fillText('Correct!', this.canvas.width / 2 - 35, this.canvas.height / 2);
        } else if (isAnswerCorrect === false) {
            this.ctx.fillStyle = 'red';
            this.ctx.font = '17px Arial';
            this.ctx.fillText('Incorrect!', this.canvas.width / 2 - 35, this.canvas.height / 2);
        }

        if (levelCompleted) {
            this.ctx.fillStyle = 'green';
            this.ctx.font = '29px Arial';
            this.ctx.fillText('Level completed!', this.canvas.width / 2 - 140, this.canvas.height / 2);
        }
    }

    drawPlayers(players, currentPlayer, playerCode, camera) {
        console.log('drawPlayers - playerCode:', playerCode, 'players keys:', Object.keys(players), 'currentPlayer:', currentPlayer ? { x: currentPlayer.x, y: currentPlayer.y, width: currentPlayer.width } : 'null');

        // If we have a playerCode but it's not in players yet, draw our local player anyway
        if (playerCode && currentPlayer && currentPlayer.x !== undefined) {
            const isInServerState = Object.keys(players).includes(playerCode);
            if (!isInServerState) {
                console.log('Drawing local player only (not in server state yet)');
                this.drawPlayer(currentPlayer, true, camera);
            }
        }

        Object.keys(players).forEach(code => {
            const isMyPlayer = (code === playerCode);
            // Use local player object if it's me (for predicted movement), otherwise server state
            const playerData = isMyPlayer ? currentPlayer : players[code];
            console.log('Drawing player:', code, 'isMe:', isMyPlayer, 'hasData:', !!playerData);

            if (playerData) {
                this.drawPlayer(playerData, isMyPlayer, camera);
            }
        });
    }

    drawPlayer(playerData, isCurrentPlayer, camera) {
        const playerImage = isCurrentPlayer ? this.assets.playerImg : this.assets.otherPlayerImg;

        console.log('drawPlayer - isCurrentPlayer:', isCurrentPlayer, 'hasImage:', !!playerImage, 'complete:', playerImage?.complete, 'playerData:', playerData ? { x: playerData.x, y: playerData.y, width: playerData.width, height: playerData.height } : null);

        if (playerImage && playerImage.complete) {
            const screenX = playerData.x - camera.x;
            const screenY = playerData.y - camera.y;

            console.log('Drawing at screen pos:', screenX, screenY);

            this.ctx.drawImage(playerImage, screenX - playerData.width / 2, screenY - playerData.height / 2);

            // Health bar
            const healthBarWidth = (playerData.health / playerData.maxHealth) * 40;
            const healthBarColor = isCurrentPlayer ? 'green' : 'blue';

            this.ctx.fillStyle = healthBarColor;
            this.ctx.fillRect(screenX - 20, screenY - playerData.height / 2 - 10, healthBarWidth, 5);

            // Name
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            const displayName = isCurrentPlayer ? 'You' : 'Player';
            this.ctx.fillText(displayName, screenX - 20, screenY - playerData.height / 2 - 15);
        } else {
            console.warn('Player image not loaded or incomplete!');
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

            if (demonImage && demonImage.complete) {
                this.ctx.drawImage(demonImage, screenX - monster.width / 2, screenY - monster.height / 2);
            }

            // Explosion
            if (monster.isAttacked && Math.floor(explosionTimer / 100) % 2 === 0) {
                const explosionImg = this.assets.explosionImg;
                if (explosionImg)
                    this.ctx.drawImage(explosionImg, screenX - explosionImg.width / 2, screenY - explosionImg.height / 2);
            }

            // Health bar
            const healthBarWidth = (monster.health / 10) * monster.width;
            this.ctx.fillStyle = monster.healthBar.color;
            this.ctx.fillRect(screenX - monster.width / 2, screenY - monster.height / 2 - 10, healthBarWidth, 7);

            if (monster.showHealth) {
                this.ctx.font = '11px Arial';
                this.ctx.fillStyle = 'black';
                this.ctx.fillText(`${monster.health}`, screenX, screenY - 14); // Use screenX/Y not monster.x/y
            }
        });
    }

    drawWalls(walls, camera) {
        if (!walls) return;

        this.ctx.save();
        const playableTop = this.QUALITY_LINE_HEIGHT + this.BUTTON_HEIGHT;
        const playableBottom = this.canvas.height - this.ANSWER_SECTION_HEIGHT - 120;

        this.ctx.beginPath();
        this.ctx.rect(0, playableTop, this.canvas.width, playableBottom - playableTop);
        this.ctx.clip();

        this.ctx.fillStyle = '#333333';
        walls.forEach(wall => {
            const screenX = wall.x - camera.x;
            const screenY = wall.y - camera.y;

            if (screenX + wall.width > 0 && screenX < this.canvas.width &&
                screenY + wall.height > 0 && screenY < this.canvas.height) {
                this.ctx.fillRect(screenX, screenY, wall.width, wall.height);
                this.ctx.strokeStyle = '#555555';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(screenX, screenY, wall.width, wall.height);
            }
        });
        this.ctx.restore();
    }

    drawHealingPoints(healingPoints, camera) {
        healingPoints.forEach(hp => {
            if (this.assets.healingPointImg) {
                const screenX = hp.x - camera.x;
                const screenY = hp.y - camera.y;
                this.ctx.drawImage(this.assets.healingPointImg, screenX - hp.width / 2, screenY - hp.height / 2);
            }
        });
    }

    displayBibleVerse(verseText, verseReference, quizData) {
        const maxCharsPerLine = 60;
        const maxLines = 5;
        const lineHeight = 21;
        let lines = [];
        let currentLine = '';

        for (let i = 0; i < verseText.length; i++) {
            const char = verseText[i];
            if (char === ' ' && currentLine.length >= maxCharsPerLine) {
                lines.push(currentLine.trim());
                currentLine = '';
            } else {
                currentLine += char;
            }
            if (i === verseText.length - 1 && currentLine.trim().length > 0) {
                lines.push(currentLine.trim());
            }
        }
        lines = lines.slice(0, maxLines);

        for (let i = 0; i < lines.length; i++) {
            const y = this.canvas.height - 112 + i * lineHeight;
            this.ctx.fillStyle = 'black';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(lines[i], 7, y);
        }

        this.ctx.fillStyle = 'black';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(verseReference, 7, this.canvas.height - 112 + lines.length * lineHeight);

        if (quizData) {
            this.displayMultipleChoiceOptions(quizData.firstLetters, quizData.mcOptions);
        }
    }

    displayMultipleChoiceOptions(firstLetters, options) {
        const buttonWidth = 49;
        const buttonHeight = 21;
        const buttonSpacing = 7;
        const optionStartX = 7;
        const optionStartY = this.canvas.height - 7;

        this.ctx.fillStyle = 'black';
        this.ctx.font = '11px Arial';
        this.ctx.fillText('First letters of missing words are:', optionStartX, optionStartY);

        const textWidth = this.ctx.measureText('First letters of missing words are:').width;
        for (let i = 0; i < options.length; i++) {
            const buttonX = optionStartX + textWidth + 14 + i * (buttonWidth + buttonSpacing);
            const buttonY = optionStartY - 16;

            this.ctx.fillStyle = 'lightgray';
            this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

            this.ctx.fillStyle = 'black';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(options[i], buttonX + 14, buttonY + 15);
        }
    }
}
