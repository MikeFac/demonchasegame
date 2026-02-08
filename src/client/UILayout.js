/**
 * UILayout - Single source of truth for all UI element positions and dimensions.
 * Both Renderer.js (drawing) and InputHandler.js (click detection) reference this
 * to ensure coordinates always match.
 *
 * Depends on window.Constants being loaded first.
 */
const UILayout = (function() {
    const C = window.Constants || {};
    const QUALITY_LINE_HEIGHT = C.QUALITY_LINE_HEIGHT || 45;
    const BUTTON_WIDTH = C.BUTTON_WIDTH || 84;
    const BUTTON_HEIGHT = C.BUTTON_HEIGHT || 21;
    const BUTTON_PADDING = C.BUTTON_PADDING || 4;
    const ANSWER_SECTION_HEIGHT = C.ANSWER_SECTION_HEIGHT || 17;

    return {
        // Base constants (from Constants.js, re-exported for convenience)
        QUALITY_LINE_HEIGHT,
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        BUTTON_PADDING,
        ANSWER_SECTION_HEIGHT,

        // Playable area boundaries
        playableTop: QUALITY_LINE_HEIGHT + BUTTON_HEIGHT,

        // Hamburger menu button - moved below quality buttons
        hamburgerButton: {
            width: 28,
            height: 24,
            rightOffset: 35,
            y: 30  // Below quality buttons (y=5 + height=21 = 26, so y=30)
        },

        // Menu panel (when hamburger is open) - starts under the hamburger button, extends left
        menuPanel: {
            width: 160,
            rightOffset: 35,
            topOffset: 58,  // hamburger y (30) + height (24) + 4px gap = 58
            itemHeight: 32,
            padding: 8
        },

        // Quality buttons
        qualityButtons: {
            spacing: 7,
            y: 5,
            rightMargin: 7,
            horizontalOffset: 8
        },

        // Quiz option buttons
        quizOptions: {
            width: 49,
            height: 21,
            spacing: 7,
            startX: 7,
            bottomOffset: 23
        },

        // Inventory button (floating "i" icon) - moved to LEFT side under top bars
        inventoryButton: {
            leftOffset: 7,
            topOffset: QUALITY_LINE_HEIGHT + BUTTON_HEIGHT + 5,
            size: 28
        },

        // Inventory panel
        inventoryPanel: {
            leftOffset: 7,
            topOffset: QUALITY_LINE_HEIGHT + BUTTON_HEIGHT + 38,
            width: 150,
            height: 70
        },

        // Inventory "Use" button (offsets relative to panel top-left)
        inventoryUseButton: {
            xOffsetInPanel: 100,
            yOffsetInPanel: 30,
            width: 40,
            height: 22
        },

        // Helper methods for computed positions
        getHamburgerButtonX(canvasWidth) {
            return canvasWidth - this.hamburgerButton.rightOffset;
        },

        getMenuPanelX(canvasWidth) {
            // Right-align panel with hamburger button's right edge
            const hamburgerRight = canvasWidth - this.hamburgerButton.rightOffset + this.hamburgerButton.width;
            return hamburgerRight - this.menuPanel.width;
        },


        getQualityButtonStartX(canvasWidth, buttonCount) {
            return canvasWidth - (buttonCount * (BUTTON_WIDTH + this.qualityButtons.spacing)) - this.qualityButtons.rightMargin + this.qualityButtons.horizontalOffset;
        },

        getInventoryButtonX() {
            return this.inventoryButton.leftOffset;
        },

        getInventoryPanelX() {
            return this.inventoryPanel.leftOffset;
        },

        getQuizButtonY(canvasHeight) {
            return canvasHeight - this.quizOptions.bottomOffset;
        }
    };
})();

window.UILayout = UILayout;
