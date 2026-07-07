(function () {
    'use strict';

    /**
     * StoryMissionRenderer - Renders story mission phases.
     *
     * For story phases (dialogue, collect, puzzle): draws NPC portrait, dialogue,
     * objective HUD, and puzzle UI directly.
     *
     * For combat phases: draws a combat indicator overlay (full combat rendering
     * will be delegated to the existing Renderer in Phase D).
     */

    var DIALOGUE_BOX_HEIGHT = 140;
    var PORTRAIT_SIZE = 96;
    var HUD_HEIGHT = 40;
    var STONE_SIZE = 28;

    // State for typed-text animation
    var _typedTextState = {
        fullText: '',
        displayedChars: 0,
        lastTickTime: 0,
        phaseId: null,
        lineIndex: -1
    };

    // State for collect phase (stone positions)
    var _stonePositions = null;
    var _stoneHoverIndex = -1;

    function render(ctx, canvas, snapshot, opts) {
        opts = opts || {};
        var mission = opts.mission || {};
        var npcImages = opts.npcImages || {};
        var assets = opts.assets || {};

        if (!snapshot) {
            _drawLoading(ctx, canvas);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var phaseId = snapshot.currentPhaseId;
        var phase = _findPhase(mission, phaseId);

        if (snapshot.ended) {
            _drawEndScreen(ctx, canvas, snapshot, mission);
            return;
        }

        if (phase) {
            if (phase.type === 'dialogue') {
                _drawDialogue(ctx, canvas, snapshot, phase, mission, npcImages);
            } else if (phase.type === 'collect') {
                _drawCollect(ctx, canvas, snapshot, phase, mission);
            } else if (phase.type === 'combatCollect') {
                _drawCombatCollect(ctx, canvas, snapshot, phase, mission, assets);
            } else if (phase.type === 'puzzle') {
                _drawPuzzle(ctx, canvas, snapshot, phase, mission);
            } else if (phase.type === 'combat') {
                _drawCombat(ctx, canvas, snapshot, phase, mission, assets);
            }
        }
    }

    function handleClick(x, y, snapshot, canvas, opts) {
        opts = opts || {};
        var mission = opts.mission || {};
        if (!snapshot) return null;

        if (snapshot.ended) {
            // Check if click is on the sermon button
            var phase = _findPhase(mission, snapshot.currentPhaseId);
            if (phase && phase.sermonRef) {
                var btnRect = _getSermonButtonRect(canvas);
                if (x >= btnRect.x && x <= btnRect.x + btnRect.w && y >= btnRect.y && y <= btnRect.y + btnRect.h) {
                    return { type: 'sermon', sermonRef: phase.sermonRef };
                }
            }
            return { type: 'endMission' };
        }

        var phaseId = snapshot.currentPhaseId;
        var phase = _findPhase(mission, phaseId);
        if (!phase) return null;

        if (phase.type === 'dialogue') {
            return { type: 'advanceDialogue' };
        } else if (phase.type === 'puzzle') {
            return _handlePuzzleClick(x, y, snapshot, phase, canvas, mission);
        } else if (phase.type === 'collect') {
            return _handleCollectClick(x, y, snapshot, phase, canvas, mission);
        } else if (phase.type === 'combatCollect') {
            return { type: 'combatClick', x: x, y: y };
        } else if (phase.type === 'combat') {
            return { type: 'combatClick', x: x, y: y };
        }

        return null;
    }

    function _findPhase(mission, phaseId) {
        var phases = mission.storyPhases || [];
        for (var i = 0; i < phases.length; i++) {
            if (phases[i].id === phaseId) return phases[i];
        }
        return null;
    }

    function _findNpc(mission, npcId) {
        var npcs = mission.npcs || [];
        for (var i = 0; i < npcs.length; i++) {
            if (npcs[i].id === npcId) return npcs[i];
        }
        return null;
    }

    function _findPuzzle(mission, puzzleId) {
        var puzzles = mission.puzzles || [];
        for (var i = 0; i < puzzles.length; i++) {
            if (puzzles[i].id === puzzleId) return puzzles[i];
        }
        return null;
    }

    function _findSpecialObject(mission, objectId) {
        var objs = mission.specialObjects || [];
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].id === objectId) return objs[i];
        }
        return null;
    }

    function _t(key) {
        if (typeof window !== 'undefined' && typeof window.t === 'function') {
            return window.t.apply(window, arguments);
        }
        return key;
    }

    function _drawLoading(ctx, canvas) {
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading story...', canvas.width / 2, canvas.height / 2);
    }

    // ==================== DIALOGUE ====================

    function _drawDialogue(ctx, canvas, snapshot, phase, mission, npcImages) {
        var npc = _findNpc(mission, phase.npcId);
        var npcName = npc ? _t(npc.nameKey) : 'NPC';

        // Background gradient
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#16213e');
        grad.addColorStop(1, '#0f1626');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Decorative background pattern (subtle dots)
        ctx.fillStyle = 'rgba(74,144,226,0.05)';
        for (var dx = 0; dx < canvas.width; dx += 40) {
            for (var dy = 0; dy < canvas.height - DIALOGUE_BOX_HEIGHT - 20; dy += 40) {
                ctx.beginPath();
                ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Portrait
        var portraitX = 20;
        var portraitY = canvas.height - DIALOGUE_BOX_HEIGHT - PORTRAIT_SIZE - 20;
        _drawPortrait(ctx, npc, npcImages, portraitX, portraitY, PORTRAIT_SIZE);

        // Name
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(npcName, portraitX + PORTRAIT_SIZE + 12, portraitY + 22);

        // Dialogue box
        var boxY = canvas.height - DIALOGUE_BOX_HEIGHT - 10;
        ctx.fillStyle = 'rgba(0,0,20,0.88)';
        ctx.fillRect(10, boxY, canvas.width - 20, DIALOGUE_BOX_HEIGHT);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, boxY, canvas.width - 20, DIALOGUE_BOX_HEIGHT);

        // Current line with typed-text animation
        var lineKey = phase.i18nLines && phase.i18nLines[snapshot.dialogueIndex];
        var fullText = lineKey ? _t(lineKey) : '';

        // Update typed-text state
        var now = Date.now();
        if (_typedTextState.phaseId !== snapshot.currentPhaseId || _typedTextState.lineIndex !== snapshot.dialogueIndex) {
            _typedTextState.phaseId = snapshot.currentPhaseId;
            _typedTextState.lineIndex = snapshot.dialogueIndex;
            _typedTextState.fullText = fullText;
            _typedTextState.displayedChars = 0;
            _typedTextState.lastTickTime = now;
        }

        // Advance typed text
        if (_typedTextState.displayedChars < fullText.length) {
            if (now - _typedTextState.lastTickTime > 25) {
                _typedTextState.displayedChars += 2;
                _typedTextState.lastTickTime = now;
            }
        }

        var displayedText = fullText.substring(0, _typedTextState.displayedChars);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        _drawWrappedText(ctx, displayedText, 20, boxY + 30, canvas.width - 40, 22);

        // Dialogue progress indicators (dots)
        var totalLines = phase.i18nLines ? phase.i18nLines.length : 0;
        if (totalLines > 1) {
            var dotY = boxY + DIALOGUE_BOX_HEIGHT - 8;
            var dotStartX = 20;
            for (var di = 0; di < totalLines; di++) {
                ctx.fillStyle = di <= snapshot.dialogueIndex ? '#4a90e2' : 'rgba(74,144,226,0.3)';
                ctx.beginPath();
                ctx.arc(dotStartX + di * 12, dotY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Continue/Next hint
        var isTypingComplete = _typedTextState.displayedChars >= fullText.length;
        var isLastLine = snapshot.dialogueIndex >= totalLines - 1;

        ctx.fillStyle = isTypingComplete ? '#a5c8ff' : 'rgba(165,200,255,0.4)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        if (isTypingComplete) {
            var hintKey = isLastLine ? 'story.david.buttons.next' : 'story.david.buttons.continue';
            ctx.fillText(_t(hintKey) + '  >>', canvas.width - 18, boxY + DIALOGUE_BOX_HEIGHT - 8);
        } else {
            ctx.fillText('...', canvas.width - 18, boxY + DIALOGUE_BOX_HEIGHT - 8);
        }
    }

    function _drawPortrait(ctx, npc, npcImages, x, y, size) {
        if (npc && npc.portrait && npcImages[npc.id] && npcImages[npc.id].complete && npcImages[npc.id].naturalWidth > 0) {
            try {
                ctx.drawImage(npcImages[npc.id], x, y, size, size);
                // Portrait frame
                ctx.strokeStyle = '#ffd666';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, size, size);
                return;
            } catch (e) { /* fall through to fallback */ }
        }

        // Fallback: colored circle with initial
        var name = (npc && npc.nameKey) ? _t(npc.nameKey) : 'NPC';
        ctx.fillStyle = '#4a90e2';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.charAt(0), x + size / 2, y + size / 2);
        ctx.textBaseline = 'alphabetic';
    }

    // ==================== COLLECT ====================

    function _drawCollect(ctx, canvas, snapshot, phase, mission) {
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#1a2e1e');
        grad.addColorStop(1, '#0f1f12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Field texture (subtle grass-like pattern)
        ctx.fillStyle = 'rgba(76,175,80,0.06)';
        for (var fx = 0; fx < canvas.width; fx += 20) {
            for (var fy = HUD_HEIGHT; fy < canvas.height; fy += 20) {
                if ((fx + fy) % 40 === 0) {
                    ctx.beginPath();
                    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Objective HUD
        ctx.fillStyle = 'rgba(0,0,20,0.85)';
        ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, HUD_HEIGHT);

        var objLabel = (mission.specialObjects && mission.specialObjects[0]) ? _t(mission.specialObjects[0].labelKey) : 'Stones';
        var objective = _t('story.david.hud.objective', objLabel);
        var collected = snapshot.collectedObjects ? (snapshot.collectedObjects[phase.objectType] || 0) : 0;
        var targetCount = phase.targetCount || 5;
        var countText = _t('story.david.hud.stonesCollected', collected, targetCount);

        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(objective, 10, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(countText, canvas.width - 10, 22);

        // Initialize stone positions if needed
        if (!_stonePositions || _stonePositions.missionId !== mission.id) {
            _stonePositions = _generateStonePositions(mission, targetCount, canvas);
            _stonePositions.missionId = mission.id;
        }

        // Draw remaining stones
        var remaining = targetCount - collected;
        for (var si = 0; si < _stonePositions.stones.length; si++) {
            var stone = _stonePositions.stones[si];
            if (si < collected) continue; // Already collected

            var isHovered = si === _stoneHoverIndex;
            _drawStone(ctx, stone.x, stone.y, isHovered);
        }

        // Instruction text
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        _drawWrappedText(ctx, _t('story.david.collect.instruction', targetCount), 20, canvas.height - 60, canvas.width - 40, 18);
    }

    function _generateStonePositions(mission, count, canvas) {
        var stones = [];
        var margin = 40;
        var minY = HUD_HEIGHT + 40;
        var maxY = canvas.height - 80;
        var usableW = canvas.width - margin * 2;
        var usableH = maxY - minY;

        // Deterministic pseudo-random based on index for stable positions
        for (var i = 0; i < count; i++) {
            var seed = i * 7919 + 31;
            var rx = ((seed * 2654435761) % 1000) / 1000;
            var ry = ((seed * 40503) % 1000) / 1000;
            stones.push({
                x: margin + Math.floor(rx * usableW),
                y: minY + Math.floor(ry * usableH)
            });
        }
        return { stones: stones };
    }

    function _drawStone(ctx, x, y, hovered) {
        var size = STONE_SIZE;
        if (hovered) size += 4;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + size / 2 + 2, size / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stone body (gray ellipse)
        var grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, size / 2);
        grad.addColorStop(0, '#b0b0b0');
        grad.addColorStop(1, '#606060');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, size / 2, size / 2 * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 5, size / 4, size / 6, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Glow when hovered
        if (hovered) {
            ctx.strokeStyle = 'rgba(255,214,102,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y, size / 2 + 4, size / 2 * 0.85 + 4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function _handleCollectClick(x, y, snapshot, phase, canvas, mission) {
        var targetCount = phase.targetCount || 5;
        var collected = snapshot.collectedObjects ? (snapshot.collectedObjects[phase.objectType] || 0) : 0;

        if (!_stonePositions) return null;

        // Check if click hits a remaining stone
        for (var si = collected; si < _stonePositions.stones.length; si++) {
            var stone = _stonePositions.stones[si];
            var dx = x - stone.x;
            var dy = y - stone.y;
            if (Math.sqrt(dx * dx + dy * dy) <= STONE_SIZE / 2 + 4) {
                return { type: 'collectObject', objectId: phase.objectType };
            }
        }

        return null;
    }

    // ==================== PUZZLE ====================

    // Puzzle UI state
    var _puzzleState = {
        selectedOption: null,
        showError: false,
        phaseId: null,
        solved: false,
        pendingSolved: false
    };
    var _puzzleOptionRects = [];

    function _drawPuzzle(ctx, canvas, snapshot, phase, mission) {
        var puzzle = _findPuzzle(mission, phase.puzzleId);
        if (!puzzle) return;

        // Reset puzzle state on phase change
        if (_puzzleState.phaseId !== snapshot.currentPhaseId) {
            _puzzleState.phaseId = snapshot.currentPhaseId;
            _puzzleState.selectedOption = null;
            _puzzleState.showError = false;
            _puzzleState.solved = false;
        }

        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#2e1a1a');
        grad.addColorStop(1, '#1f0f0f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verse Challenge', canvas.width / 2, 70);

        // Verse reference
        ctx.fillStyle = '#a5c8ff';
        ctx.font = '14px Arial';
        ctx.fillText(puzzle.verseRef, canvas.width / 2, 96);

        // Prompt
        ctx.fillStyle = '#fff';
        ctx.font = '17px Arial';
        _drawWrappedText(ctx, _t(puzzle.i18nPrompt), 20, 130, canvas.width - 40, 24);

        // Multiple-choice option buttons
        var options = puzzle.options || [puzzle.answer];
        var btnW = canvas.width - 40;
        var btnH = 42;
        var btnGap = 8;
        var startY = 220;
        _puzzleOptionRects = [];

        for (var oi = 0; oi < options.length; oi++) {
            var bx = 20;
            var by = startY + oi * (btnH + btnGap);
            var rect = { x: bx, y: by, w: btnW, h: btnH, option: options[oi] };
            _puzzleOptionRects.push(rect);

            var isSelected = _puzzleState.selectedOption === oi;
            var fillCol = isSelected ? 'rgba(74,144,226,0.5)' : 'rgba(255,255,255,0.08)';
            var strokeCol = isSelected ? '#ffd666' : '#4a90e2';

            ctx.fillStyle = fillCol;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(options[oi], rect.x + rect.w / 2, rect.y + 27);
        }

        // Error feedback
        if (_puzzleState.showError) {
            ctx.fillStyle = '#ff6666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Not quite. Try again!', canvas.width / 2, startY + options.length * (btnH + btnGap) + 20);
        }

        // Hint
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap the correct word', canvas.width / 2, canvas.height - 20);
    }

    function _handlePuzzleClick(x, y, snapshot, phase, canvas, mission) {
        var puzzle = _findPuzzle(mission, phase.puzzleId);
        if (!puzzle) return null;

        for (var i = 0; i < _puzzleOptionRects.length; i++) {
            var rect = _puzzleOptionRects[i];
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                _puzzleState.selectedOption = i;
                var chosen = rect.option;
                if (chosen.toLowerCase() === (puzzle.answer || '').toLowerCase()) {
                    _puzzleState.solved = true;
                    _puzzleState.showError = false;
                    return { type: 'puzzleSolved' };
                } else {
                    _puzzleState.showError = true;
                    return null;
                }
            }
        }

        return null;
    }

    // ==================== COMBAT ====================

    function _drawCombat(ctx, canvas, snapshot, phase, mission, assets) {
        var combatState = snapshot.combatState;
        if (!combatState) {
            // Loading combat
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffd666';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Preparing for battle...', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Dark background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Camera: center on player
        var player = null;
        var playerCode = null;
        for (var code in combatState.players) {
            if (combatState.players[code]) {
                player = combatState.players[code];
                playerCode = code;
                break;
            }
        }

        var camera = { x: 0, y: 0 };
        if (player) {
            camera.x = player.x - canvas.width / 2;
            camera.y = player.y - canvas.height / 2;
        }

        // Clamp camera to world bounds
        var worldW = 3000, worldH = 3000;
        camera.x = Math.max(0, Math.min(worldW - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(worldH - canvas.height, camera.y));

        _drawStoryCombatBackdrop(ctx, canvas, camera, worldW, worldH, '#0a0a14', '#11192c');

        // Draw monsters
        var monsters = combatState.monsters || [];
        for (var mi = 0; mi < monsters.length; mi++) {
            var m = monsters[mi];
            if (!m) continue;
            var mx = m.x - camera.x;
            var my = m.y - camera.y;
            if (mx < -50 || mx > canvas.width + 50 || my < -50 || my > canvas.height + 50) continue;

            var mw = m.width || 48;
            var mh = m.height || 48;
            var sizeMult = m.sizeMultiplier || 1;

            _drawStoryMonster(ctx, m, mx, my, mw, mh, sizeMult, assets);

            // Health bar
            if (m.health !== undefined && m.maxHealth > 0) {
                var barW = mw * sizeMult;
                var barH = 4;
                var barY = my - mh / 2 * sizeMult - 8;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(mx - barW / 2, barY, barW, barH);
                var hpRatio = Math.max(0, m.health / m.maxHealth);
                ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : (hpRatio > 0.25 ? '#ffaa44' : '#ff4444');
                ctx.fillRect(mx - barW / 2, barY, barW * hpRatio, barH);
            }

            if (m.isBoss) {
                ctx.fillStyle = '#ffe6a6';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(m.label || 'Goliath', mx, my - mh * sizeMult * 0.65 - 10);
            }
        }

        // Draw player
        if (player) {
            var px = player.x - camera.x;
            var py = player.y - camera.y;
            var pw = player.width || 48;
            var ph = player.height || 48;

            _drawStoryPlayer(ctx, player, px, py, pw, ph, assets);

            // Health bar
            if (player.health !== undefined && player.maxHealth > 0) {
                var pBarW = pw;
                var pBarH = 4;
                var pBarY = py - ph / 2 - 8;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(px - pBarW / 2, pBarY, pBarW, pBarH);
                var pHpRatio = Math.max(0, player.health / player.maxHealth);
                ctx.fillStyle = pHpRatio > 0.5 ? '#44ff44' : (pHpRatio > 0.25 ? '#ffaa44' : '#ff4444');
                ctx.fillRect(px - pBarW / 2, pBarY, pBarW * pHpRatio, pBarH);
            }
        }

        // Draw healing points
        var healingPoints = combatState.healingPoints || [];
        for (var hi = 0; hi < healingPoints.length; hi++) {
            var hp = healingPoints[hi];
            if (!hp) continue;
            var hx = hp.x - camera.x;
            var hy = hp.y - camera.y;
            _drawHealingPoint(ctx, hx, hy, assets);
        }

        // Draw bullets
        var bullets = combatState.bullets || [];
        for (var bi = 0; bi < bullets.length; bi++) {
            var b = bullets[bi];
            if (!b) continue;
            var bx = b.x - camera.x;
            var by = b.y - camera.y;
            ctx.fillStyle = '#ffd666';
            ctx.beginPath();
            ctx.arc(bx, by, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD: Mission title + objective
        ctx.fillStyle = 'rgba(0,0,20,0.8)';
        ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, HUD_HEIGHT);

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('FACE GOLIATH', 10, 20);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        var killsText = 'Kills: ' + (combatState.monstersKilled || 0) + ' / ' + (combatState.monstersToKill || 1);
        ctx.fillText(killsText, canvas.width - 10, 18);

        // Player HP/ammo HUD
        if (player) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('HP: ' + Math.ceil(player.health || 0) + '  Ammo: ' + (player.ammo || 0), canvas.width - 10, 32);
        }
    }

    // ==================== COMBAT COLLECT ====================

    function _drawCombatCollect(ctx, canvas, snapshot, phase, mission, assets) {
        var combatState = snapshot.combatState;
        if (!combatState) {
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffd666';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Entering the field...', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Camera: center on player
        var player = null;
        for (var code in combatState.players) {
            if (combatState.players[code]) { player = combatState.players[code]; break; }
        }

        var camera = { x: 0, y: 0 };
        if (player) {
            camera.x = player.x - canvas.width / 2;
            camera.y = player.y - canvas.height / 2;
        }
        camera.x = Math.max(0, Math.min(3000 - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(3000 - canvas.height, camera.y));

        _drawStoryCombatBackdrop(ctx, canvas, camera, 3000, 3000, '#0a0a14', '#112130');

        // Draw monsters (reuse combat drawing)
        var monsters = combatState.monsters || [];
        for (var mi = 0; mi < monsters.length; mi++) {
            var m = monsters[mi];
            if (!m) continue;
            var mx = m.x - camera.x;
            var my = m.y - camera.y;
            if (mx < -50 || mx > canvas.width + 50 || my < -50 || my > canvas.height + 50) continue;

            var mw = m.width || 48;
            var sizeMult = m.sizeMultiplier || 1;
            _drawStoryMonster(ctx, m, mx, my, mw, m.height || 48, sizeMult, assets);

            if (m.health !== undefined && m.maxHealth > 0) {
                var barW = mw * sizeMult;
                var barY = my - mw / 2 * sizeMult - 8;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(mx - barW / 2, barY, barW, 4);
                var hpRatio = Math.max(0, m.health / m.maxHealth);
                ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : (hpRatio > 0.25 ? '#ffaa44' : '#ff4444');
                ctx.fillRect(mx - barW / 2, barY, barW * hpRatio, 4);
            }
        }

        // Draw stones in world space
        var stonePositions = snapshot.stonePositions || [];
        var collectedIndices = snapshot.collectedStoneIndices || {};
        for (var si = 0; si < stonePositions.length; si++) {
            if (collectedIndices[si]) continue;
            var st = stonePositions[si];
            var sx = st.x - camera.x;
            var sy = st.y - camera.y;
            if (sx < -30 || sx > canvas.width + 30 || sy < -30 || sy > canvas.height + 30) continue;
            _drawStone(ctx, sx, sy, false);
        }

        // Draw player
        if (player) {
            var px = player.x - camera.x;
            var py = player.y - camera.y;
            var pw = player.width || 48;
            var ph = player.height || 48;
            _drawStoryPlayer(ctx, player, px, py, pw, ph, assets);

            if (player.health !== undefined && player.maxHealth > 0) {
                var pBarW = pw;
                var pBarY = py - pw / 2 - 8;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(px - pBarW / 2, pBarY, pBarW, 4);
                var pHpRatio = Math.max(0, player.health / player.maxHealth);
                ctx.fillStyle = pHpRatio > 0.5 ? '#44ff44' : (pHpRatio > 0.25 ? '#ffaa44' : '#ff4444');
                ctx.fillRect(px - pBarW / 2, pBarY, pBarW * pHpRatio, 4);
            }

            // Check stone proximity for auto-collect
            var collectRadius = 40;
            for (var ci = 0; ci < stonePositions.length; ci++) {
                if (collectedIndices[ci]) continue;
                var stn = stonePositions[ci];
                var dx = player.x - stn.x;
                var dy = player.y - stn.y;
                if (Math.sqrt(dx * dx + dy * dy) <= collectRadius) {
                    // Auto-collect this stone
                    if (_pendingStoneCollect.indexOf(ci) === -1) {
                        _pendingStoneCollect.push(ci);
                    }
                }
            }
        }

        // Draw healing points
        var healingPoints = combatState.healingPoints || [];
        for (var hi = 0; hi < healingPoints.length; hi++) {
            var hp = healingPoints[hi];
            if (!hp) continue;
            _drawHealingPoint(ctx, hp.x - camera.x, hp.y - camera.y, assets);
        }

        // Draw bullets
        var bullets = combatState.bullets || [];
        for (var bi = 0; bi < bullets.length; bi++) {
            var b = bullets[bi];
            if (!b) continue;
            ctx.fillStyle = '#ffd666';
            ctx.beginPath();
            ctx.arc(b.x - camera.x, b.y - camera.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,20,0.85)';
        ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, HUD_HEIGHT);

        var objLabel = (mission.specialObjects && mission.specialObjects[0]) ? _t(mission.specialObjects[0].labelKey) : 'Stones';
        var objective = _t('story.david.hud.objective', objLabel);
        var collected = snapshot.collectedObjects ? (snapshot.collectedObjects[phase.objectType] || 0) : 0;
        var targetCount = phase.targetCount || 5;
        var countText = _t('story.david.hud.stonesCollected', collected, targetCount);

        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(objective, 10, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(countText, canvas.width - 10, 22);

        if (player) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('HP: ' + Math.ceil(player.health || 0) + '  Ammo: ' + (player.ammo || 0), canvas.width - 10, 35);
        }
    }

    // Pending stone auto-collects (checked by render loop in launcher)
    var _pendingStoneCollect = [];

    function consumePendingStoneCollect() {
        var result = _pendingStoneCollect.slice();
        _pendingStoneCollect = [];
        return result;
    }

    // ==================== END SCREEN ====================

    function _getSermonButtonRect(canvas) {
        var w = 140;
        var h = 32;
        return {
            x: (canvas.width - w) / 2,
            y: canvas.height / 2 + 50,
            w: w,
            h: h
        };
    }

    function _drawEndScreen(ctx, canvas, snapshot, mission) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mission Complete', canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        _drawWrappedText(ctx, _t('story.david.victory.2'), 20, canvas.height / 2 + 5, canvas.width - 40, 22);

        // Sermon button if phase had sermonRef
        var phase = _findPhase(mission, snapshot.currentPhaseId);
        if (phase && phase.sermonRef) {
            var btn = _getSermonButtonRect(canvas);
            ctx.fillStyle = 'rgba(74,144,226,0.3)';
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 2;
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(_t('story.david.buttons.readDevotional'), btn.x + btn.w / 2, btn.y + 21);
        }

        ctx.fillStyle = '#a5c8ff';
        ctx.font = '14px Arial';
        ctx.fillText('[Click to continue]', canvas.width / 2, canvas.height - 40);
    }

    function _drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        var words = String(text).split(' ');
        var line = '';
        var lineY = y;
        for (var i = 0; i < words.length; i++) {
            var testLine = line + (line ? ' ' : '') + words[i];
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, lineY);
                line = words[i];
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, x, lineY);
        }
    }

    // Expose hover detection for the launcher to call on mousemove
    function updateHover(x, y, snapshot, canvas, opts) {
        opts = opts || {};
        var mission = opts.mission || {};
        if (!snapshot) return;

        var phase = _findPhase(mission, snapshot.currentPhaseId);
        if (!phase || phase.type !== 'collect') {
            _stoneHoverIndex = -1;
            return;
        }

        var collected = snapshot.collectedObjects ? (snapshot.collectedObjects[phase.objectType] || 0) : 0;
        if (!_stonePositions) { _stoneHoverIndex = -1; return; }

        _stoneHoverIndex = -1;
        for (var si = collected; si < _stonePositions.stones.length; si++) {
            var stone = _stonePositions.stones[si];
            var dx = x - stone.x;
            var dy = y - stone.y;
            if (Math.sqrt(dx * dx + dy * dy) <= STONE_SIZE / 2 + 4) {
                _stoneHoverIndex = si;
                return;
            }
        }
    }

    function _drawStoryCombatBackdrop(ctx, canvas, camera, worldW, worldH, topColor, bottomColor) {
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        var startX = -((camera.x % 200) + 200) % 200;
        var startY = -((camera.y % 200) + 200) % 200;
        for (var gx = startX; gx < canvas.width; gx += 200) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, canvas.height);
            ctx.stroke();
        }
        for (var gy = startY; gy < canvas.height; gy += 200) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(canvas.width, gy);
            ctx.stroke();
        }
    }

    function _drawStoryMonster(ctx, monster, x, y, width, height, sizeMult, assets) {
        var demonImages = assets && assets.demonImages ? assets.demonImages : null;
        var image = demonImages ? demonImages[monster.demonType] : null;
        var drawW = width * sizeMult;
        var drawH = height * sizeMult;

        if (image && image.complete && image.naturalWidth > 0) {
            ctx.drawImage(image, x - drawW / 2, y - drawH / 2, drawW, drawH);
            if (monster.isAttacked) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
                ctx.restore();
            }
            return;
        }

        ctx.fillStyle = monster.isBoss ? '#cc2222' : '#882222';
        ctx.beginPath();
        ctx.arc(x, y, drawW / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = monster.isBoss ? '#ff4444' : '#aa3333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function _drawStoryPlayer(ctx, player, x, y, width, height, assets) {
        var playerImg = assets ? assets.playerImg : null;
        if (playerImg && (playerImg.complete || playerImg.tagName === 'CANVAS')) {
            var frameIndex = player.currentFrame || 0;
            var facingDirection = player.facingDirection || 'right';
            var sourceY = facingDirection === 'right' ? 0 : 48;
            var sourceX = frameIndex * 48;
            ctx.drawImage(
                playerImg,
                sourceX, sourceY, 48, 48,
                x - width / 2, y - height / 2,
                width, height
            );
            return;
        }

        ctx.fillStyle = '#4a90e2';
        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd666';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function _drawHealingPoint(ctx, x, y, assets) {
        var healingPointImg = assets ? assets.healingPointImg : null;
        if (healingPointImg && healingPointImg.complete && healingPointImg.naturalWidth > 0) {
            ctx.drawImage(healingPointImg, x - 12, y - 12, 24, 24);
            return;
        }

        ctx.fillStyle = '#44ff44';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#22aa22';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    window.StoryMissionRenderer = {
        render: render,
        handleClick: handleClick,
        updateHover: updateHover,
        consumePendingStoneCollect: consumePendingStoneCollect
    };
})();
