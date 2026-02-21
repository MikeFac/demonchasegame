// VotdMenuOverlay.js - Show VOTD on main menu screen
// Displays VOTD overlay on page load, with Learn/Dismiss options
(function () {
    /**
     * Show VOTD overlay on main menu
     */
    function showVOTDOverlay() {
        console.log('showVOTDOverlay called');

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

        // Always show VOTD on page load
        setTimeout(showVOTDOverlay, 500);
    }

    /**
     * Public API
     */
    window.VotdMenuOverlay = {
        show: showVOTDOverlay,
        hide: hideVOTDOverlay,
        learn: learnVOTD
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
