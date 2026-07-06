(function () {
    'use strict';

    /**
     * StoryPuzzleScreen - Cloze puzzle UI for story missions.
     *
     * Full implementation deferred to Phase C. This skeleton provides the
     * API surface that StoryMissionRenderer will call.
     */

    function _t(key) {
        if (typeof window !== 'undefined' && typeof window.t === 'function') {
            return window.t(key);
        }
        return key;
    }

    function buildPuzzleOverlay(parentEl, puzzle, onSolved) {
        var overlay = document.createElement('div');
        overlay.className = 'story-puzzle-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,20,0.85);z-index:100;display:flex;align-items:center;justify-content:center;';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #4a90e2;border-radius:15px;padding:25px;max-width:380px;width:90%;color:#fff;text-align:center;';

        var title = document.createElement('h2');
        title.style.cssText = 'color:#ffd666;margin-bottom:15px;';
        title.textContent = 'Verse Challenge';
        panel.appendChild(title);

        var ref = document.createElement('p');
        ref.style.cssText = 'color:#a5c8ff;font-size:14px;margin-bottom:12px;';
        ref.textContent = puzzle.verseRef || '';
        panel.appendChild(ref);

        var prompt = document.createElement('p');
        prompt.style.cssText = 'font-size:17px;line-height:1.45;margin-bottom:20px;';
        prompt.textContent = _t(puzzle.i18nPrompt);
        panel.appendChild(prompt);

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type your answer...';
        input.style.cssText = 'display:block;width:80%;margin:0 auto 15px;padding:12px;font-size:18px;text-align:center;border:2px solid #4a90e2;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;';
        panel.appendChild(input);

        var submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.textContent = 'Submit';
        submitBtn.style.cssText = 'padding:10px 24px;background:rgba(74,144,226,0.3);border:2px solid #4a90e2;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;';
        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var val = (input.value || '').trim();
            if (val.toLowerCase() === (puzzle.answer || '').toLowerCase()) {
                overlay.remove();
                if (onSolved) onSolved(true);
            } else {
                input.style.borderColor = '#ff4444';
                setTimeout(function () { input.style.borderColor = '#4a90e2'; }, 800);
            }
        });
        panel.appendChild(submitBtn);

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn.click();
            }
        });

        overlay.appendChild(panel);
        if (parentEl) parentEl.appendChild(overlay);

        setTimeout(function () { input.focus(); }, 50);

        return overlay;
    }

    window.StoryPuzzleScreen = {
        buildPuzzleOverlay: buildPuzzleOverlay
    };
})();