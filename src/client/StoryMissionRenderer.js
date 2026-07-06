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
            } else if (phase.type === 'puzzle') {
                _drawPuzzle(ctx, canvas, snapshot, phase, mission);
            } else if (phase.type === 'combat') {
                _drawCombat(ctx, canvas, snapshot, phase, mission);
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
            return window.t(key);
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

    function _drawPuzzle(ctx, canvas, snapshot, phase, mission) {
        var puzzle = _findPuzzle(mission, phase.puzzleId);
        if (!puzzle) return;

        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#2e1a1a');
        grad.addColorStop(1, '#1f0f0f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verse Challenge', canvas.width / 2, 80);

        // Verse reference
        ctx.fillStyle = '#a5c8ff';
        ctx.font = '14px Arial';
        ctx.fillText(puzzle.verseRef, canvas.width / 2, 110);

        // Prompt
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        _drawWrappedText(ctx, _t(puzzle.i18nPrompt), 20, 150, canvas.width - 40, 26);

        // Full puzzle UI will be built in Phase C
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.fillText('[Puzzle UI - Phase C]', canvas.width / 2, canvas.height - 20);
    }

    function _handlePuzzleClick(x, y, snapshot, phase, canvas, mission) {
        return { type: 'puzzleSolved' };
    }

    // ==================== COMBAT ====================

    function _drawCombat(ctx, canvas, snapshot, phase, mission) {
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FACE GOLIATH', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('[Combat rendering - Phase D]', canvas.width / 2, canvas.height / 2 + 10);
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

    window.StoryMissionRenderer = {
        render: render,
        handleClick: handleClick,
        updateHover: updateHover
    };
})();