(function () {
    'use strict';

    /**
     * StoryMissionRenderer - Renders story mission phases.
     *
     * For story phases (dialogue, collect, puzzle): draws NPC portrait, dialogue,
     * objective HUD, and puzzle UI directly.
     *
     * For combat phases: draws a simple indicator overlay (full combat rendering
     * will be delegated to the existing Renderer in Phase D).
     */

    var DIALOGUE_BOX_HEIGHT = 140;
    var PORTRAIT_SIZE = 96;
    var HUD_HEIGHT = 40;

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
            return { type: 'endMission' };
        }

        var phaseId = snapshot.currentPhaseId;
        var phase = _findPhase(mission, phaseId);
        if (!phase) return null;

        if (phase.type === 'dialogue') {
            return { type: 'advanceDialogue' };
        } else if (phase.type === 'puzzle') {
            return _handlePuzzleClick(x, y, snapshot, phase, canvas);
        } else if (phase.type === 'collect') {
            return _handleCollectClick(x, y, snapshot, phase, canvas);
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

    function _drawDialogue(ctx, canvas, snapshot, phase, mission, npcImages) {
        var npc = _findNpc(mission, phase.npcId);
        var npcName = npc ? _t(npc.nameKey) : 'NPC';

        // Background gradient
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#16213e');
        grad.addColorStop(1, '#0f1626');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        ctx.fillStyle = 'rgba(0,0,20,0.85)';
        ctx.fillRect(10, boxY, canvas.width - 20, DIALOGUE_BOX_HEIGHT);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, boxY, canvas.width - 20, DIALOGUE_BOX_HEIGHT);

        // Current line
        var lineKey = phase.i18nLines && phase.i18nLines[snapshot.dialogueIndex];
        var lineText = lineKey ? _t(lineKey) : '';

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        _drawWrappedText(ctx, lineText, 20, boxY + 30, canvas.width - 40, 22);

        // Continue hint
        ctx.fillStyle = '#a5c8ff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(_t('story.david.buttons.continue') + '  >>', canvas.width - 18, boxY + DIALOGUE_BOX_HEIGHT - 8);
    }

    function _drawPortrait(ctx, npc, npcImages, x, y, size) {
        if (npc && npc.portrait && npcImages[npc.id] && npcImages[npc.id].complete && npcImages[npc.id].naturalWidth > 0) {
            try {
                ctx.drawImage(npcImages[npc.id], x, y, size, size);
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

    function _drawCollect(ctx, canvas, snapshot, phase, mission) {
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#1a2e1e');
        grad.addColorStop(1, '#0f1f12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Objective HUD
        ctx.fillStyle = 'rgba(0,0,20,0.8)';
        ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, HUD_HEIGHT);

        var objLabel = (mission.specialObjects && mission.specialObjects[0]) ? _t(mission.specialObjects[0].labelKey) : 'Stones';
        var objective = _t('story.david.hud.objective', objLabel);
        var collected = snapshot.collectedObjects ? (snapshot.collectedObjects[phase.objectType] || 0) : 0;
        var countText = _t('story.david.hud.stonesCollected', collected, phase.targetCount || 5);

        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(objective, 10, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(countText, canvas.width - 10, 22);

        // Instructions
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        var instrKey = 'story.david.hud.objective';
        _drawWrappedText(ctx, _t('story.david.collect.instruction', objLabel), 20, canvas.height / 2 - 20, canvas.width - 40, 22);

        // Skip hint (for dev testing - clicking the canvas advances)
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.fillText('[Click to advance for now]', canvas.width / 2, canvas.height - 20);
    }

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

        // Placeholder: full puzzle UI will be built in Phase C
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.fillText('[Puzzle UI - Phase C]', canvas.width / 2, canvas.height - 20);
    }

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

    function _drawEndScreen(ctx, canvas, snapshot, mission) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffd666';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mission Complete', canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText(_t('story.david.victory.2'), canvas.width / 2, canvas.height / 2 + 10);

        ctx.fillStyle = '#a5c8ff';
        ctx.font = '14px Arial';
        ctx.fillText('[Click to continue]', canvas.width / 2, canvas.height - 40);
    }

    function _handlePuzzleClick(x, y, snapshot, phase, canvas) {
        return { type: 'puzzleSolved' };
    }

    function _handleCollectClick(x, y, snapshot, phase, canvas) {
        return { type: 'collectObject', objectId: phase.objectType };
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

    window.StoryMissionRenderer = {
        render: render,
        handleClick: handleClick
    };
})();