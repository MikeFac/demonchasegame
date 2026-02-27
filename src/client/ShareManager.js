// ShareManager.js - Social sharing functionality
// IIFE pattern, sets window.ShareManager
(function () {
    const GAME_URL = 'https://dcgame.4you.tel';
    const GAME_NAME = 'VerseBattles: Demon Chase';

    /**
     * Share content using Web Share API (mobile) or clipboard (desktop)
     * @param {Object} options - Share options
     * @param {string} options.title - Share title
     * @param {string} options.text - Share text
     * @param {string} [options.url] - Share URL (defaults to game URL)
     */
    async function share(options) {
        const shareData = {
            title: options.title || GAME_NAME,
            text: options.text,
            url: options.url || GAME_URL
        };

        // Try Web Share API first (mobile-friendly)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Shared successfully via Web Share API');
                return { success: true, method: 'native' };
            } catch (err) {
                // User cancelled or error occurred
                if (err.name === 'AbortError') {
                    console.log('Share cancelled by user');
                    return { success: false, cancelled: true };
                }
                console.error('Web Share API failed:', err);
                // Fall through to clipboard
            }
        }

        // Fallback: Copy to clipboard
        try {
            const fullText = `${shareData.text}\n\n${shareData.url}`;
            await navigator.clipboard.writeText(fullText);
            console.log('Copied to clipboard');
            return { success: true, method: 'clipboard' };
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            return { success: false, error: err };
        }
    }

    /**
     * Share a Bible verse that was studied/learned
     */
    function shareVerse(verseReference, verseText) {
        const text = `📖 Just studied this verse:\n\n"${verseText}"\n- ${verseReference}\n\nLearning Scripture through ${GAME_NAME}! 🛡️`;
        return share({
            title: `${verseReference} - ${GAME_NAME}`,
            text: text
        });
    }

    /**
     * Share devotional completion
     */
    function shareDevotional(verseReference) {
        const text = `🙏 Just read a powerful devotional on ${verseReference}!\n\nDeepening my faith through ${GAME_NAME}. Join me!`;
        return share({
            title: `Devotional: ${verseReference}`,
            text: text
        });
    }

    /**
     * Share verse-of-the-day learning
     */
    function shareVotd(verseReference) {
        const text = `⭐ Today's verse: ${verseReference}\n\nMemorizing Scripture daily with ${GAME_NAME}!`;
        return share({
            title: `Verse of the Day - ${verseReference}`,
            text: text
        });
    }

    /**
     * Share after defeating a demon
     */
    function shareDemonVictory(demonName, verseReference) {
        const text = `⚔️ I just defeated ${demonName} with ${verseReference}!\n\nHiding God's Word in my heart through ${GAME_NAME}. 🛡️`;
        return share({
            title: `Defeated ${demonName}!`,
            text: text
        });
    }

    /**
     * General invitation to play
     */
    function shareInvite() {
        const text = `🎮 Join me in ${GAME_NAME}!\n\nFight demons with Scripture. Memorize verses. Grow in faith.\n\nPlay solo or with friends! 🛡️`;
        return share({
            title: GAME_NAME,
            text: text
        });
    }

    /**
     * Show a temporary success message on canvas
     */
    function showShareSuccess(method) {
        if (typeof flashMessages !== 'undefined') {
            const message = method === 'native'
                ? '📤 Shared!'
                : '📋 Copied to clipboard!';

            flashMessages.push({
                text: message,
                color: '#4CAF50',
                x: canvas.width / 2,
                y: canvas.height / 2,
                startTime: Date.now(),
                duration: 2000,
                fontSize: 18,
                centered: true
            });
        }
    }

    // Public interface
    window.ShareManager = {
        share,
        shareVerse,
        shareDevotional,
        shareVotd,
        shareDemonVictory,
        shareInvite,
        showShareSuccess
    };
})();
