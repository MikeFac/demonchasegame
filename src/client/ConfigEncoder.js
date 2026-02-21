/**
 * ConfigEncoder - Encodes/decodes game config objects to/from URL-safe strings.
 * Uses LZ-String for compression. Config is JSON → compressed → URI-safe string.
 *
 * Depends on LZString being loaded first (libs/lz-string.min.js).
 */
const ConfigEncoder = (function () {
    const DEFAULT_CONFIG = {
        version: 1,
        balance: {
            monsterHealth: 1.0,
            monsterDamage: 1.0,
            monsterSpeed: 1.0,
            spawnRate: 1.0,
            maxMonsters: 1.0,
            healingFrequency: 1.0
        },
        quizSettings: {
            firstLetter: 25,
            missingWord: 25,
            categoryMatch: 20,
            trueFalse: 15,
            cloze: 15
        },
        levels: [],
        content: {
            source: 'default',
            verses: []
        }
    };

    function encode(config) {
        if (!config || typeof config !== 'object') return '';
        const json = JSON.stringify(config);
        if (typeof LZString === 'undefined') {
            // Fallback: base64 without compression
            return btoa(json);
        }
        return LZString.compressToEncodedURIComponent(json);
    }

    function decode(encoded) {
        if (!encoded) return null;
        try {
            let json;
            if (typeof LZString !== 'undefined') {
                json = LZString.decompressFromEncodedURIComponent(encoded);
            }
            // Fallback: try base64 if LZ decompression fails
            if (!json) {
                json = atob(encoded);
            }
            const config = JSON.parse(json);
            if (!config || typeof config !== 'object') return null;
            return config;
        } catch (e) {
            console.error('ConfigEncoder: failed to decode config', e);
            return null;
        }
    }

    function getFromURL() {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('c');
        if (!encoded) return null;
        return decode(encoded);
    }

    function toURL(config, basePath) {
        const encoded = encode(config);
        if (!encoded) return basePath || '/';
        const base = basePath || '/';
        return base + '?c=' + encoded;
    }

    function getDefault() {
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    return {
        encode,
        decode,
        getFromURL,
        toURL,
        getDefault,
        DEFAULT_CONFIG
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigEncoder;
} else {
    window.ConfigEncoder = ConfigEncoder;
}
