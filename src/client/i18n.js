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
    const _defaultLanguageCapabilities = {
        scriptType: 'alphabetic',
        supportsRomanizedDisplay: false,
        supportsFirstLetterQuiz: true,
        supportsAutoMissingWord: true,
        supportsAutoCloze: true,
        supportedQuizModes: {
            first_letter: true,
            missing_word: true,
            category_match: true,
            true_false: true,
            cloze: true
        }
    };
    const _languageCapabilityOverrides = {
        hi: {
            scriptType: 'abugida',
            supportsRomanizedDisplay: true,
            supportsFirstLetterQuiz: false,
            supportsAutoMissingWord: false,
            supportsAutoCloze: false,
            supportedQuizModes: {
                first_letter: false,
                missing_word: true,
                category_match: true,
                true_false: true,
                cloze: false
            }
        },
        'hi-rom': {
            scriptType: 'romanized-abugida',
            supportsRomanizedDisplay: true,
            supportsFirstLetterQuiz: false,
            supportsAutoMissingWord: false,
            supportsAutoCloze: false,
            supportedQuizModes: {
                first_letter: false,
                missing_word: true,
                category_match: true,
                true_false: true,
                cloze: false
            }
        },
        kr: {
            scriptType: 'hangul',
            supportsRomanizedDisplay: false,
            supportsFirstLetterQuiz: false,
            supportsAutoMissingWord: false,
            supportsAutoCloze: false,
            supportedQuizModes: {
                first_letter: false,
                missing_word: true,
                category_match: true,
                true_false: true,
                cloze: false
            }
        },
        ja: {
            scriptType: 'kana',
            supportsRomanizedDisplay: false,
            supportsFirstLetterQuiz: true,
            supportsAutoMissingWord: false,
            supportsAutoCloze: false,
            supportedQuizModes: {
                first_letter: true,
                missing_word: true,
                category_match: true,
                true_false: true,
                cloze: false
            }
        }
    };
    
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
        quiz: {
            firstLetters: "First letters of missing words:",
            firstKana: "Choose the first kana of the missing words:",
            missingWord: "Fill in the missing word:",
            categoryMatch: "Which quality does this verse teach?",
            trueFalse: "TRUE",
            falseOption: "FALSE",
            cloze: "Fill in the blanks:"
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
        },
        game: {
            verseIs: "This verse is {0}",
            verseIsAbout: "This verse is about {0}",
            combatHintFleeAndLearn: "Flee and Learn",
            strongVsMonster: "{0} strong vs {1}!",
            strong: "STRONG!",
            blocked: "BLOCKED"
        },
        studyPlan: {
            button: "Study Plan",
            title: "Study Plan",
            loading: "Generating study plan...",
            loadingHint: "This may take up to a minute",
            errorTitle: "Could not load study plan",
            retry: "Retry",
            summary: "Summary",
            application: "Application",
            prayer: "Prayer",
            previous: "Previous",
            next: "Next",
            done: "Done",
            questionLabel: "Question {0} of {1}"
        },
        onboarding: {
            demonAttackingTitle: "A demon is attacking!",
            demonAttackingText: "Tap the quiz answer below to fight back.",
            dismissHint: "Tap anywhere or wait to continue..."
        }
    };

    function _getNestedValue(source, key) {
        const parts = key.split('.');
        let val = source;
        for (const part of parts) {
            if (val && typeof val === 'object' && part in val) {
                val = val[part];
            } else {
                return undefined;
            }
        }
        return val;
    }

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
        let val = _getNestedValue(_strings, key);
        if (typeof val !== 'string') {
            val = _getNestedValue(_fallbackStrings, key);
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
     * Resolve a localized category label back to its canonical English key.
     * Returns the original value if no localized match is found.
     * @param {string} categoryValue
     * @returns {string}
     */
    function getCategoryKey(categoryValue) {
        if (typeof categoryValue !== 'string' || !categoryValue) {
            return categoryValue;
        }
        if (_strings.categories && _strings.categories[categoryValue]) {
            return categoryValue;
        }
        if (_strings.categories) {
            for (const [key, label] of Object.entries(_strings.categories)) {
                if (label === categoryValue) {
                    return key;
                }
            }
        }
        return categoryValue;
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

    function getContentLang(langCode) {
        const code = (langCode || _lang || 'en').toLowerCase();
        if (code === 'hi-rom') {
            return 'hi';
        }
        return code;
    }

    function getLanguageCapabilities(langCode) {
        const code = (langCode || _lang || 'en').toLowerCase();
        const capabilities = {
            scriptType: _defaultLanguageCapabilities.scriptType,
            supportsRomanizedDisplay: _defaultLanguageCapabilities.supportsRomanizedDisplay,
            supportsFirstLetterQuiz: _defaultLanguageCapabilities.supportsFirstLetterQuiz,
            supportsAutoMissingWord: _defaultLanguageCapabilities.supportsAutoMissingWord,
            supportsAutoCloze: _defaultLanguageCapabilities.supportsAutoCloze,
            supportedQuizModes: {
                first_letter: _defaultLanguageCapabilities.supportedQuizModes.first_letter,
                missing_word: _defaultLanguageCapabilities.supportedQuizModes.missing_word,
                category_match: _defaultLanguageCapabilities.supportedQuizModes.category_match,
                true_false: _defaultLanguageCapabilities.supportedQuizModes.true_false,
                cloze: _defaultLanguageCapabilities.supportedQuizModes.cloze
            }
        };
        const override = _languageCapabilityOverrides[code];
        const localeOverride = (_strings && _strings.meta && _strings.meta.quizCapabilities && code === _lang.toLowerCase())
            ? _strings.meta.quizCapabilities
            : null;

        function applyOverride(source) {
            if (!source || typeof source !== 'object') return;
            if (typeof source.scriptType === 'string') capabilities.scriptType = source.scriptType;
            if (typeof source.supportsRomanizedDisplay === 'boolean') capabilities.supportsRomanizedDisplay = source.supportsRomanizedDisplay;
            if (typeof source.supportsFirstLetterQuiz === 'boolean') capabilities.supportsFirstLetterQuiz = source.supportsFirstLetterQuiz;
            if (typeof source.supportsAutoMissingWord === 'boolean') capabilities.supportsAutoMissingWord = source.supportsAutoMissingWord;
            if (typeof source.supportsAutoCloze === 'boolean') capabilities.supportsAutoCloze = source.supportsAutoCloze;
            if (source.supportedQuizModes && typeof source.supportedQuizModes === 'object') {
                const modes = source.supportedQuizModes;
                Object.keys(capabilities.supportedQuizModes).forEach(function(mode) {
                    if (typeof modes[mode] === 'boolean') {
                        capabilities.supportedQuizModes[mode] = modes[mode];
                    }
                });
            }
        }

        applyOverride(override);
        applyOverride(localeOverride);

        if (!capabilities.supportedQuizModes.first_letter) {
            capabilities.supportsFirstLetterQuiz = false;
        }
        if (!capabilities.supportedQuizModes.cloze) {
            capabilities.supportsAutoCloze = false;
        }

        return capabilities;
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
        getCategoryKey,
        getTutorialPages,
        getQuickStart,
        updateDOM,
        getLang,
        getContentLang,
        getLanguageCapabilities,
        isLoaded
    };
})();

// Expose globally
window.I18n = I18n;
window.t = I18n.t;
window.tDemon = I18n.tDemon;
window.tCategory = I18n.tCategory;
window.getCategoryKey = I18n.getCategoryKey;
