/**
 * Cross-environment utilities for shared game code.
 * Works in both Node.js (require) and browser (window).
 */
(function () {
    // Get crypto object - works in both Node.js and browser
    var cryptoObj;
    if (typeof crypto !== 'undefined') {
        cryptoObj = crypto; // Browser or Node.js 19+
    } else if (typeof require !== 'undefined') {
        try { cryptoObj = require('crypto'); } catch (e) { /* fallback below */ }
    }

    /**
     * Generate a random hex ID string (replaces crypto.randomBytes(N).toString('hex'))
     * @param {number} bytes - Number of random bytes (default 4, produces 8 hex chars)
     * @returns {string} Hex string
     */
    function generateId(bytes) {
        if (bytes === undefined) bytes = 4;
        if (cryptoObj && cryptoObj.getRandomValues) {
            var arr = new Uint8Array(bytes);
            cryptoObj.getRandomValues(arr);
            var hex = '';
            for (var i = 0; i < arr.length; i++) {
                hex += arr[i].toString(16).padStart(2, '0');
            }
            return hex;
        }
        if (cryptoObj && cryptoObj.randomBytes) {
            return cryptoObj.randomBytes(bytes).toString('hex');
        }
        // Fallback: Math.random-based (lower entropy but functional)
        var result = '';
        for (var j = 0; j < bytes * 2; j++) {
            result += Math.floor(Math.random() * 16).toString(16);
        }
        return result;
    }

    /**
     * Generate a random UUID string (replaces crypto.randomUUID())
     * @returns {string} UUID v4 string
     */
    function generateUUID() {
        if (cryptoObj && cryptoObj.randomUUID) {
            return cryptoObj.randomUUID();
        }
        // Fallback: construct UUID v4 from random bytes
        var bytes = generateId(16);
        return bytes.substr(0, 8) + '-' +
            bytes.substr(8, 4) + '-4' +
            bytes.substr(13, 3) + '-' +
            ((parseInt(bytes.substr(16, 1), 16) & 0x3 | 0x8).toString(16)) +
            bytes.substr(17, 3) + '-' +
            bytes.substr(20, 12);
    }

    var exports = { generateId: generateId, generateUUID: generateUUID };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exports;
    } else if (typeof window !== 'undefined') {
        window.SharedUtils = exports;
    }
})();
