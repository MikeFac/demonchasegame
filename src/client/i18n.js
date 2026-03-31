/**
 * i18n - Internationalization module for VerseBattles.
 *
 * Loads a locale JSON file and provides translation functions.
 * Must be loaded BEFORE other game scripts.
 *
 * Usage:
 *   t('ui.correct')            → "Correct!"
 *   t('stats.levelReached', 5) → "Level Reached: 5"
 *   tDemon('Fear')             → "Fear" (or localized name)
 *   tCategory('Faith')         → "Faith" (or localized name)
 */
const I18n = (function () {
    let _strings = {};
    let _loaded = false;
    let _lang = 'en';
    
    // Minimal English fallback for offline use
    const _fallbackStrings = {
        ui: {
            correct: "Correct!",
            incorrect: "Incorrect!",
            gameOver: "GAME OVER",
            gameOverTitle: "Game Over",
            restart: "Restart",
            menu: "Menu",
            learnVersesHere: "Learn Verses Here",
            playAgain: "Play Again",
            returnToMenu: "Return to Menu",
            ghost: "Ghost",
            offline: "Offline"
        },
        menu: {
            solo: "Solo Game",
            multiplayer: "Multiplayer",
            options: "Options",
            back: "Back",
            songs: "🎵 Songs",
            affinityHelp: "📘 Affinity Help",
            languageCompact: "Language",
            viewMode: "View",
            view2d: "2D Classic",
            view3d: "3D Experimental",
            switchTo2d: "🧭 Switch to 2D",
            switchTo3d: "🧭 Switch to 3D"
        },
        toasts: {
            offlineMode: "Offline mode enabled",
            earnAmmo: "Answer correctly to earn ammo!",
            quizTipDamage: "Answer quiz to damage demon!",
            goToMenuLearn: "Go to menu to learn verses first",
            settingsDifficultyHint: "Monster speed and difficulty can be adjusted in Options.",
            healingCrosses: "Collect crosses to heal!",
            multiplayerRequiresInternet: "Multiplayer requires internet",
            thanksForSharing: "Thanks for sharing!",
            shareCopied: "Share link copied!"
        },
        stats: {
            levelReached: "Level Reached: {0}",
            monstersKilled: "Monsters Killed: {0}",
            versesLearned: "Verses Learned: {0}",
            timePlayed: "Time Played: {0}"
        }
    };

    /**
     * Determine which locale to load.
     * Priority: URL ?lang=xx > localStorage > default 'en'
     */
    function _detectLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang) return urlLang;

        const stored = localStorage.getItem('lang');
        if (stored) return stored;

        return 'en';
    }

    /**
     * Load locale synchronously (for initial page load).
     * Uses XMLHttpRequest to ensure strings are available before rendering.
     * Falls back to inline fallback strings when offline.
     */
    function loadSync(langCode) {
        _lang = langCode || _detectLanguage();
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/locales/' + _lang + '.json', false); // synchronous
            xhr.send();
            if (xhr.status === 200) {
                _strings = JSON.parse(xhr.responseText);
                _loaded = true;
                localStorage.setItem('lang', _lang);
                return;
            } else if (_lang !== 'en') {
                console.warn('i18n: locale "' + _lang + '" not found, falling back to "en"');
                xhr.open('GET', '/locales/en.json', false);
                xhr.send();
                if (xhr.status === 200) {
                    _strings = JSON.parse(xhr.responseText);
                    _loaded = true;
                    localStorage.setItem('lang', 'en');
                    return;
                }
            }
        } catch (e) {
            console.warn('i18n: XHR failed, using fallback strings:', e.message);
        }
        
        // Use inline fallback strings when network fails
        _strings = _fallbackStrings;
        _loaded = true;
        console.log('i18n: using fallback strings for offline mode');
    }

    /**
     * Load a locale JSON file asynchronously (for switching languages at runtime).
     */
    async function load(langCode) {
        _lang = langCode || _detectLanguage();
        try {
            const resp = await fetch(`/locales/${_lang}.json`);
            if (!resp.ok) {
                console.warn(`i18n: locale "${_lang}" not found, falling back to "en"`);
                if (_lang !== 'en') {
                    const fallback = await fetch('/locales/en.json');
                    if (fallback.ok) {
                        _strings = await fallback.json();
                    } else {
                        _strings = _fallbackStrings;
                    }
                } else {
                    _strings = _fallbackStrings;
                }
            } else {
                _strings = await resp.json();
            }
            _loaded = true;
            localStorage.setItem('lang', _lang);
        } catch (e) {
            console.warn('i18n: fetch failed, using fallback strings:', e);
            _strings = _fallbackStrings;
            _loaded = true;
        }
    }

    /**
     * Look up a translation key using dot-notation.
     * Supports {0}, {1}, ... parameter substitution.
     *
     * @param {string} key - e.g. 'ui.correct' or 'stats.levelReached'
     * @param {...*} args - substitution values
     * @returns {string}
     */
    function t(key, ...args) {
        const parts = key.split('.');
        let val = _strings;
        for (const part of parts) {
            if (val && typeof val === 'object' && part in val) {
                val = val[part];
            } else {
                // Key not found — return the key itself as fallback
                return key;
            }
        }
        if (typeof val !== 'string') return key;

        // Substitute {0}, {1}, etc.
        if (args.length > 0) {
            return val.replace(/\{(\d+)\}/g, (match, idx) => {
                const i = parseInt(idx, 10);
                return i < args.length ? args[i] : match;
            });
        }
        return val;
    }

    /**
     * Get localized demon display name.
     * @param {string} demonKey - English key, e.g. 'Fear'
     * @returns {string}
     */
    function tDemon(demonKey) {
        if (_strings.demons && _strings.demons[demonKey]) {
            return _strings.demons[demonKey];
        }
        return demonKey;
    }

    /**
     * Get localized category/quality display name.
     * @param {string} catKey - English key, e.g. 'Faith'
     * @returns {string}
     */
    function tCategory(catKey) {
        if (_strings.categories && _strings.categories[catKey]) {
            return _strings.categories[catKey];
        }
        return catKey;
    }

    /**
     * Get tutorial pages array for the current locale.
     * @returns {Array}
     */
    function getTutorialPages() {
        if (_strings.tutorial && _strings.tutorial.pages) {
            return _strings.tutorial.pages;
        }
        return [];
    }

    /**
     * Get quick-start overlay data.
     * @returns {Object}
     */
    function getQuickStart() {
        return _strings.quickStart || {};
    }

    /**
     * Update all DOM elements with [data-i18n] or [data-i18n-placeholder] attributes.
     */
    function updateDOM() {
        if (!_loaded) {
            console.warn('i18n: attempt to update DOM before strings were loaded');
            return;
        }

        // 1. Handle elements with text content translations
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const argsStr = el.getAttribute('data-i18n-args');
            let args = [];
            if (argsStr) {
                args = argsStr.split(',').map(s => s.trim());
            }

            const translation = t(key, ...args);
            if (translation !== key) {
                if (el.tagName === 'OPTION') {
                    el.text = translation;
                } else if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                    el.value = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // 2. Handle elements with placeholder translations
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation !== key) {
                el.placeholder = translation;
            }
        });
    }

    /** Get the current language code */
    function getLang() {
        return _lang;
    }

    /** Check if strings are loaded */
    function isLoaded() {
        return _loaded;
    }

    return {
        loadSync,
        load,
        t,
        tDemon,
        tCategory,
        getTutorialPages,
        getQuickStart,
        updateDOM,
        getLang,
        isLoaded
    };
})();

// Expose globally
window.I18n = I18n;
window.t = I18n.t;
window.tDemon = I18n.tDemon;
window.tCategory = I18n.tCategory;
