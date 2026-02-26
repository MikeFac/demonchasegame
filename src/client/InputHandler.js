/**
 * InputHandler - Manages all user input for the game
 * Handles mouse clicks and provides the current target position for player movement
 */
class InputHandler {
    constructor(canvas, constants) {
        this.canvas = canvas;
        this.constants = constants;

        // Movement target in WORLD coordinates (where player should move towards)
        this.worldTargetX = null;
        this.worldTargetY = null;

        // Camera reference (set externally)
        this.camera = { x: 0, y: 0 };

        // Click processing callbacks
        this.callbacks = {
            onCategoryIndicatorClick: null,
            onCategorySelect: null,
            onCategoryPickerClose: null,
            onQuizOptionClick: null,
            onReviewButtonClick: null,
            onReviewModeClick: null,
            onOverlandClick: null, // (x, y) => void - Overland mode click handler
            onGameClick: null, // (x, y) => boolean (handled?)
            onHamburgerClick: null,
            onMenuItemClick: null // (itemId) => void
        };

        // Bind event handlers
        this._handleClick = this._handleClick.bind(this);

        // Attach listener
        canvas.addEventListener('click', this._handleClick);
    }

    /**
     * Set callbacks for various click actions
     * @param {Object} callbacks - Object containing callback functions
     */
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }

    /**
     * Set the camera reference for coordinate conversion
     * @param {Object} camera - Camera object with x, y
     */
    setCamera(camera) {
        this.camera = camera;
    }

    /**
     * Get the current movement target in world coordinates
     * @returns {{x: number, y: number} | null}
     */
    getWorldTarget() {
        if (this.worldTargetX === null || this.worldTargetY === null) {
            return null;
        }
        return { x: this.worldTargetX, y: this.worldTargetY };
    }

    /**
     * Clear the movement target (player has arrived)
     */
    clearTarget() {
        this.worldTargetX = null;
        this.worldTargetY = null;
    }

    /**
     * Internal click handler
     * @param {MouseEvent} event 
     */
    _handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        const clickedY = event.clientY - rect.top;

        // Dispatch to appropriate handler based on game mode
        // Note: gameMode is a global variable from game.js
        if (typeof gameMode !== 'undefined' && gameMode === 'review') {
            if (this.callbacks.onReviewModeClick) {
                this.callbacks.onReviewModeClick(event);
            }
            return;
        }

        // Handle VOTD modes
        if (typeof gameMode !== 'undefined' && gameMode === 'votd') {
            if (typeof votdMode !== 'undefined' && votdMode === 'learning' && typeof VotdLearningMode !== 'undefined') {
                VotdLearningMode.handleClick(clickedX, clickedY);
            } else if (typeof votdMode !== 'undefined' && votdMode === 'test' && typeof VotdTestMode !== 'undefined') {
                VotdTestMode.handleClick(clickedX, clickedY);
            }
            return;
        }
        
        // Handle Overland (mission selection) mode
        if (typeof gameMode !== 'undefined' && gameMode === 'overland') {
            if (this.callbacks.onOverlandClick) {
                this.callbacks.onOverlandClick(clickedX, clickedY);
            }
            return;
        }

        // Game mode clicks
        this._handleGameModeClick(clickedX, clickedY);
    }

    /**
     * Handle clicks during game mode
     * @param {number} clickedX 
     * @param {number} clickedY 
     */
    _handleGameModeClick(clickedX, clickedY) {
        const { QUALITY_LINE_HEIGHT, BUTTON_HEIGHT, BUTTON_WIDTH, ANSWER_SECTION_HEIGHT } = this.constants;

        // Check if VerseTestScreen is active (highest priority overlay)
        if (typeof VerseTestScreen !== 'undefined' && VerseTestScreen.isActive()) {
            VerseTestScreen.handleClick(clickedX, clickedY, this.canvas.width, this.canvas.height);
            return;
        }

        // Check if goals overlay is visible (dismiss on any click)
        if (typeof goalsOverlayVisible !== 'undefined' && goalsOverlayVisible) {
            goalsOverlayVisible = false;
            return;
        }

        // Check if game-over modal is visible (highest priority)
        if (this.gameOverModalVisible && this.restartButtonRect) {
            const { x: btnX, y: btnY, width: btnW, height: btnH } = this.restartButtonRect;

            if (clickedX >= btnX && clickedX <= btnX + btnW &&
                clickedY >= btnY && clickedY <= btnY + btnH) {
                // Delegate to callback so game.js can handle missions vs solo vs multiplayer
                console.log('[INPUT] Game over button clicked. Has callback?', !!this.callbacks.onGameOverButtonClick, 'Callbacks:', Object.keys(this.callbacks));
                if (this.callbacks.onGameOverButtonClick) {
                    console.log('[INPUT] Calling onGameOverButtonClick callback');
                    this.callbacks.onGameOverButtonClick();
                } else if (typeof isSoloGame !== 'undefined' && !isSoloGame) {
                    console.log("Returning to lobby...");
                    window.location.href = '/lobby';
                } else {
                    console.log("Restarting game...");
                    window.location.reload();
                }
                return;
            }
            // Click anywhere else on modal is consumed (no action behind modal)
            return;
        }

        // Check hamburger menu button (top-right)
        const hb = UILayout.hamburgerButton;
        const hamburgerBtnX = UILayout.getHamburgerButtonX(this.canvas.width);
        if (
            clickedX >= hamburgerBtnX &&
            clickedX <= hamburgerBtnX + hb.width &&
            clickedY >= hb.y &&
            clickedY <= hb.y + hb.height
        ) {
            if (this.callbacks.onHamburgerClick) {
                this.callbacks.onHamburgerClick();
            }
            return;
        }

        // Check Learn Verses button (center of top bar)
        const lb = UILayout.learnVersesButton;
        const learnBtnX = (this.canvas.width - lb.width) / 2;
        if (
            clickedX >= learnBtnX &&
            clickedX <= learnBtnX + lb.width &&
            clickedY >= lb.y &&
            clickedY <= lb.y + lb.height
        ) {
            if (this.callbacks.onMenuItemClick) {
                this.callbacks.onMenuItemClick('review');
            }
            return;
        }

        // Check menu panel items (if menu is open)
        if (typeof menuOpen !== 'undefined' && menuOpen) {
            const mp = UILayout.menuPanel;
            const panelX = UILayout.getMenuPanelX(this.canvas.width);
            const panelY = mp.topOffset;
            const itemH = mp.itemHeight;
            const padding = mp.padding;

            // Review button area (first item)
            const reviewY = panelY + padding;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= reviewY &&
                clickedY <= reviewY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('review');
                }
                return;
            }

            // Play/Pause button area (second item)
            const playPauseY = panelY + padding + itemH + padding / 2;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= playPauseY &&
                clickedY <= playPauseY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('playPause');
                }
                return;
            }

            // Next Song button area (third item)
            const nextSongY = panelY + padding + (itemH + padding / 2) * 2;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= nextSongY &&
                clickedY <= nextSongY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('nextSong');
                }
                return;
            }

            // Goals button area (fourth item)
            const goalsY = panelY + padding + (itemH + padding / 2) * 3;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= goalsY &&
                clickedY <= goalsY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('goals');
                }
                return;
            }

            // Verse of the Day button area (fifth item)
            const verseCotDY = panelY + padding + (itemH + padding / 2) * 4;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= verseCotDY &&
                clickedY <= verseCotDY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('verseCotD');
                }
                return;
            }

            // Verse Test button area (sixth item)
            const verseTestY = panelY + padding + (itemH + padding / 2) * 5;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= verseTestY &&
                clickedY <= verseTestY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('verseTest');
                }
                return;
            }

            // Toggle Test Shield button area (seventh item)
            const toggleShieldY = panelY + padding + (itemH + padding / 2) * 6;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= toggleShieldY &&
                clickedY <= toggleShieldY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('toggleTestShield');
                }
                return;
            }

            // Leave Game button area (eighth item)
            const leaveY = panelY + padding + (itemH + padding / 2) * 7;
            if (
                clickedX >= panelX + padding &&
                clickedX <= panelX + mp.width - padding &&
                clickedY >= leaveY &&
                clickedY <= leaveY + itemH
            ) {
                if (this.callbacks.onMenuItemClick) {
                    this.callbacks.onMenuItemClick('leave');
                }
                return;
            }

            // Click outside menu items but inside panel - just close menu
            const itemCount = 8;
            if (
                clickedX >= panelX &&
                clickedX <= panelX + mp.width &&
                clickedY >= panelY &&
                clickedY <= panelY + itemH * itemCount + padding * (itemCount + 1)
            ) {
                if (this.callbacks.onHamburgerClick) {
                    this.callbacks.onHamburgerClick(); // Toggle off
                }
                return;
            }
        }
        // Check category picker (if open, it's a modal overlay — consume all clicks)
        if (typeof categoryPickerOpen !== 'undefined' && categoryPickerOpen) {
            const cp = UILayout.categoryPicker;
            const panelX = UILayout.getCategoryPickerX(this.canvas.width);
            const panelY = UILayout.getCategoryPickerY(this.canvas.height);
            const categories = (typeof QUALITIES !== 'undefined') ? QUALITIES : [];
            const cols = cp.columns;
            const rows = Math.ceil(categories.length / cols);
            const colWidth = (cp.width - cp.padding * 2 - cp.itemSpacing * (cols - 1)) / cols;
            const panelH = cp.padding + rows * (cp.itemHeight + cp.itemSpacing) + cp.padding + 30;

            // Check if click is inside a category item
            let clickedCategory = false;
            for (let idx = 0; idx < categories.length; idx++) {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const itemX = panelX + cp.padding + col * (colWidth + cp.itemSpacing);
                const itemY = panelY + 30 + cp.padding + row * (cp.itemHeight + cp.itemSpacing);

                if (clickedX >= itemX && clickedX <= itemX + colWidth &&
                    clickedY >= itemY && clickedY <= itemY + cp.itemHeight) {
                    if (this.callbacks.onCategorySelect) {
                        this.callbacks.onCategorySelect(categories[idx]);
                    }
                    clickedCategory = true;
                    break;
                }
            }

            // Any click (inside or outside panel) closes the picker
            if (!clickedCategory && this.callbacks.onCategoryPickerClose) {
                this.callbacks.onCategoryPickerClose();
            }
            return;
        }

        // Check category indicator tap (top bar)
        {
            const ci = UILayout.categoryIndicator;
            if (clickedX >= ci.x && clickedX <= ci.x + ci.maxWidth &&
                clickedY >= ci.y && clickedY <= ci.y + ci.height) {
                if (this.callbacks.onCategoryIndicatorClick) {
                    this.callbacks.onCategoryIndicatorClick();
                }
                return;
            }
        }

        // Check cloze letter buttons FIRST (before movement target)
        if (typeof currentQuiz !== 'undefined' && currentQuiz && currentQuiz.mode === 'cloze' &&
            currentQuiz.letterOptions && !currentQuiz.isComplete && !currentQuiz.showFullAnswer) {

            const canvasWidth = this.canvas.width;

            // Must match letter button layout in Renderer.displayClozeOptions
            const letterBtnHeight = 24;
            const letterBtnWidth = 44;
            const letterBtnSpacing = 5;
            const letterY = this.canvas.height - letterBtnHeight - 6;

            const letterButtons = currentQuiz.letterOptions || [];
            const totalButtonsWidth = letterButtons.length * letterBtnWidth + (letterButtons.length - 1) * letterBtnSpacing;
            const letterStartX = (canvasWidth - totalButtonsWidth) / 2;

            for (let i = 0; i < letterButtons.length; i++) {
                const letter = letterButtons[i];
                const btnX = letterStartX + i * (letterBtnWidth + letterBtnSpacing);

                if (
                    clickedX >= btnX &&
                    clickedX <= btnX + letterBtnWidth &&
                    clickedY >= letterY &&
                    clickedY <= letterY + letterBtnHeight
                ) {
                    if (typeof dbg === 'function') dbg('CLICK', `cloze letter '${letter}' at (${clickedX.toFixed(0)},${clickedY.toFixed(0)}) btnY=${letterY}`);
                    if (typeof QuizManager !== 'undefined' && QuizManager.handleClozeLetterSelect) {
                        QuizManager.handleClozeLetterSelect(letter);
                    }
                    return;
                }
            }
        }

        // Update movement target for playable area clicks
        {
            const playableTop = QUALITY_LINE_HEIGHT + BUTTON_HEIGHT;
            const playableBottom = this.canvas.height - ANSWER_SECTION_HEIGHT - 14;

            if (clickedY > playableTop && clickedY < playableBottom) {
                // Check if external handler wants to process this click first (e.g., shooting)
                let handled = false;
                if (this.callbacks.onGameClick) {
                    handled = this.callbacks.onGameClick(clickedX, clickedY);
                }

                // Only update movement target if not handled
                if (!handled) {
                    // Convert screen coords to world coords at click time
                    this.worldTargetX = clickedX + this.camera.x;
                    this.worldTargetY = clickedY + this.camera.y;
                    if (typeof dbg === 'function') dbg('CLICK', `move target set world=(${this.worldTargetX.toFixed(0)},${this.worldTargetY.toFixed(0)}) screen=(${clickedX.toFixed(0)},${clickedY.toFixed(0)}) playArea=${playableTop}-${playableBottom}`);
                }
            } else {
                if (typeof dbg === 'function') dbg('CLICK', `outside playable area screen=(${clickedX.toFixed(0)},${clickedY.toFixed(0)}) playArea=${playableTop}-${playableBottom}`);
            }
        }

        // Check quiz option buttons (reads from currentQuiz global)
        if (typeof currentQuiz !== 'undefined' && currentQuiz && currentQuiz.options && typeof ctx !== 'undefined') {
            const qo = UILayout.quizOptions;
            const optionStartX = qo.startX;
            const buttonHeight = qo.height;
            const buttonSpacing = qo.spacing;
            const buttonY = UILayout.getQuizButtonY(this.canvas.height);

            const optionCount = currentQuiz.options.length;

            // Button sizing: true/false=70px, missing word=65px, others=49px (must match Renderer)
            let buttonWidth;
            if (optionCount === 2) {
                buttonWidth = 70;  // True/false
            } else if (optionCount === 4) {
                buttonWidth = 65;  // Missing word
            } else {
                buttonWidth = qo.width;  // Default
            }

            ctx.font = 'bold 16px Arial'; // Must match Renderer.displayQuizOptions font for label
            const labelText = currentQuiz.questionLabel || '';
            const labelTextWidth = ctx.measureText(labelText).width;
            const maxLabelWidth = this.canvas.width - optionStartX - (qo.rightPadding || 7) - (optionCount * buttonWidth + (optionCount - 1) * buttonSpacing) - 14;


            // Calculate label width (accounting for possible 2-line wrapping)
            let labelWidth = labelTextWidth;
            if (labelTextWidth > maxLabelWidth) {
                // Label wraps to 2 lines, calculate actual width
                const words = labelText.split(' ');
                let line1 = '';
                let currentLine = '';

                for (let i = 0; i < words.length; i++) {
                    const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
                    const testWidth = ctx.measureText(testLine).width;

                    if (testWidth > maxLabelWidth && currentLine.length > 0) {
                        line1 = currentLine;
                        currentLine = words[i];
                    } else {
                        currentLine = testLine;
                    }
                }

                const line2 = currentLine;
                labelWidth = Math.max(
                    ctx.measureText(line1).width,
                    ctx.measureText(line2).width
                );
            }

            for (let i = 0; i < optionCount; i++) {
                const buttonX = optionStartX + labelWidth + 14 + i * (buttonWidth + buttonSpacing);


                if (
                    clickedX >= buttonX &&
                    clickedX <= buttonX + buttonWidth &&
                    clickedY >= buttonY &&
                    clickedY <= buttonY + buttonHeight
                ) {
                    if (typeof dbg === 'function') dbg('CLICK', `quiz option '${currentQuiz.options[i]}' at (${clickedX.toFixed(0)},${clickedY.toFixed(0)}) btnY=${buttonY}`);
                    if (this.callbacks.onQuizOptionClick) {
                        this.callbacks.onQuizOptionClick(currentQuiz.options[i], i);
                    }
                    return;
                }
            }
        }

    }

    /**
     * Clean up event listeners
     */
    destroy() {
        this.canvas.removeEventListener('click', this._handleClick);
    }
}
