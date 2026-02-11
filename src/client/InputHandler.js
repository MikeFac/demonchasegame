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
            onQualityButtonClick: null,
            onQuizOptionClick: null,
            onReviewButtonClick: null,
            onReviewModeClick: null,
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
                // Restart game
                console.log("Restarting game...");
                window.location.reload();  // Simple restart via page reload
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

            // Verse Test button area (fifth item)
            const verseTestY = panelY + padding + (itemH + padding / 2) * 4;
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

            // Toggle Test Shield button area (sixth item)
            const toggleShieldY = panelY + padding + (itemH + padding / 2) * 5;
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

            // Click outside menu items but inside panel - just close menu
            const itemCount = 6;
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
        // Check quality buttons (passed from game.js)
        if (typeof qualityButtons !== 'undefined') {
            let clickedOnButton = false;
            qualityButtons.forEach(button => {
                if (
                    clickedX >= button.x &&
                    clickedX <= button.x + BUTTON_WIDTH &&
                    clickedY >= button.y &&
                    clickedY <= button.y + BUTTON_HEIGHT
                ) {
                    clickedOnButton = true;
                    if (this.callbacks.onQualityButtonClick) {
                        this.callbacks.onQualityButtonClick(button.text);
                    }
                }
            });

            // Update movement target only if not clicking a UI element
            if (!clickedOnButton) {
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
                    }
                }
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
            const buttonWidth = optionCount === 2 ? 70 : qo.width;

            ctx.font = '11px Arial'; // Must match Renderer.displayQuizOptions font
            const textWidth = ctx.measureText(currentQuiz.questionLabel || '').width;
            for (let i = 0; i < optionCount; i++) {
                const buttonX = optionStartX + textWidth + 14 + i * (buttonWidth + buttonSpacing);

                if (
                    clickedX >= buttonX &&
                    clickedX <= buttonX + buttonWidth &&
                    clickedY >= buttonY &&
                    clickedY <= buttonY + buttonHeight
                ) {
                    if (this.callbacks.onQuizOptionClick) {
                        this.callbacks.onQuizOptionClick(currentQuiz.options[i], i);
                    }
                    break;
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
