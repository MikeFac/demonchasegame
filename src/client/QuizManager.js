// QuizManager.js - Quiz/verse management with 4 quiz modes
// IIFE pattern, sets window.QuizManager
(function () {
    // Private state
    let answerResultTimeout = null;
    let vQuality = (typeof window !== 'undefined' && window.vQuality) ? window.vQuality : 'Faith';
    // answerFullVerse is declared in game.js (global scope) so game loop can read it
    // currentQuiz is declared in game.js (global scope) so renderer/input can read it

    function organizeByCategory2(verses) {
        const categorizedVerses = {};

        verses.forEach((verse) => {
            const category = verse.Category;
            if (!categorizedVerses[category]) {
                categorizedVerses[category] = [];
            }
            categorizedVerses[category].push(verse);
        });

        return categorizedVerses;
    }

    const QUIZ_MODE_DEFINITIONS = [
        { mode: 'first_letter', settingKey: 'firstLetter' },
        { mode: 'missing_word', settingKey: 'missingWord' },
        { mode: 'category_match', settingKey: 'categoryMatch' },
        { mode: 'true_false', settingKey: 'trueFalse' },
        { mode: 'cloze', settingKey: 'cloze' }
    ];

    function getCurrentLanguageCapabilities() {
        if (typeof I18n !== 'undefined' && typeof I18n.getLanguageCapabilities === 'function') {
            return I18n.getLanguageCapabilities();
        }

        return {
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
    }

    function getCategoryKey(categoryValue) {
        if (typeof I18n !== 'undefined' && typeof I18n.getCategoryKey === 'function') {
            return I18n.getCategoryKey(categoryValue);
        }
        if (typeof categoryValue === 'string') {
            return categoryValue;
        }
        return '';
    }

    function displayCategory(categoryValue) {
        const categoryKey = getCategoryKey(categoryValue);
        if (typeof window !== 'undefined' && typeof window.tCategory === 'function') {
            return window.tCategory(categoryKey);
        }
        return categoryKey || categoryValue;
    }

    function hasMissingWordQuizData(verse) {
        const qd = verse && verse.quizData && verse.quizData.missingWord;
        return !!(qd && qd.answer && qd.question && Array.isArray(qd.options) && qd.options.length > 0);
    }

    function hasCategoryMatchQuizData(verse) {
        const qd = verse && verse.quizData && verse.quizData.categoryMatch;
        return !!(qd && qd.correctCategory && Array.isArray(qd.distractors));
    }

    function hasTrueFalseQuizData(verse) {
        return !!(verse && verse.quizData && verse.quizData.trueFalse);
    }

    function hasClozeQuizData(verse) {
        const qd = verse && verse.quizData && verse.quizData.cloze;
        return !!(qd && qd.question && Array.isArray(qd.answers) && qd.answers.length > 0);
    }

    function isModeSupportedForVerse(mode, verse, capabilities) {
        const caps = capabilities || getCurrentLanguageCapabilities();
        if (!caps.supportedQuizModes || caps.supportedQuizModes[mode] !== true) {
            return false;
        }

        switch (mode) {
            case 'first_letter':
                return caps.supportsFirstLetterQuiz === true;
            case 'missing_word':
                return hasMissingWordQuizData(verse) || caps.supportsAutoMissingWord === true;
            case 'category_match':
                return hasCategoryMatchQuizData(verse) || autoGenerateCategoryMatch(verse) !== null;
            case 'true_false':
                return hasTrueFalseQuizData(verse) || autoGenerateTrueFalse(verse) !== null;
            case 'cloze':
                return hasClozeQuizData(verse) || caps.supportsAutoCloze === true;
            default:
                return false;
        }
    }

    // --- Mode Selection ---
    // Uses quizSettings (global from index.html) to pick a mode via cumulative probability
    function selectMode(verse) {
        const settings = (typeof quizSettings !== 'undefined') ? quizSettings
            : { firstLetter: 25, missingWord: 25, categoryMatch: 20, trueFalse: 15, cloze: 15 };
        const capabilities = getCurrentLanguageCapabilities();
        const weightedModes = QUIZ_MODE_DEFINITIONS
            .map(function(def) {
                return {
                    mode: def.mode,
                    weight: settings[def.settingKey] || 0
                };
            })
            .filter(function(def) {
                return def.weight > 0 && isModeSupportedForVerse(def.mode, verse, capabilities);
            });
        const availableModes = weightedModes.length > 0
            ? weightedModes
            : QUIZ_MODE_DEFINITIONS
                .filter(function(def) { return isModeSupportedForVerse(def.mode, verse, capabilities); })
                .map(function(def) { return { mode: def.mode, weight: 1 }; });

        if (availableModes.length === 0) {
            return 'category_match';
        }

        const totalWeight = availableModes.reduce(function(sum, def) { return sum + def.weight; }, 0);
        let roll = Math.random() * totalWeight;
        for (let i = 0; i < availableModes.length; i++) {
            roll -= availableModes[i].weight;
            if (roll < 0) {
                return availableModes[i].mode;
            }
        }

        return availableModes[0].mode;
    }

    // --- Auto-generation helpers for custom verses without quizData ---

    const STOP_WORDS = new Set([
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been',
        'their', 'would', 'could', 'which', 'about', 'after', 'before', 'into',
        'through', 'under', 'these', 'those', 'your', 'will', 'shall', 'when',
        'where', 'what', 'there', 'then', 'than', 'them', 'they', 'some', 'such',
        'only', 'also', 'just', 'even', 'more', 'most', 'very', 'much', 'many',
        'not', 'but', 'all', 'are', 'was', 'were', 'has', 'had', 'his', 'her',
        'who', 'how', 'its', 'our', 'you', 'him', 'she', 'may', 'can', 'did',
        'unto', 'upon', 'hath', 'doth', 'art', 'thy', 'thee', 'thou', 'mine',
        'thine', 'saith', 'said', 'came', 'come', 'gone', 'went', 'made'
    ]);

    // Common biblical words to use as fallback distractors
    const BIBLICAL_WORDS = [
        'righteousness', 'salvation', 'mercy', 'grace', 'truth', 'spirit',
        'heaven', 'earth', 'glory', 'peace', 'strength', 'light', 'darkness',
        'faith', 'hope', 'love', 'wisdom', 'power', 'blessed', 'eternal',
        'covenant', 'promise', 'kingdom', 'temple', 'praise', 'worship'
    ];

    function getSignificantWords(text) {
        return text.split(/\s+/)
            .map(function (w) { return w.replace(/[.,;:!?'"()-]/g, ''); })
            .filter(function (w) { return w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()); });
    }

    function autoGenerateMissingWord(verse) {
        var words = verse.Text.split(/\s+/);
        var candidates = [];

        for (var i = 0; i < words.length; i++) {
            var clean = words[i].replace(/[.,;:!?'"()-]/g, '');
            if (clean.length >= 5 && !STOP_WORDS.has(clean.toLowerCase())) {
                candidates.push({ word: clean, index: i });
            }
        }

        if (candidates.length === 0) return null;

        // Pick a random significant word
        var picked = candidates[Math.floor(Math.random() * candidates.length)];
        var question = words.slice();
        question[picked.index] = '_____';

        // Build distractors from other verses or biblical words
        var distractors = [];
        var usedWords = new Set([picked.word.toLowerCase()]);

        // Try to get words from other verses in organizedVerses
        if (typeof organizedVerses !== 'undefined') {
            var allCategories = Object.keys(organizedVerses);
            for (var c = 0; c < allCategories.length && distractors.length < 3; c++) {
                var catVerses = organizedVerses[allCategories[c]];
                if (!catVerses) continue;
                for (var v = 0; v < catVerses.length && distractors.length < 3; v++) {
                    var sigWords = getSignificantWords(catVerses[v].Text);
                    for (var w = 0; w < sigWords.length && distractors.length < 3; w++) {
                        if (!usedWords.has(sigWords[w].toLowerCase())) {
                            usedWords.add(sigWords[w].toLowerCase());
                            distractors.push(sigWords[w]);
                        }
                    }
                }
            }
        }

        // Fill remaining from biblical words
        for (var b = 0; b < BIBLICAL_WORDS.length && distractors.length < 3; b++) {
            if (!usedWords.has(BIBLICAL_WORDS[b])) {
                distractors.push(BIBLICAL_WORDS[b]);
            }
        }

        var options = distractors.slice(0, 3).concat([picked.word]).sort(function () { return Math.random() - 0.5; });

        return {
            question: question.join(' '),
            answer: picked.word,
            options: options
        };
    }

    function autoGenerateCategoryMatch(verse) {
        var allQualities = (typeof ALL_QUALITIES !== 'undefined' && ALL_QUALITIES.length > 0) ? ALL_QUALITIES : [];
        if (allQualities.length < 2) return null;

        var others = allQualities.filter(function (q) { return q !== verse.Category; });
        // Shuffle and pick 2
        for (var i = others.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = others[i]; others[i] = others[j]; others[j] = tmp;
        }

        return {
            // Keep canonical category keys in quiz data and localize only at render time.
            correctCategory: verse.Category,
            distractors: others.slice(0, 2)
        };
    }

    function autoGenerateTrueFalse(verse) {
        var allQualities = (typeof ALL_QUALITIES !== 'undefined' && ALL_QUALITIES.length > 0) ? ALL_QUALITIES : [];
        var falseCategory = verse.Category;
        var others = allQualities.filter(function (q) { return q !== verse.Category; });
        if (others.length > 0) {
            falseCategory = others[Math.floor(Math.random() * others.length)];
        }

        // Generate false reference: same book, different chapter:verse
        var refParts = verse.Reference.match(/^(.+?)\s+(\d+):(\d+)$/);
        var falseReference = verse.Reference;
        if (refParts) {
            var book = refParts[1];
            var chapter = parseInt(refParts[2], 10);
            var verseNum = parseInt(refParts[3], 10);
            var newChapter = chapter + Math.floor(Math.random() * 3) + 1;
            var newVerse = Math.max(1, verseNum + Math.floor(Math.random() * 10) - 5);
            falseReference = book + ' ' + newChapter + ':' + newVerse;
        }

        return {
            falseCategory: falseCategory,
            falseReference: falseReference
        };
    }

    // --- Korean Syllable Helpers ---

    var KOREAN_STOP_WORDS = new Set([
        '은', '는', '이', '가', '을', '를', '에', '의', '도', '와', '과',
        '로', '께', '에서', '에게', '으로', '서', '만', '도', '하', '것',
        '그', '이', '저', '네', '우리', '너희'
    ]);

    function isKorean() {
        return typeof I18n !== 'undefined' && I18n.getLang() === 'kr';
    }

    function isHangulSyllableChar(ch) {
        var code = ch.charCodeAt(0);
        return code >= 0xAC00 && code <= 0xD7A3;
    }

    function stripKoreanEdgePunctuation(token) {
        return token.replace(/^[.,;:!?'"()\[\]{}「」『』""''·…]+/, '')
                     .replace(/[.,;:!?'"()\[\]{}「」『』""''·…]+$/, '');
    }

    function extractLeadingSyllable(token) {
        var cleaned = stripKoreanEdgePunctuation(token);
        if (!cleaned) return '';
        if (isHangulSyllableChar(cleaned.charAt(0))) {
            return cleaned.charAt(0);
        }
        return cleaned.charAt(0);
    }

    function getKoreanQuizWords(text) {
        var tokens = text.split(/\s+/);
        var candidates = [];
        for (var i = 0; i < tokens.length; i++) {
            var cleaned = stripKoreanEdgePunctuation(tokens[i]);
            if (!cleaned) continue;
            if (cleaned.length < 2) continue;
            if (/^\d+$/.test(cleaned)) continue;
            if (KOREAN_STOP_WORDS.has(cleaned)) continue;
            var hangulCount = 0;
            for (var c = 0; c < cleaned.length; c++) {
                if (isHangulSyllableChar(cleaned.charAt(c))) hangulCount++;
            }
            if (hangulCount >= 2) {
                candidates.push({ word: cleaned, index: i, originalToken: tokens[i] });
            }
        }
        return candidates;
    }

    function selectKoreanQuizCandidates(text, count) {
        var candidates = getKoreanQuizWords(text);
        if (candidates.length === 0) return [];
        for (var i = candidates.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
        }
        return candidates.slice(0, Math.min(count, candidates.length));
    }

    function buildKoreanSyllablePool(text) {
        var pool = new Set();
        var candidates = getKoreanQuizWords(text);
        for (var i = 0; i < candidates.length; i++) {
            pool.add(extractLeadingSyllable(candidates[i].word));
        }
        if (typeof organizedVerses !== 'undefined') {
            var allCats = Object.keys(organizedVerses);
            for (var c = 0; c < allCats.length; c++) {
                var catVerses = organizedVerses[allCats[c]];
                if (!catVerses) continue;
                for (var v = 0; v < catVerses.length && pool.size < 60; v++) {
                    var verseWords = getKoreanQuizWords(catVerses[v].Text);
                    for (var w = 0; w < verseWords.length && pool.size < 60; w++) {
                        pool.add(extractLeadingSyllable(verseWords[w].word));
                    }
                }
            }
        }
        var result = [];
        pool.forEach(function(s) { if (s) result.push(s); });
        return result;
    }

    function generateKoreanFirstSyllableData(text) {
        var selected = selectKoreanQuizCandidates(text, 2);
        if (selected.length < 2) return [null, null, null];

        var words = text.split(/\s+/);
        var syllables = [];
        for (var i = 0; i < selected.length; i++) {
            syllables.push(extractLeadingSyllable(selected[i].word));
        }
        var correctAnswer = syllables.join('');

        var blankTokens = new Set(selected.map(function(s) { return s.index; }));
        var testVerse = '';
        for (var i = 0; i < words.length; i++) {
            if (blankTokens.has(i)) {
                testVerse += '______ ';
            } else {
                testVerse += words[i] + ' ';
            }
        }
        testVerse = testVerse.trim();

        var pool = buildKoreanSyllablePool(text);
        var options = [correctAnswer];
        var attempts = 0;
        while (options.length < 4 && attempts < 50) {
            var s1 = pool[Math.floor(Math.random() * pool.length)];
            var s2 = pool[Math.floor(Math.random() * pool.length)];
            if (!s1 || !s2) { attempts++; continue; }
            var combo = s1 + s2;
            if (combo !== correctAnswer && options.indexOf(combo) === -1) {
                options.push(combo);
            }
            attempts++;
        }
        options.sort(function() { return Math.random() - 0.5; });
        return [testVerse, correctAnswer, options];
    }

    function generateKoreanClozeData(text) {
        var selected = selectKoreanQuizCandidates(text, 2);
        if (selected.length < 2) selected = selectKoreanQuizCandidates(text, 1);
        if (selected.length === 0) return null;

        selected.sort(function(a, b) { return a.index - b.index; });

        var words = text.split(/\s+/);
        var questionParts = [];
        var lastIdx = 0;
        for (var i = 0; i < selected.length; i++) {
            questionParts.push(words.slice(lastIdx, selected[i].index).join(' '));
            questionParts.push('_____');
            lastIdx = selected[i].index + 1;
        }
        questionParts.push(words.slice(lastIdx).join(' '));

        return {
            question: questionParts.join(' ').trim(),
            answers: selected.map(function(s) { return s.word; })
        };
    }

    function generateKoreanSyllableOptions(correctSyllable, pool) {
        if (!pool || pool.length === 0) return [correctSyllable];
        var options = [correctSyllable];
        var shuffled = pool.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        for (var i = 0; i < shuffled.length && options.length < 6; i++) {
            if (shuffled[i] !== correctSyllable && options.indexOf(shuffled[i]) === -1) {
                options.push(shuffled[i]);
            }
        }
        options.sort(function() { return Math.random() - 0.5; });
        return options;
    }

    // --- Quiz Generators ---

    // 1. First Letter mode (original logic from processVerse/generateQuiz)
    function generateFirstLetterQuiz(verse) {
        if (isKorean()) {
            const result = generateKoreanFirstSyllableData(verse.Text);
            const koreanTestVerse = result[0];
            const koreanFirstLettersStr = result[1];
            const koreanOptions = result[2];
            if (!koreanTestVerse) return null;

            return {
                mode: 'first_letter',
                promptText: koreanTestVerse,
                questionLabel: typeof t === 'function' ? t('quiz.firstLetters') : 'First letters of missing words:',
                options: koreanOptions.map(function (opt) {
                    return { text: opt, isCorrect: opt === koreanFirstLettersStr };
                }),
                correctAnswer: koreanFirstLettersStr
            };
        }

        const [testVerse, firstLettersStr, options] = generateFirstLetterData(verse.Text);
        if (!testVerse) return null;

        return {
            mode: 'first_letter',
            promptText: testVerse,
            questionLabel: typeof t === 'function' ? t('quiz.firstLetters') : 'First letters of missing words:',
            options: options.map(function (opt) {
                return { text: opt, isCorrect: opt === firstLettersStr };
            }),
            correctAnswer: firstLettersStr
        };
    }

    function processVerse(originalVerse, iCount) {
        const words = originalVerse.split(' ');
        if (words.length < iCount) {
            iCount = words.length;
        }
        if (words.length >= iCount) {
            const shuffledIndices = Array.from(Array(words.length).keys());
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }

            let testVerse = '';
            let firstLettersOfMissingWords = '';
            let selectedCount = 0;

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if (word.length >= 5 && selectedCount < iCount && shuffledIndices.includes(i)) {
                    testVerse += '-'.repeat(word.length) + ' ';
                    firstLettersOfMissingWords += word[0].toUpperCase();
                    selectedCount++;
                } else {
                    testVerse += word + ' ';
                }
            }

            return [testVerse.trim(), firstLettersOfMissingWords];
        }
        return ['', ''];
    }

    function generateFirstLetterData(verse) {
        const [testVerse, firstLetters] = processVerse(verse, 2);
        if (!testVerse) return ['', '', []];

        const distractors = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y'];
        const options = [firstLetters];

        for (let i = 0; i < 2; i++) {
            const letter1 = distractors[Math.floor(Math.random() * distractors.length)];
            const letter2 = distractors[Math.floor(Math.random() * distractors.length)];
            options.push(letter1.toUpperCase() + letter2.toUpperCase());
        }

        if (Math.random() < 0.5) {
            const letter1 = distractors[Math.floor(Math.random() * distractors.length)];
            const letter2 = distractors[Math.floor(Math.random() * distractors.length)];
            options.push(letter1.toUpperCase() + letter2.toUpperCase());
        } else {
            const correctLetter = firstLetters[0];
            let randomLetter;
            do {
                randomLetter = distractors[Math.floor(Math.random() * distractors.length)];
            } while (randomLetter === firstLetters[1].toLowerCase());
            options.push(correctLetter.toUpperCase() + randomLetter.toUpperCase());
        }

        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
        return [testVerse, firstLetters, shuffledOptions];
    }

    // 2. Missing Word mode (uses AI-generated quizData.missingWord or auto-generates)
    function generateMissingWordQuiz(verse) {
        let qd = verse.quizData && verse.quizData.missingWord;
        if (!qd || !qd.answer || !qd.options || !qd.question) {
            if (!getCurrentLanguageCapabilities().supportsAutoMissingWord) {
                return null;
            }
            qd = autoGenerateMissingWord(verse);
            if (!qd) return null;
        }

        return {
            mode: 'missing_word',
            promptText: qd.question,
            questionLabel: typeof t === 'function' ? t('quiz.missingWord') : 'Fill in the missing word:',
            options: qd.options.map(function (opt) {
                return { text: opt, isCorrect: opt === qd.answer };
            }),
            correctAnswer: qd.answer
        };
    }

    // 3. Category Match mode (uses quizData.categoryMatch or auto-generates)
    function generateCategoryMatchQuiz(verse) {
        let qd = verse.quizData && verse.quizData.categoryMatch;
        if (!qd || !qd.correctCategory || !qd.distractors) {
            qd = autoGenerateCategoryMatch(verse);
            if (!qd) return null;
        }

        const correctCategoryKey = getCategoryKey(qd.correctCategory);
        const optionEntries = [...qd.distractors.slice(0, 2), qd.correctCategory]
            .map(function(categoryValue) {
                return {
                    key: getCategoryKey(categoryValue),
                    text: displayCategory(categoryValue)
                };
            })
            .sort(function() { return Math.random() - 0.5; });

        return {
            mode: 'category_match',
            promptText: verse.Text,
            questionLabel: typeof t === 'function' ? t('quiz.categoryMatch') : 'Which quality does this verse teach?',
            options: optionEntries.map(function (opt) {
                return { text: opt.text, isCorrect: opt.key === correctCategoryKey };
            }),
            correctAnswer: displayCategory(qd.correctCategory)
        };
    }

    // 4. True/False mode (uses quizData.trueFalse or auto-generates)
    function generateTrueFalseQuiz(verse) {
        let qd = verse.quizData && verse.quizData.trueFalse;
        if (!qd) {
            qd = autoGenerateTrueFalse(verse);
            if (!qd) return null;
        }

        // 50% chance: show correct info, 50% chance: show false info
        const showCorrect = Math.random() < 0.5;

        let claim, isTrue;
        // Randomly pick whether to test reference or category
        if (Math.random() < 0.5) {
            // Test reference
            const ref = showCorrect ? verse.Reference : (qd.falseReference || verse.Reference);
            claim = typeof t === 'function' ? t('game.verseIs', ref) : ('This verse is ' + ref);
            isTrue = showCorrect;
        } else {
            // Test category
            const cat = showCorrect ? verse.Category : (qd.falseCategory || verse.Category);
            claim = typeof t === 'function'
                ? t('game.verseIsAbout', displayCategory(cat))
                : ('This verse is about ' + displayCategory(cat));
            isTrue = showCorrect;
        }

        return {
            mode: 'true_false',
            promptText: verse.Text,
            questionLabel: claim,
            options: [
                { text: typeof t === 'function' ? t('quiz.trueFalse') : 'TRUE', isCorrect: isTrue },
                { text: typeof t === 'function' ? t('quiz.falseOption') : 'FALSE', isCorrect: !isTrue }
            ],
            correctAnswer: isTrue ? (typeof t === 'function' ? t('quiz.trueFalse') : 'TRUE') : (typeof t === 'function' ? t('quiz.falseOption') : 'FALSE')
        };
    }

    // 5. Cloze mode (progressive fill-in-the-blank)
    const CLOZE_DISTRACTORS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Y'];
    const CLOZE_STOP_WORDS = ['that', 'this', 'with', 'from', 'have', 'been', 'their', 'would', 'could', 'which', 'about', 'after', 'before', 'being', 'into', 'through', 'during', 'between', 'under', 'other', 'these', 'those', 'your', 'will', 'shall', 'when', 'where', 'what', 'there', 'then', 'than', 'them', 'they', 'some', 'such', 'only', 'also', 'just', 'even', 'more', 'most', 'very', 'much', 'many', 'first', 'last', 'long', 'great', 'little', 'own', 'good', 'made', 'time', 'said', 'like', 'back', 'each', 'make', 'take', 'come', 'came', 'over', 'upon', 'every', 'both', 'does', 'done', 'down', 'again', 'away', 'here', 'still', 'well', 'were', 'thought', 'called', 'should'];

    function playClozeBeep(success) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = success ? 880 : 220;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (success ? 0.15 : 0.3));
            oscillator.stop(audioCtx.currentTime + (success ? 0.15 : 0.3));
        } catch (e) {
            // Audio not supported
        }
    }

    function generateClozeLetterOptions(correctWord, syllablePool) {
        if (isKorean()) {
            var correctSyllable = extractLeadingSyllable(correctWord);
            var pool = syllablePool || buildKoreanSyllablePool('');
            return generateKoreanSyllableOptions(correctSyllable, pool);
        }

        const correctLetter = correctWord.charAt(0).toUpperCase();
        const options = [correctLetter];
        
        const availableDistractors = CLOZE_DISTRACTORS.filter(function(l) {
            return l !== correctLetter;
        });
        
        for (let i = availableDistractors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableDistractors[i], availableDistractors[j]] = [availableDistractors[j], availableDistractors[i]];
        }
        
        for (let i = 0; i < 5 && i < availableDistractors.length; i++) {
            options.push(availableDistractors[i]);
        }
        
        return options.sort(function() { return Math.random() - 0.5; });
    }

    function autoGenerateCloze(text) {
        if (isKorean()) {
            return generateKoreanClozeData(text);
        }

        const words = text.split(/\s+/);
        const candidates = [];
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i].replace(/[.,!?;:'"()-]/g, '');
            const lowerWord = word.toLowerCase();
            
            if (word.length >= 4 && 
                !CLOZE_STOP_WORDS.includes(lowerWord) &&
                /^[a-zA-Z]+$/.test(word)) {
                candidates.push({ word: word, index: i });
            }
        }
        
        if (candidates.length < 2) {
            return null;
        }
        
        // Shuffle and pick 2
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        
        const selected = candidates.slice(0, 2);
        selected.sort(function(a, b) { return a.index - b.index; });
        
        // Create question with blanks
        let questionParts = [];
        let lastIdx = 0;
        for (let i = 0; i < selected.length; i++) {
            const wordData = selected[i];
            const wordsUpTo = words.slice(lastIdx, wordData.index);
            questionParts.push(wordsUpTo.join(' '));
            questionParts.push('_____');
            lastIdx = wordData.index + 1;
        }
        questionParts.push(words.slice(lastIdx).join(' '));
        
        return {
            question: questionParts.join(' ').trim(),
            answers: selected.map(function(s) { return s.word; })
        };
    }

    function generateClozeQuiz(verse) {
        let qd = verse.quizData && verse.quizData.cloze;
        
        if (!qd || !qd.question || !qd.answers || qd.answers.length === 0) {
            if (!getCurrentLanguageCapabilities().supportsAutoCloze) {
                return null;
            }
            const generated = autoGenerateCloze(verse.Text);
            if (!generated) {
                return null;
            }
            qd = generated;
        }

        var syllablePool = isKorean() ? buildKoreanSyllablePool(verse.Text) : null;
        const firstWord = qd.answers[0];
        const letterOptions = generateClozeLetterOptions(firstWord, syllablePool);

        return {
            mode: 'cloze',
            promptText: qd.question,
            questionLabel: typeof t === 'function' ? t('quiz.cloze') : 'Fill in the blanks:',
            answers: qd.answers,
            verseId: verse.Id,
            currentWordIndex: 0,
            revealedWords: [],
            letterOptions: letterOptions,
            showFullAnswer: false,
            isComplete: false,
            verseText: verse.Text,
            verseReference: verse.Reference,
            _koreanSyllablePool: syllablePool
        };
    }

    function generateDiscipleshipQuiz(verse) {
        if (!verse || !verse.discipleshipQuestion || !window.discipleshipMissionManager) {
            return null;
        }
        return window.discipleshipMissionManager.buildQuizFromQuestion(verse);
    }

    function buildQuizForMode(mode, verse) {
        switch (mode) {
            case 'missing_word': return generateMissingWordQuiz(verse);
            case 'category_match': return generateCategoryMatchQuiz(verse);
            case 'true_false': return generateTrueFalseQuiz(verse);
            case 'cloze': return generateClozeQuiz(verse);
            case 'first_letter':
            default: return generateFirstLetterQuiz(verse);
        }
    }

    function getClozeDisplayText(quiz) {
        if (!quiz || quiz.mode !== 'cloze') return '';
        
        let text = quiz.promptText;
        const blanks = text.split('_____');
        
        if (blanks.length <= 1) return text;
        
        let result = blanks[0];
        for (let i = 0; i < quiz.answers.length; i++) {
            if (i < quiz.revealedWords.length) {
                result += quiz.revealedWords[i];
            } else {
                result += '_____';
            }
            if (i + 1 < blanks.length) {
                result += blanks[i + 1];
            }
        }
        return result;
    }

    function handleClozeLetterSelect(selectedLetter) {
        if (!currentQuiz || currentQuiz.mode !== 'cloze') return;
        if (currentQuiz.isComplete || currentQuiz.showFullAnswer) return;

        const currentWordIndex = currentQuiz.currentWordIndex;
        const correctWord = currentQuiz.answers[currentWordIndex];
        var isCorrect;

        if (isKorean()) {
            const correctSyllable = extractLeadingSyllable(correctWord);
            isCorrect = selectedLetter === correctSyllable;
        } else {
            const correctLetter = correctWord.charAt(0).toUpperCase();
            isCorrect = selectedLetter === correctLetter;
        }

        if (isCorrect) {
            playClozeBeep(true);
            
            currentQuiz.revealedWords.push(correctWord);
            currentQuiz.currentWordIndex++;
            
            if (currentQuiz.currentWordIndex >= currentQuiz.answers.length) {
                currentQuiz.isComplete = true;
                onClozeComplete(true);
            } else {
                const nextWord = currentQuiz.answers[currentQuiz.currentWordIndex];
                currentQuiz.letterOptions = generateClozeLetterOptions(nextWord, currentQuiz._koreanSyllablePool);
            }
        } else {
            playClozeBeep(false);
            
            currentQuiz.showFullAnswer = true;
            currentQuiz.revealedWords = currentQuiz.answers.slice();
            onClozeComplete(false);
        }
    }

    function onClozeComplete(success) {
        if (typeof dbg === 'function') dbg('QUIZ', `onClozeComplete success=${success} pos=(${player.x.toFixed(0)},${player.y.toFixed(0)})`);
        const verseEntry = organizedVerses[vQuality] && organizedVerses[vQuality][currentVerseIndex];
        const currentReference = verseEntry ? verseEntry.Reference : '';
        const currentQualityEntries = organizedVerses[vQuality] || [];
        if (currentQualityEntries.length === 0) {
            return;
        }
        if (typeof qualityIndex[vQuality] !== 'number' || qualityIndex[vQuality] < 0) {
            qualityIndex[vQuality] = 0;
        }
        qualityIndex[vQuality] = qualityIndex[vQuality] % currentQualityEntries.length;

        if (success) {
            isAnswerCorrect = true;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % currentQualityEntries.length;
            qualityTotal[vQuality] = qualityTotal[vQuality] + 1;
            console.log(vQuality + " total correct is: " + qualityTotal[vQuality]);

            // Auto-rotate quality every 3 correct answers (restricted to level qualities)
            if (qualityTotal[vQuality] % 3 === 0) {
                const levelQualities = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) ? QUALITIES : Object.keys(organizedVerses);
                const availableQualities = levelQualities.filter(function(q) {
                    return q !== vQuality && organizedVerses[q] && organizedVerses[q].length > 0;
                });
                if (availableQualities.length > 0) {
                    vQuality = availableQualities[Math.floor(Math.random() * availableQualities.length)];
                    const nextQualityEntries = organizedVerses[vQuality] || [];
                    if (typeof qualityIndex[vQuality] !== 'number' || qualityIndex[vQuality] < 0) {
                        qualityIndex[vQuality] = 0;
                    }
                    currentVerseIndex = nextQualityEntries.length > 0
                        ? (qualityIndex[vQuality] % nextQualityEntries.length)
                        : 0;
                    console.log('✨ Quality rotated to: ' + vQuality);
                }
            }

            player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
            network.sendQuizCorrect();

            const correctVerse = organizedVerses[vQuality] && organizedVerses[vQuality][currentVerseIndex];
            answerFullVerse = correctVerse ? correctVerse.Text : '';
            setAnswerResultTimeout(4500);

            if (typeof window.MusicManager !== 'undefined' && window.MusicManager.recordVerseLearned) {
                window.MusicManager.recordVerseLearned(currentReference, true);
            }

            if (typeof window.onQuizCorrectAnswer === 'function') {
                window.onQuizCorrectAnswer('cloze', currentReference);
            }
        } else {
            isAnswerCorrect = false;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % currentQualityEntries.length;
            const wrongVerse = currentQualityEntries[currentVerseIndex];
            answerFullVerse = wrongVerse ? wrongVerse.Text : '';
            setAnswerResultTimeout(6000);

            if (!incorrectAnswerReferences.includes(currentReference)) {
                incorrectAnswerReferences.push(currentReference);
            }

            if (typeof window.onQuizWrongAnswer === 'function') {
                window.onQuizWrongAnswer('cloze', currentReference);
            }
        }
    }

    // --- Quiz Generation Entry Point ---
    function generateQuizForVerse(verse) {
        if (verse && verse.discipleshipQuestion) {
            return generateDiscipleshipQuiz(verse);
        }

        const mode = selectMode(verse);
        const capabilities = getCurrentLanguageCapabilities();
        const modePriority = [mode].concat(QUIZ_MODE_DEFINITIONS
            .map(function(def) { return def.mode; })
            .filter(function(candidate) { return candidate !== mode; }));
        let quiz = null;

        for (let i = 0; i < modePriority.length; i++) {
            const candidateMode = modePriority[i];
            if (!isModeSupportedForVerse(candidateMode, verse, capabilities)) {
                continue;
            }
            quiz = buildQuizForMode(candidateMode, verse);
            if (quiz) {
                break;
            }
        }

        // Belt of Truth: auto-remove one wrong answer if belt available (not for cloze)
        if (quiz && quiz.mode !== 'cloze' && typeof inventory !== 'undefined' && inventory.belt > 0 && quiz.options && quiz.options.length >= 3) {
            const wrongOptions = quiz.options.filter(opt => !opt.isCorrect);
            if (wrongOptions.length > 0) {
                const removeIdx = quiz.options.indexOf(wrongOptions[Math.floor(Math.random() * wrongOptions.length)]);
                quiz.options.splice(removeIdx, 1);
                inventory.belt--;
                if (typeof network !== 'undefined' && network.sendConsumeItem) {
                    network.sendConsumeItem('belt');
                }
                console.log('Belt of Truth: removed 1 distractor. Belt remaining:', inventory.belt);
            }
        }

        return quiz;
    }

    // --- Public verse/quiz flow ---

    function handleQuizAnswer(selectedOption) {
        if (!currentQuiz) return;
        
        // Cloze quizzes have their own handler
        if (currentQuiz.mode === 'cloze') return;

        const isCorrect = selectedOption.isCorrect;
        const activeQuality = (currentQuiz.contentCategory && organizedVerses && organizedVerses[currentQuiz.contentCategory])
            ? currentQuiz.contentCategory
            : vQuality;
        if (!organizedVerses || !organizedVerses[activeQuality] || organizedVerses[activeQuality].length === 0) {
            return;
        }
        if (typeof qualityIndex === 'undefined' || !qualityIndex) {
            qualityIndex = {};
        }
        if (typeof qualityTotal === 'undefined' || !qualityTotal) {
            qualityTotal = {};
        }
        if (typeof qualityIndex[activeQuality] !== 'number' || qualityIndex[activeQuality] < 0) {
            qualityIndex[activeQuality] = 0;
        }
        if (typeof qualityTotal[activeQuality] !== 'number' || qualityTotal[activeQuality] < 0) {
            qualityTotal[activeQuality] = 0;
        }

        vQuality = activeQuality;
        if (typeof window !== 'undefined') {
            window.vQuality = activeQuality;
        }

        const currentQualityEntries = organizedVerses[activeQuality];
        const verseEntry = currentQualityEntries[currentVerseIndex];
        const currentReference = currentQuiz.verseReference || (verseEntry ? verseEntry.Reference : '');
        const currentCategory = currentQuiz.contentCategory || (verseEntry ? (verseEntry.Category || activeQuality) : activeQuality);

        if (isCorrect) {
            isAnswerCorrect = true;
            qualityIndex[activeQuality] = (qualityIndex[activeQuality] + 1) % currentQualityEntries.length;
            qualityTotal[activeQuality] = qualityTotal[activeQuality] + 1;
            console.log(activeQuality + " total correct is: " + qualityTotal[activeQuality]);

            // Auto-rotate quality every 3 correct answers (restricted to level qualities)
            if (qualityTotal[activeQuality] % 3 === 0) {
                const levelQualities = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) ? QUALITIES : Object.keys(organizedVerses);
                const availableQualities = levelQualities.filter(q =>
                    q !== activeQuality &&
                    organizedVerses[q] &&
                    organizedVerses[q].length > 0
                );
                if (availableQualities.length > 0) {
                    vQuality = availableQualities[Math.floor(Math.random() * availableQualities.length)];
                    const nextQualityEntries = organizedVerses[vQuality] || [];
                    if (typeof qualityIndex[vQuality] !== 'number' || qualityIndex[vQuality] < 0) {
                        qualityIndex[vQuality] = 0;
                    }
                    currentVerseIndex = nextQualityEntries.length > 0
                        ? (qualityIndex[vQuality] % nextQualityEntries.length)
                        : 0;
                    console.log('✨ Quality rotated to: ' + vQuality);
                }
            }

            player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
            network.sendQuizCorrect(currentCategory);

            const correctVerse = organizedVerses[vQuality] && organizedVerses[vQuality][currentVerseIndex];
            answerFullVerse = currentQuiz.answerRevealText || (correctVerse ? correctVerse.Text : '');
            setAnswerResultTimeout(4500);

            // Track verse learning via music (if available)
            if (typeof window.MusicManager !== 'undefined' && window.MusicManager.recordVerseLearned) {
                window.MusicManager.recordVerseLearned(currentReference, true);
            }

            // Notify game.js of correct answer (for daily challenge & verse tracking)
            if (typeof window.onQuizCorrectAnswer === 'function') {
                window.onQuizCorrectAnswer(currentQuiz.mode, currentReference, currentCategory);
            }
        } else {
            isAnswerCorrect = false;
            qualityIndex[activeQuality] = (qualityIndex[activeQuality] + 1) % currentQualityEntries.length;
            const wrongVerse = currentQualityEntries[currentVerseIndex];
            answerFullVerse = currentQuiz.answerRevealText || (wrongVerse ? wrongVerse.Text : '');
            setAnswerResultTimeout(4500);

            if (!incorrectAnswerReferences.includes(currentReference)) {
                incorrectAnswerReferences.push(currentReference);
            }

            if (typeof window.onQuizWrongAnswer === 'function') {
                window.onQuizWrongAnswer(currentQuiz.mode, currentReference);
            }
        }
    }

    function pickRandomVerse() {
        if (!organizedVerses || !organizedVerses[vQuality] || organizedVerses[vQuality].length === 0) {
            return;
        }
        currentVerseIndex = Math.floor(Math.random() * organizedVerses[vQuality].length);
        const verse = organizedVerses[vQuality][currentVerseIndex];
        currentQuiz = generateQuizForVerse(verse);
        clearAnswerResultTimeout();
    }

    function pickQualityVerse() {
        // Don't rotate verse while verse test is active
        if (typeof VerseTestScreen !== 'undefined' && VerseTestScreen.isActive()) return;

        if (!organizedVerses || !organizedVerses[vQuality] || organizedVerses[vQuality].length === 0) {
            return;
        }
        if (typeof qualityIndex === 'undefined' || !qualityIndex) {
            qualityIndex = {};
        }
        if (typeof qualityIndex[vQuality] !== 'number' || qualityIndex[vQuality] < 0) {
            qualityIndex[vQuality] = 0;
        }
        qualityIndex[vQuality] = qualityIndex[vQuality] % organizedVerses[vQuality].length;

        console.log("Learn:" + vQuality + ", Index: " + qualityIndex[vQuality] + "out of" + organizedVerses[vQuality].length);
        currentVerseIndex = qualityIndex[vQuality];
        const verse = organizedVerses[vQuality][currentVerseIndex];
        currentQuiz = generateQuizForVerse(verse);
        clearAnswerResultTimeout();

        // Try to play verse-specific learning music (non-blocking)
        if (!verse.discipleshipContent && typeof window.MusicManager !== 'undefined' && window.MusicManager.playVerseTrack) {
            window.MusicManager.playVerseTrack(verse.Reference).then(wasPlayed => {
                if (wasPlayed) {
                    console.log('🎵 Playing educational music for: ' + verse.Reference);
                }
            }).catch(err => {
                console.warn('Could not play verse music:', err);
            });
        }
    }

    function setAnswerResultTimeout(duration) {
        if (answerResultTimeout) {
            clearTimeout(answerResultTimeout);
            answerResultTimeout = null;
        }

        answerResultTimeout = setTimeout(() => {
            clearAnswerResultTimeout();
            pickQualityVerse();
        }, duration);
    }

    function clearAnswerResultTimeout() {
        if (answerResultTimeout) {
            clearTimeout(answerResultTimeout);
            answerResultTimeout = null;
            isAnswerCorrect = null;
            answerFullVerse = null;
            lastAnsweredReference = null;
        }
    }

    // Public interface
    window.QuizManager = {
        organizeByCategory2,
        pickQualityVerse,
        pickRandomVerse,
        handleQuizAnswer,
        handleClozeLetterSelect,
        getClozeDisplayText
    };
})();
