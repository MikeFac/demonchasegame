// NeedQuizMode.js - "Which verse speaks most directly to this?" quiz mode.
//
// Layout: a compact strip at the bottom of the canvas, about 100px tall, so the
// playfield stays visible and playable. Four reference chips in a 2x2 grid; each
// is small enough that four fit comfortably at 400px wide.
//
// Reading and answering are separate actions: tapping a chip opens the verse in a
// popup, and choosing happens inside that popup. Clicks outside the strip are NOT
// consumed, so movement keeps working.
//
// IIFE pattern, sets window.NeedQuizMode (matches the other client modules).

(function () {
    'use strict';

    var ITEMS = null;
    var loading = false;
    var loadError = null;
    var usedIds = {};

    var L = {
        panelH: 102,
        sideMargin: 6,
        bottomMargin: 6,
        pad: 8,
        chipH: 24,
        chipGapX: 6,
        chipGapY: 5,
        popupPad: 12
    };

    // --- Data -------------------------------------------------------------

    function load() {
        if (ITEMS || loading) return;
        loading = true;
        fetch('/data/need-comparison-items.json?v=' + Date.now(), { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (d) {
                ITEMS = (d && Array.isArray(d.items)) ? d.items : [];
            })
            .catch(function (e) {
                loadError = e;
                if (typeof console !== 'undefined') console.warn('NeedQuizMode: load failed', e);
            })
            .finally(function () { loading = false; });
    }

    function isReady() { return !!(ITEMS && ITEMS.length); }
    function itemCount() { return ITEMS ? ITEMS.length : 0; }
    function resetUsed() { usedIds = {}; }

    function pickItem(need) {
        if (!isReady()) return null;
        var pool = need ? ITEMS.filter(function (i) { return i.need === need; }) : ITEMS.slice();
        if (!pool.length) pool = ITEMS.slice();

        var unseen = pool.filter(function (i) { return !usedIds[i.id]; });
        if (!unseen.length) {
            pool.forEach(function (i) { delete usedIds[i.id]; });
            unseen = pool;
        }
        var item = unseen[Math.floor(Math.random() * unseen.length)];
        usedIds[item.id] = true;
        return item;
    }

    function toQuiz(item) {
        var correct = null;
        var options = item.options.map(function (o) {
            if (o.correct) correct = o.reference;
            return {
                reference: o.reference,
                text: o.text,
                preview: o.preview || o.text,
                topic: o.topic,
                ruleOut: o.ruleOut,
                whyNot: o.whyNot,
                explanation: o.explanation,
                isCorrect: !!o.correct,
                display: o.reference
            };
        });
        return {
            mode: 'need_comparison',
            itemId: item.id,
            need: item.need,
            scenario: item.scenario,
            exclusions: item.exclusions || [],
            questionLabel: item.question || 'Which verse speaks most directly to this?',
            options: options,
            correctAnswer: correct,
            verseReference: correct,
            contentCategory: item.need,
            popupIndex: null,
            _chips: null,
            _popupRects: null
        };
    }

    function buildQuiz(need) {
        load();
        var item = pickItem(need);
        return item ? toQuiz(item) : null;
    }

    // --- Text helpers -----------------------------------------------------

    function wrapText(ctx, text, maxWidth, maxLines) {
        var words = String(text || '').split(/\s+/);
        var lines = [];
        var line = '';
        for (var i = 0; i < words.length; i++) {
            var test = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = words[i];
                if (maxLines && lines.length === maxLines - 1) {
                    // last allowed line: cram the remainder
                    line = words.slice(i).join(' ');
                    break;
                }
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        if (maxLines && lines.length > maxLines) lines = lines.slice(0, maxLines);
        return lines;
    }

    function truncate(ctx, text, maxWidth) {
        var t = String(text || '');
        if (ctx.measureText(t).width <= maxWidth) return t;
        while (t.length > 4 && ctx.measureText(t + '...').width > maxWidth) {
            t = t.slice(0, -1);
        }
        return t + '...';
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function inRect(x, y, r) {
        return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    function logicalSize(ctx) {
        // canvas.width is the DPR-scaled bitmap; UI coordinates are logical.
        if (typeof Viewport !== 'undefined' && Viewport && Viewport.width) {
            return { w: Viewport.width, h: Viewport.height };
        }
        var scale = 1;
        try {
            var t = ctx.getTransform && ctx.getTransform();
            if (t && t.a) scale = t.a;
        } catch (e) { /* older browsers */ }
        return { w: ctx.canvas.width / scale, h: ctx.canvas.height / scale };
    }

    function panelRect(canvasH, canvasW) {
        return {
            x: L.sideMargin,
            y: canvasH - L.panelH - L.bottomMargin,
            w: canvasW - 2 * L.sideMargin,
            h: L.panelH
        };
    }

    // --- Rendering --------------------------------------------------------

    function render(ctx, quiz) {
        var size = logicalSize(ctx);
        var W = size.w;
        var H = size.h;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        var panel = panelRect(H, W);

        if (!isReady()) {
            ctx.fillStyle = 'rgba(10,14,20,0.88)';
            roundRect(ctx, panel.x, panel.y, panel.w, 28, 6);
            ctx.fill();
            ctx.fillStyle = '#8b98a8';
            ctx.font = '11px Arial';
            ctx.fillText(loadError ? 'Could not load questions.' : 'Loading questions...', panel.x + L.pad, panel.y + 18);
            ctx.restore();
            return;
        }

        // Panel background only — no full-screen dim, so gameplay stays visible.
        ctx.fillStyle = 'rgba(10, 14, 20, 0.86)';
        roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(58, 70, 85, 0.9)';
        ctx.lineWidth = 1;
        roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 7);
        ctx.stroke();

        // Scenario, capped at two lines.
        ctx.fillStyle = '#e6edf6';
        ctx.font = '10.5px Arial';
        var lines = wrapText(ctx, quiz.scenario, panel.w - 2 * L.pad, 2);
        var ty = panel.y + L.pad + 9;
        for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], panel.x + L.pad, ty);
            ty += 13;
        }

        // 2x2 reference chips.
        var gridY = panel.y + L.pad + 32;
        var chipW = (panel.w - 2 * L.pad - L.chipGapX) / 2;
        quiz._chips = [];

        for (var k = 0; k < quiz.options.length && k < 4; k++) {
            var col = k % 2;
            var row = Math.floor(k / 2);
            var cx = panel.x + L.pad + col * (chipW + L.chipGapX);
            var cy = gridY + row * (L.chipH + L.chipGapY);
            var rect = { x: cx, y: cy, w: chipW, h: L.chipH };
            quiz._chips.push(rect);

            ctx.fillStyle = '#1b222b';
            roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
            ctx.fill();
            ctx.strokeStyle = '#2c3743';
            roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
            ctx.stroke();

            ctx.fillStyle = '#cfe0ff';
            ctx.font = 'bold 10.5px Arial';
            ctx.fillText(truncate(ctx, quiz.options[k].reference, rect.w - 16), rect.x + 6, rect.y + 16);
        }

        if (quiz.popupIndex != null) {
            drawPopup(ctx, quiz);
        }

        ctx.restore();
    }

    function drawPopup(ctx, quiz) {
        var size = logicalSize(ctx);
        var W = size.w;
        var H = size.h;
        var o = quiz.options[quiz.popupIndex];
        if (!o) { quiz.popupIndex = null; return; }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, W, H);

        var pad = L.popupPad;
        var pw = W - 2 * pad;
        var px = pad;

        ctx.font = '12px Arial';
        var bodyLines = wrapText(ctx, o.text, pw - 2 * pad, 0);
        var panelH = 30 + bodyLines.length * 16 + 66;
        var py = Math.max(18, (H - panelH) / 2);

        ctx.fillStyle = '#161b23';
        roundRect(ctx, px, py, pw, panelH, 9);
        ctx.fill();
        ctx.strokeStyle = '#3a4655';
        roundRect(ctx, px, py, pw, panelH, 9);
        ctx.stroke();

        ctx.fillStyle = '#cfe0ff';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(o.reference, px + pad, py + 21);

        ctx.fillStyle = '#dfe6ef';
        ctx.font = '12px Arial';
        var ty = py + 40;
        for (var i = 0; i < bodyLines.length; i++) {
            ctx.fillText(bodyLines[i], px + pad, ty);
            ty += 16;
        }

        var btnY = py + panelH - 46;
        var halfW = (pw - 2 * pad - 8) / 2;

        var chooseRect = { x: px + pad, y: btnY, w: halfW, h: 32 };
        ctx.fillStyle = 'rgba(61, 220, 151, 0.18)';
        roundRect(ctx, chooseRect.x, chooseRect.y, chooseRect.w, chooseRect.h, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(61,220,151,0.5)';
        roundRect(ctx, chooseRect.x, chooseRect.y, chooseRect.w, chooseRect.h, 7);
        ctx.stroke();
        ctx.fillStyle = '#3ddc97';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Choose this verse', chooseRect.x + chooseRect.w / 2, chooseRect.y + 21);

        var closeRect = { x: px + pad + halfW + 8, y: btnY, w: halfW, h: 32 };
        ctx.fillStyle = '#1c232d';
        roundRect(ctx, closeRect.x, closeRect.y, closeRect.w, closeRect.h, 7);
        ctx.fill();
        ctx.strokeStyle = '#2a333f';
        roundRect(ctx, closeRect.x, closeRect.y, closeRect.w, closeRect.h, 7);
        ctx.stroke();
        ctx.fillStyle = '#8b98a8';
        ctx.font = '12px Arial';
        ctx.fillText('Close', closeRect.x + closeRect.w / 2, closeRect.y + 21);
        ctx.textAlign = 'left';

        quiz._popupRects = {
            panel: { x: px, y: py, w: pw, h: panelH },
            choose: chooseRect,
            close: closeRect
        };
    }

    // --- Input ------------------------------------------------------------
    // Returns { action: 'answer', index } | { action: 'consumed' } | null.
    // null means "not mine" — the caller must let the click through, or the
    // player cannot move.

    function handleClick(x, y, quiz) {
        if (!quiz || quiz.mode !== 'need_comparison') return null;

        if (quiz.popupIndex != null) {
            var p = quiz._popupRects;
            if (p) {
                if (inRect(x, y, p.choose)) {
                    var idx = quiz.popupIndex;
                    // Close first so the answer feedback is not hidden behind the popup.
                    quiz.popupIndex = null;
                    quiz._popupRects = null;
                    return { action: 'answer', index: idx };
                }
                if (inRect(x, y, p.close) || !inRect(x, y, p.panel)) {
                    quiz.popupIndex = null;
                    quiz._popupRects = null;
                    return { action: 'consumed' };
                }
            }
            return { action: 'consumed' };
        }

        var chips = quiz._chips || [];
        for (var i = 0; i < chips.length; i++) {
            if (inRect(x, y, chips[i])) {
                quiz.popupIndex = i;
                quiz._popupRects = null;
                return { action: 'consumed' };
            }
        }

        // Outside the strip: not a quiz interaction.
        return null;
    }

    function closePopup(quiz) {
        if (!quiz) return;
        quiz.popupIndex = null;
        quiz._popupRects = null;
    }

    // --- Public API -------------------------------------------------------

    load();

    var api = {
        load: load,
        isReady: isReady,
        itemCount: itemCount,
        buildQuiz: buildQuiz,
        render: render,
        handleClick: handleClick,
        closePopup: closePopup,
        resetUsed: resetUsed
    };

    if (typeof window !== 'undefined') window.NeedQuizMode = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
