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
     */
    function loadSync(langCode) {
        _lang = langCode || _detectLanguage();
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/locales/' + _lang + '.json', false); // synchronous
            xhr.send();
            if (xhr.status === 200) {
                _strings = JSON.parse(xhr.responseText);
            } else if (_lang !== 'en') {
                console.warn('i18n: locale "' + _lang + '" not found, falling back to "en"');
                xhr.open('GET', '/locales/en.json', false);
                xhr.send();
                if (xhr.status === 200) {
                    _strings = JSON.parse(xhr.responseText);
                }
            }
            _loaded = true;
            localStorage.setItem('lang', _lang);
        } catch (e) {
            console.error('i18n: failed to load locale', e);
            _strings = {};
            _loaded = true;
        }
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
                    _strings = await fallback.json();
                }
            } else {
                _strings = await resp.json();
            }
            _loaded = true;
            localStorage.setItem('lang', _lang);
        } catch (e) {
            console.error('i18n: failed to load locale', e);
            _strings = {};
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
        getLang,
        isLoaded
    };
})();

// Expose globally
window.I18n = I18n;
window.t = I18n.t;
window.tDemon = I18n.tDemon;
window.tCategory = I18n.tCategory;
