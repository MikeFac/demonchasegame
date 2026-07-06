(function () {
    'use strict';

    /**
     * StoryDialogueOverlay - Typed-text dialogue box utilities.
     *
     * In Phase A, the dialogue rendering is handled directly by StoryMissionRenderer.
     * This module will be expanded in Phase B to provide typed-text animation
     * and a dedicated DOM overlay for richer dialogue presentation.
     */

    function _t(key) {
        if (typeof window !== 'undefined' && typeof window.t === 'function') {
            return window.t(key);
        }
        return key;
    }

    function buildDialogueBox(parentEl, npcName, lineText, options) {
        options = options || {};

        var box = document.createElement('div');
        box.className = 'story-dialogue-box';
        box.style.cssText = 'position:absolute;bottom:10px;left:10px;right:10px;background:rgba(0,0,20,0.92);border:2px solid #4a90e2;border-radius:12px;padding:16px;min-height:100px;color:#fff;font-family:Arial,sans-serif;';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'color:#ffd666;font-weight:bold;font-size:16px;margin-bottom:8px;';
        nameEl.textContent = npcName;
        box.appendChild(nameEl);

        var textEl = document.createElement('div');
        textEl.style.cssText = 'font-size:15px;line-height:1.45;';
        textEl.textContent = lineText;
        box.appendChild(textEl);

        if (options.sermonRef) {
            var sermonBtn = document.createElement('button');
            sermonBtn.type = 'button';
            sermonBtn.textContent = _t('story.david.buttons.readDevotional');
            sermonBtn.style.cssText = 'display:block;margin-top:12px;padding:8px 16px;background:rgba(74,144,226,0.3);border:1px solid #4a90e2;border-radius:8px;color:#fff;cursor:pointer;font-size:14px;';
            sermonBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.SermonViewer) {
                    window.SermonViewer.open({ currentReference: options.sermonRef });
                }
            });
            box.appendChild(sermonBtn);
        }

        var continueEl = document.createElement('div');
        continueEl.style.cssText = 'position:absolute;bottom:6px;right:14px;color:#a5c8ff;font-size:12px;';
        continueEl.textContent = _t('story.david.buttons.continue') + '  >>';
        box.appendChild(continueEl);

        if (parentEl) parentEl.appendChild(box);
        return box;
    }

    window.StoryDialogueOverlay = {
        buildDialogueBox: buildDialogueBox
    };
})();