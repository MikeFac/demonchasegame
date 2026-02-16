// VersOfTheDayManager.js - Daily verse selection and bonus tracking
// IIFE pattern, sets window.VersOfTheDayManager
(function () {
    // Private state
    let todayVerse = null;
    let selectedDate = null; // Cache key for today

    /**
     * Get today's date as YYYY-MM-DD
     */
    function getToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Calculate days since Jan 1, 2026
     */
    function daysSinceBaseDate() {
        const today = new Date();
        const baseDate = new Date(2026, 0, 1); // Jan 1, 2026
        const diff = today - baseDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    }

    /**
     * Convert all verses to flat array for rotation
     * ALWAYS uses window.allVerses for consistency (loaded in index.html)
     */
    function getAllVerses() {
        // Use window.allVerses which is loaded in index.html
        // This ensures the same order everywhere (main menu and in-game)
        if (typeof window.allVerses !== 'undefined' && Array.isArray(window.allVerses)) {
            return window.allVerses;
        }

        console.error('window.allVerses not available');
        return [];
    }

    /**
     * Select a verse for today using deterministic rotation
     * Uses: (days since Jan 1, 2026) % total verses
     * Same verse for all users on same day
     */
    function selectVersOfTheDay() {
        const allVersesList = getAllVerses();

        if (allVersesList.length === 0) {
            console.error('No verses available for VOTD selection');
            return null;
        }

        // Days since Jan 1, 2026 as index
        const daysOffset = daysSinceBaseDate();
        const index = daysOffset % allVersesList.length;

        console.log(`VOTD: Day ${daysOffset}, Verse index ${index}/${allVersesList.length}`);
        return allVersesList[index];
    }

    /**
     * Get today's verse, cached in memory
     */
    function getTodayVerse() {
        const today = getToday();

        // If date changed or not cached, select new verse
        if (selectedDate !== today || !todayVerse) {
            selectedDate = today;
            todayVerse = selectVersOfTheDay();
        }

        return todayVerse;
    }

    /**
     * Get damage bonus multiplier (1.2 if earned today, else 1.0)
     */
    function getBonusMultiplier() {
        if (!isBonusActive()) {
            return 1.0;
        }
        return 1.2; // +20% damage
    }

    /**
     * Record that user earned bonus for today
     */
    function earnBonus() {
        const today = getToday();
        const bonusData = {
            date: today,
            earned: true
        };
        localStorage.setItem('votdBonus', JSON.stringify(bonusData));
        console.log('✓ VOTD Bonus earned for ' + today);
    }

    /**
     * Check if bonus is active today
     */
    function isBonusActive() {
        try {
            const stored = localStorage.getItem('votdBonus');
            if (!stored) {
                return false;
            }

            const bonusData = JSON.parse(stored);
            const today = getToday();

            // Bonus only active if earned today
            return bonusData.date === today && bonusData.earned === true;
        } catch (e) {
            console.error('Error checking VOTD bonus:', e);
            return false;
        }
    }

    /**
     * Clear expired bonus if date changed
     */
    function clearExpiredBonus() {
        try {
            const stored = localStorage.getItem('votdBonus');
            if (!stored) {
                return;
            }

            const bonusData = JSON.parse(stored);
            const today = getToday();

            // If stored date != today, clear it
            if (bonusData.date !== today) {
                localStorage.removeItem('votdBonus');
                console.log('✓ VOTD Bonus expired (date changed)');
            }
        } catch (e) {
            console.error('Error clearing expired VOTD bonus:', e);
        }
    }

    /**
     * Public API
     */
    window.VersOfTheDayManager = {
        getToday: getToday,
        getTodayVerse: getTodayVerse,
        selectVersOfTheDay: selectVersOfTheDay,
        getBonusMultiplier: getBonusMultiplier,
        earnBonus: earnBonus,
        isBonusActive: isBonusActive,
        clearExpiredBonus: clearExpiredBonus
    };
})();
