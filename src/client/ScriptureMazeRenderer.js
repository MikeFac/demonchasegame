class ScriptureMazeRenderer {
    constructor(canvas, ctx, demonImages, options) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.demonImages = demonImages || {};
        this.options = options || {};
        this.controlRects = {};
        this.promptOptionRects = [];
        this.playerImage = null;

        if (this.options.playerSpriteUrl) {
            this.playerImage = new Image();
            this.playerImage.src = this.options.playerSpriteUrl;
        }
    }

    render(state) {
        if (!state) return;
        var canvas = this.canvas;
        var displayWidth = canvas.clientWidth || canvas.width;
        var displayHeight = canvas.clientHeight || canvas.height;
        if (canvas.width !== displayWidth) canvas.width = displayWidth;
        if (canvas.height !== displayHeight) canvas.height = displayHeight;
        var ctx = this.ctx || canvas.getContext('2d');
        if (!ctx) return;
        this.ctx = ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#071019';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var viewport = this._getViewport(state);

        ctx.save();
        ctx.translate(viewport.offsetX, viewport.offsetY);
        ctx.scale(viewport.scale, viewport.scale);
        this._drawBoard(state);
        this._drawPromptNode(state.promptNode, state.tileSize);
        this._drawDemons(state.demons, state.poweredUp);
        this._drawPlayer(state.player, state.poweredUp);
        ctx.restore();

        this._drawHud(state);
        this._drawFooterHint(state);
        if (state.prompt) {
            this._drawPromptOverlay(state.prompt);
        }
        if (state.status !== 'playing') {
            this._drawEndOverlay(state);
        }
    }

    _drawBoard(state) {
        var ctx = this.ctx;
        var tileSize = state.tileSize;
        for (var row = 0; row < state.layout.length; row++) {
            for (var col = 0; col < state.layout[row].length; col++) {
                var tile = state.layout[row][col];
                var x = col * tileSize;
                var y = row * tileSize;
                if (tile === '#') {
                    ctx.fillStyle = '#173246';
                    ctx.fillRect(x, y, tileSize, tileSize);
                    ctx.strokeStyle = '#2f5f80';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
                } else {
                    ctx.fillStyle = '#102130';
                    ctx.fillRect(x, y, tileSize, tileSize);
                    if ((row + col) % 2 === 0) {
                        ctx.fillStyle = 'rgba(255,255,255,0.02)';
                        ctx.fillRect(x, y, tileSize, tileSize);
                    }
                }
            }
        }
    }

    _drawPromptNode(promptNode, tileSize) {
        if (!promptNode) return;
        var ctx = this.ctx;
        var pulse = 1 + Math.sin(promptNode.pulse || 0) * 0.14;
        ctx.save();
        ctx.translate(promptNode.x, promptNode.y);
        ctx.shadowColor = '#f7d56d';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#f2be42';
        ctx.beginPath();
        ctx.roundRect(-tileSize * 0.24 * pulse, -tileSize * 0.24 * pulse, tileSize * 0.48 * pulse, tileSize * 0.48 * pulse, 8);
        ctx.fill();
        ctx.fillStyle = '#fff8d8';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2L', 0, 1);
        ctx.restore();
    }

    _drawPlayer(player, poweredUp) {
        if (!player || !player.alive) return;
        var ctx = this.ctx;
        ctx.save();
        ctx.translate(player.x, player.y);

        if (poweredUp) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#ffd85e';
            ctx.beginPath();
            ctx.arc(0, 0, player.width * 0.72, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.playerImage && this.playerImage.complete) {
            var frameIndex = player.currentFrame || 0;
            var facingDirection = player.facing === 'left' ? 'left' : 'right';
            var sourceY = facingDirection === 'right' ? 0 : 48;
            var sourceX = frameIndex * 48;
            ctx.drawImage(
                this.playerImage,
                sourceX, sourceY, 48, 48,
                -player.width / 2, -player.height / 2,
                player.width, player.height
            );
        } else {
            ctx.fillStyle = '#f5e7bf';
            ctx.beginPath();
            ctx.arc(0, -player.height * 0.18, player.width * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = poweredUp ? '#f4d35e' : '#83b6ff';
            ctx.beginPath();
            ctx.roundRect(-player.width * 0.2, -player.height * 0.02, player.width * 0.4, player.height * 0.42, 6);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawDemons(demons, poweredUp) {
        if (!demons) return;
        var ctx = this.ctx;
        for (var i = 0; i < demons.length; i++) {
            var demon = demons[i];
            if (!demon.active) continue;
            var image = this.demonImages[demon.demonType];
            ctx.save();
            if (poweredUp) {
                ctx.shadowBlur = 14;
                ctx.shadowColor = '#9fe7ff';
                ctx.globalAlpha = 0.82;
            }
            if (image && image.complete) {
                ctx.drawImage(image, demon.x - demon.radius, demon.y - demon.radius, demon.radius * 2, demon.radius * 2);
            } else {
                ctx.fillStyle = poweredUp ? '#86d4ff' : (i % 2 === 0 ? '#ff6b6b' : '#8fd3ff');
                ctx.beginPath();
                ctx.arc(demon.x, demon.y, demon.radius, Math.PI, 0);
                ctx.lineTo(demon.x + demon.radius, demon.y + demon.radius * 0.8);
                ctx.lineTo(demon.x + demon.radius * 0.4, demon.y + demon.radius * 0.45);
                ctx.lineTo(demon.x, demon.y + demon.radius * 0.8);
                ctx.lineTo(demon.x - demon.radius * 0.4, demon.y + demon.radius * 0.45);
                ctx.lineTo(demon.x - demon.radius, demon.y + demon.radius * 0.8);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }

    _drawHud(state) {
        var ctx = this.ctx;
        ctx.fillStyle = 'rgba(3, 12, 18, 0.88)';
        ctx.fillRect(12, 12, this.canvas.width - 24, 82);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(state.missionName || 'Faith Run', 24, 38);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#c6d6df';
        ctx.fillText('Eat: ' + state.progress + ' / ' + state.target, 24, 62);
        ctx.fillText('Score: ' + state.score, 132, 62);
        ctx.fillText(state.poweredUp ? ('Eat mode: ' + (state.powerModeMsLeft / 1000).toFixed(1) + 's') : 'Eat mode: ready at next rune', 240, 62);

        ctx.fillStyle = state.poweredUp ? '#ffe27a' : '#9dd4ff';
        ctx.fillText(state.message || '', 24, 82);
    }

    _drawFooterHint(state) {
        if (state.status !== 'playing' || state.prompt) return;
        var ctx = this.ctx;
        ctx.fillStyle = 'rgba(3, 12, 18, 0.82)';
        ctx.fillRect(12, this.canvas.height - 42, this.canvas.width - 24, 30);
        ctx.fillStyle = '#d8e7ef';
        ctx.font = '13px Arial';
        ctx.fillText('Click any reachable floor tile to move there. Touch a 2L rune to unlock eat mode.', 24, this.canvas.height - 22);
    }

    _drawPromptOverlay(prompt) {
        var ctx = this.ctx;
        var width = Math.min(640, this.canvas.width - 40);
        var height = 240;
        var x = (this.canvas.width - width) / 2;
        var y = (this.canvas.height - height) / 2;
        this.promptOptionRects = [];

        ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#12283a';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#f4c84c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(prompt.questionLabel || '2-letter test', x + 20, y + 32);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#d8e6ee';
        this._drawWrappedText(prompt.verseText, x + 20, y + 60, width - 40, 20);
        ctx.fillStyle = '#9ec3da';
        ctx.fillText(prompt.reference || '', x + 20, y + 122);
        ctx.fillStyle = '#f6d36b';
        ctx.fillText('Letter ' + ((prompt.currentIndex || 0) + 1) + ' of 2', x + 20, y + 144);

        var cols = 2;
        var optionW = Math.floor((width - 60) / 2);
        var optionH = 36;
        var optionStartY = y + 156;
        for (var i = 0; i < prompt.options.length; i++) {
            var row = Math.floor(i / cols);
            var col = i % cols;
            var rect = {
                x: x + 20 + col * (optionW + 20),
                y: optionStartY + row * (optionH + 14),
                w: optionW,
                h: optionH,
                index: i
            };
            this.promptOptionRects.push(rect);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.beginPath();
            ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(244,200,76,0.55)';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1) + '. ' + prompt.options[i], rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    _drawEndOverlay(state) {
        var ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.68)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = state.status === 'victory' ? '#6cf39a' : '#ff7a7a';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(state.status === 'victory' ? 'Mission Complete' : 'Caught', this.canvas.width / 2, this.canvas.height / 2 - 20);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Press Enter or click to return to Missions', this.canvas.width / 2, this.canvas.height / 2 + 22);
        ctx.textAlign = 'left';
        this.controlRects.finish = {
            x: (this.canvas.width / 2) - 180,
            y: (this.canvas.height / 2) + 36,
            w: 360,
            h: 46
        };
    }

    _drawWrappedText(text, x, y, maxWidth, lineHeight) {
        var ctx = this.ctx;
        var words = String(text || '').split(/\s+/);
        var line = '';
        var drawY = y;
        for (var i = 0; i < words.length; i++) {
            var testLine = line ? (line + ' ' + words[i]) : words[i];
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, drawY);
                line = words[i];
                drawY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) ctx.fillText(line, x, drawY);
    }

    getInputActionAtPoint(x, y, state) {
        if (state && state.prompt && this.promptOptionRects.length) {
            for (var i = 0; i < this.promptOptionRects.length; i++) {
                var option = this.promptOptionRects[i];
                if (this._pointInRect(x, y, option)) {
                    return { type: 'answer', index: option.index };
                }
            }
            return null;
        }

        if (state && state.status !== 'playing' && this.controlRects.finish && this._pointInRect(x, y, this.controlRects.finish)) {
            return { type: 'finish' };
        }

        if (!state || state.status !== 'playing') return null;
        if (y <= 96 || y >= this.canvas.height - 48) return null;

        var worldPoint = this.canvasToWorld(state, x, y);
        if (!worldPoint) return null;
        var tile = {
            col: Math.floor(worldPoint.x / state.tileSize),
            row: Math.floor(worldPoint.y / state.tileSize)
        };
        if (!state.layout[tile.row] || !state.layout[tile.row][tile.col] || state.layout[tile.row][tile.col] === '#') return null;
        return { type: 'moveTo', col: tile.col, row: tile.row };
    }

    worldToCanvas(state, x, y) {
        var viewport = this._getViewport(state);
        return {
            x: viewport.offsetX + x * viewport.scale,
            y: viewport.offsetY + y * viewport.scale
        };
    }

    canvasToWorld(state, x, y) {
        var viewport = this._getViewport(state);
        var worldX = (x - viewport.offsetX) / viewport.scale;
        var worldY = (y - viewport.offsetY) / viewport.scale;
        if (worldX < 0 || worldY < 0 || worldX > state.width || worldY > state.height) return null;
        return { x: worldX, y: worldY };
    }

    _getViewport(state) {
        var scale = Math.min(this.canvas.width / state.width, this.canvas.height / state.height);
        return {
            scale: scale,
            offsetX: (this.canvas.width - state.width * scale) / 2,
            offsetY: (this.canvas.height - state.height * scale) / 2
        };
    }

    _pointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }
}

window.ScriptureMazeRenderer = ScriptureMazeRenderer;
