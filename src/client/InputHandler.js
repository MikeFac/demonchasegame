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
            onGameClick: null // (x, y) => boolean (handled?)
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

        // Check quiz option buttons
        if (typeof mcOptions !== 'undefined' && typeof ctx !== 'undefined') {
            const optionStartX = 7;
            const optionStartY = this.canvas.height - ANSWER_SECTION_HEIGHT - 10;
            const buttonWidth = 49;
            const buttonHeight = 21;
            const buttonSpacing = 7;

            const textWidth = ctx.measureText('First letters of missing words are:').width;
            for (let i = 0; i < mcOptions.length; i++) {
                const buttonX = optionStartX + textWidth + 14 + i * (buttonWidth + buttonSpacing);
                const buttonY = optionStartY;

                if (
                    clickedX >= buttonX &&
                    clickedX <= buttonX + buttonWidth &&
                    clickedY >= buttonY &&
                    clickedY <= buttonY + buttonHeight
                ) {
                    if (this.callbacks.onQuizOptionClick) {
                        this.callbacks.onQuizOptionClick(mcOptions[i], i);
                    }
                    break;
                }
            }
        }

        // Check review button
        const reviewButtonWidth = 60;
        const reviewButtonHeight = 13;
        const reviewButtonX = this.canvas.width - reviewButtonWidth - 20;
        const reviewButtonY = 29;

        if (
            clickedX >= reviewButtonX &&
            clickedX <= reviewButtonX + reviewButtonWidth &&
            clickedY >= reviewButtonY &&
            clickedY <= reviewButtonY + reviewButtonHeight
        ) {
            if (this.callbacks.onReviewButtonClick) {
                this.callbacks.onReviewButtonClick();
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
