/**
 * MissionAssetRegistry — single source of truth for what assets a mission can use.
 *
 * Used by the MissionValidator to confirm that referenced demon types, map styles,
 * puzzle modes, verse categories, and verse references all exist.
 *
 * See docs/plans/mission-dsl-schema.md → "Asset Registry" section.
 */
(function () {
    'use strict';

    var LevelConfig, bibleVerses;

    if (typeof module !== 'undefined' && module.exports) {
        LevelConfig = require('./LevelConfig');
        bibleVerses = require('../../bible-verses');
    } else {
        LevelConfig = window.LevelConfig;
        bibleVerses = { loadSelectedVerses: window.loadSelectedVerses };
    }

    // ---- Demon types ----
    // LevelConfig.ALL_DEMON_TYPES is not exported, so derive from levelData.monsters
    // plus the known combat matrix keys (categories), and add 'Goliath' which is a
    // known special boss type used in story missions.
    var DEMON_TYPES = [];
    var _demonSet = {};
    if (LevelConfig) {
        if (LevelConfig.levelData) {
            for (var lvl in LevelConfig.levelData) {
                if (!LevelConfig.levelData.hasOwnProperty(lvl)) continue;
                var monsters = LevelConfig.levelData[lvl].monsters || [];
                for (var i = 0; i < monsters.length; i++) {
                    if (!_demonSet[monsters[i]]) { _demonSet[monsters[i]] = true; DEMON_TYPES.push(monsters[i]); }
                }
            }
        }
        // Boss types from levelData.boss
        if (LevelConfig.levelData) {
            for (var lv in LevelConfig.levelData) {
                if (!LevelConfig.levelData.hasOwnProperty(lv)) continue;
                var boss = LevelConfig.levelData[lv].boss;
                if (boss && boss.demonType && !_demonSet[boss.demonType]) {
                    _demonSet[boss.demonType] = true;
                    DEMON_TYPES.push(boss.demonType);
                }
            }
        }
    }
    // Known special story boss type not in levelData
    if (!_demonSet['Goliath']) { DEMON_TYPES.push('Goliath'); _demonSet['Goliath'] = true; }
    DEMON_TYPES.sort();

    // ---- Map styles ----
    var MAP_STYLES = ['classic', 'narrow', 'labyrinth', 'open', 'city'];

    // ---- Puzzle modes ----
    var PUZZLE_MODES = ['firstLetter', 'missingWord', 'categoryMatch', 'trueFalse', 'cloze', 'symbolChoice', 'verseMemorize'];

    // ---- Tones ----
    var TONES = ['adventure', 'horror', 'meditative', 'combat', 'puzzle'];

    // ---- Difficulties ----
    var DIFFICULTIES = ['easy', 'medium', 'hard'];

    // ---- Content modes ----
    var CONTENT_MODES = ['biblical', 'secular'];

    // ---- Verse categories ----
    var VERSE_CATEGORIES = [];
    var VERSE_REFERENCES = {};

    function _loadVerseData() {
        var verses = [];
        if (bibleVerses && typeof bibleVerses.loadSelectedVerses === 'function') {
            try {
                verses = bibleVerses.loadSelectedVerses() || [];
            } catch (e) {
                verses = [];
            }
        }
        var catSet = {};
        VERSE_CATEGORIES = [];
        VERSE_REFERENCES = {};
        for (var i = 0; i < verses.length; i++) {
            var v = verses[i];
            if (!v) continue;
            if (v.Category && !catSet[v.Category]) {
                catSet[v.Category] = true;
                VERSE_CATEGORIES.push(v.Category);
            }
            if (v.Reference) {
                VERSE_REFERENCES[v.Reference] = true;
            }
        }
        VERSE_CATEGORIES.sort();
    }

    _loadVerseData();

    // ---- Public API ----
    var MissionAssetRegistry = {
        DEMON_TYPES: DEMON_TYPES,
        MAP_STYLES: MAP_STYLES,
        PUZZLE_MODES: PUZZLE_MODES,
        TONES: TONES,
        DIFFICULTIES: DIFFICULTIES,
        CONTENT_MODES: CONTENT_MODES,
        VERSE_CATEGORIES: VERSE_CATEGORIES,

        /**
         * Register a custom boss name (from spec.customBosses) for this session.
         * Returns a new registry with the custom boss added.
         */
        withCustomBosses: function (customBosses) {
            var extra = Array.isArray(customBosses) ? customBosses : [];
            var merged = DEMON_TYPES.slice();
            for (var i = 0; i < extra.length; i++) {
                if (merged.indexOf(extra[i]) < 0) merged.push(extra[i]);
            }
            return Object.assign({}, this, { DEMON_TYPES: merged });
        },

        hasDemonType: function (name) {
            return this.DEMON_TYPES.indexOf(name) >= 0;
        },
        hasMapStyle: function (style) {
            return MAP_STYLES.indexOf(style) >= 0;
        },
        hasPuzzleMode: function (mode) {
            return PUZZLE_MODES.indexOf(mode) >= 0;
        },
        hasTone: function (tone) {
            return TONES.indexOf(tone) >= 0;
        },
        hasDifficulty: function (diff) {
            return DIFFICULTIES.indexOf(diff) >= 0;
        },
        hasContentMode: function (mode) {
            return CONTENT_MODES.indexOf(mode) >= 0;
        },
        hasVerseCategory: function (cat) {
            return VERSE_CATEGORIES.indexOf(cat) >= 0;
        },
        hasVerseReference: function (ref) {
            return !!VERSE_REFERENCES[ref];
        },
        getVerseReferenceCount: function () {
            return Object.keys(VERSE_REFERENCES).length;
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MissionAssetRegistry;
    } else {
        window.MissionAssetRegistry = MissionAssetRegistry;
    }
})();