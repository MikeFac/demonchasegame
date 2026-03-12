// VotdMenuOverlay.js - Show VOTD on main menu screen
// Displays VOTD overlay on page load, with Learn/Dismiss options
(function () {
    const VOTD_MENU_ENABLED_KEY = 'votdMenuEnabled';

    function isVOTDMenuEnabled() {
        return localStorage.getItem(VOTD_MENU_ENABLED_KEY) === 'true';
    }

    function setVOTDMenuEnabled(enabled) {
        localStorage.setItem(VOTD_MENU_ENABLED_KEY, enabled ? 'true' : 'false');
    }

    /**
     * Show VOTD overlay on main menu
     */
    function showVOTDOverlay() {
        console.log('showVOTDOverlay called');

        if (!isVOTDMenuEnabled()) {
            console.log('VOTD menu overlay disabled in settings');
            return;
        }

        // Get today's verse (requires VersOfTheDayManager)
        if (typeof VersOfTheDayManager === 'undefined') {
            console.error('VersOfTheDayManager not loaded');
            return;
        }

        // Check if game is already running (First Time User Experience)
        const canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.style.display === 'block') {
            console.log('Game is running (FTUE), suppressing VOTD overlay');
            return;
        }

        const verse = VersOfTheDayManager.getTodayVerse();
        if (!verse) {
            console.error('No verse returned from VersOfTheDayManager');
            return;
        }

        console.log('Showing VOTD:', verse.Reference);

        // Populate modal
        const refEl = document.getElementById('votdReference');
        const textEl = document.getElementById('votdText');
        const modal = document.getElementById('votdModal');

        if (!refEl || !textEl || !modal) {
            console.error('VOTD modal elements not found:', { refEl: !!refEl, textEl: !!textEl, modal: !!modal });
            return;
        }

        refEl.textContent = verse.Reference;
        textEl.textContent = verse.Text;

        // Show streak info
        const streakEl = document.getElementById('votdStreak');
        if (streakEl) {
            const streak = VersOfTheDayManager.getStreak();
            if (streak > 0) {
                streakEl.textContent = t('votd.dayStreak', streak);
            } else {
                streakEl.textContent = t('votd.startYourStreak');
                streakEl.style.color = '#aaa';
            }
        }

        // Show modal
        modal.style.display = 'flex';
        console.log('VOTD modal displayed');
    }

    /**
     * Hide VOTD overlay
     */
    function hideVOTDOverlay() {
        const modal = document.getElementById('votdModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // If user is on missions screen (overland), don't start a game
        const onMissionsScreen = (window.gameMode === 'overland');
        if (onMissionsScreen) {
            console.log('User is on missions screen, not starting game');
            return;
        }

        // Clear votdAutoLaunch flag since we're not going to VOTD learning mode
        localStorage.removeItem('votdAutoLaunch');
    }

    /**
     * Start learning (show game with VOTD)
     */
    function learnVOTD() {
        hideVOTDOverlay();

        // Set flag to auto-launch VOTD learning mode when game loads
        localStorage.setItem('votdAutoLaunch', 'true');

        // Start solo game - the game will check votdAutoLaunch flag
        const btnSolo = document.getElementById('btnSolo');
        if (btnSolo) {
            btnSolo.click();
            console.log('Learn clicked, votdAutoLaunch flag set');
        }
    }

    /**
     * Initialize event handlers
     */
    function init() {
        console.log('VotdMenuOverlay init called');

        const learnBtn = document.getElementById('votdLearnBtn');
        const dismissBtn = document.getElementById('votdDismissBtn');

        if (learnBtn) {
            learnBtn.addEventListener('click', learnVOTD);
        } else {
            console.error('votdLearnBtn not found in DOM');
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', hideVOTDOverlay);
        } else {
            console.error('votdDismissBtn not found in DOM');
        }

        // Show VOTD after splash screen (Splash at 3000ms + 500ms fade + 0.5s hold)
        setTimeout(showVOTDOverlay, 4000);
    }

    /**
     * Public API
     */
    window.VotdMenuOverlay = {
        show: showVOTDOverlay,
        hide: hideVOTDOverlay,
        learn: learnVOTD,
        isEnabled: isVOTDMenuEnabled,
        setEnabled: setVOTDMenuEnabled
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
