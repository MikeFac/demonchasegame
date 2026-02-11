// QuizManager.js - Quiz/verse management with 4 quiz modes
// IIFE pattern, sets window.QuizManager
(function () {
    // Private state
    let answerResultTimeout = null;
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

    // --- Mode Selection ---
    // Uses quizSettings (global from index.html) to pick a mode via cumulative probability
    function selectMode() {
        const settings = (typeof quizSettings !== 'undefined') ? quizSettings
            : { firstLetter: 30, missingWord: 30, categoryMatch: 25, trueFalse: 15 };

        const roll = Math.floor(Math.random() * 100);
        let cumulative = 0;

        cumulative += settings.firstLetter;
        if (roll < cumulative) return 'first_letter';

        cumulative += settings.missingWord;
        if (roll < cumulative) return 'missing_word';

        cumulative += settings.categoryMatch;
        if (roll < cumulative) return 'category_match';

        return 'true_false';
    }

    // --- Quiz Generators ---

    // 1. First Letter mode (original logic from processVerse/generateQuiz)
    function generateFirstLetterQuiz(verse) {
        const [testVerse, firstLettersStr, options] = generateFirstLetterData(verse.Text);
        if (!testVerse) return null;

        return {
            mode: 'first_letter',
            promptText: testVerse,
            questionLabel: 'First letters of missing words:',
            options: options.map(function(opt) {
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

    // 2. Missing Word mode (uses AI-generated quizData.missingWord)
    function generateMissingWordQuiz(verse) {
        const qd = verse.quizData && verse.quizData.missingWord;
        if (!qd || !qd.answer || !qd.options || !qd.question) {
            // Fallback to first letter if data missing
            return generateFirstLetterQuiz(verse);
        }

        return {
            mode: 'missing_word',
            promptText: qd.question,
            questionLabel: 'Fill in the missing word:',
            options: qd.options.map(function(opt) {
                return { text: opt, isCorrect: opt === qd.answer };
            }),
            correctAnswer: qd.answer
        };
    }

    // 3. Category Match mode (uses quizData.categoryMatch with fake ungodly distractors)
    function generateCategoryMatchQuiz(verse) {
        const qd = verse.quizData && verse.quizData.categoryMatch;
        if (!qd || !qd.correctCategory || !qd.distractors) {
            return generateFirstLetterQuiz(verse);
        }

        const allOptions = [...qd.distractors.slice(0, 2), qd.correctCategory]
            .sort(() => Math.random() - 0.5);

        return {
            mode: 'category_match',
            promptText: verse.Text,
            questionLabel: 'Which quality does this verse teach?',
            options: allOptions.map(function(opt) {
                return { text: opt, isCorrect: opt === qd.correctCategory };
            }),
            correctAnswer: qd.correctCategory
        };
    }

    // 4. True/False mode (uses quizData.trueFalse)
    function generateTrueFalseQuiz(verse) {
        const qd = verse.quizData && verse.quizData.trueFalse;
        if (!qd) {
            return generateFirstLetterQuiz(verse);
        }

        // 50% chance: show correct info, 50% chance: show false info
        const showCorrect = Math.random() < 0.5;

        let claim, isTrue;
        // Randomly pick whether to test reference or category
        if (Math.random() < 0.5) {
            // Test reference
            const ref = showCorrect ? verse.Reference : (qd.falseReference || verse.Reference);
            claim = 'This verse is ' + ref;
            isTrue = showCorrect;
        } else {
            // Test category
            const cat = showCorrect ? verse.Category : (qd.falseCategory || verse.Category);
            claim = 'This verse is about ' + cat;
            isTrue = showCorrect;
        }

        return {
            mode: 'true_false',
            promptText: verse.Text,
            questionLabel: claim,
            options: [
                { text: 'TRUE', isCorrect: isTrue },
                { text: 'FALSE', isCorrect: !isTrue }
            ],
            correctAnswer: isTrue ? 'TRUE' : 'FALSE'
        };
    }

    // --- Quiz Generation Entry Point ---
    function generateQuizForVerse(verse) {
        const mode = selectMode();

        switch (mode) {
            case 'missing_word': return generateMissingWordQuiz(verse);
            case 'category_match': return generateCategoryMatchQuiz(verse);
            case 'true_false': return generateTrueFalseQuiz(verse);
            case 'first_letter':
            default: return generateFirstLetterQuiz(verse);
        }
    }

    // --- Public verse/quiz flow ---

    function handleQuizAnswer(selectedOption) {
        if (!currentQuiz) return;

        const isCorrect = selectedOption.isCorrect;
        const currentReference = organizedVerses[vQuality][currentVerseIndex].Reference;

        if (isCorrect) {
            isAnswerCorrect = true;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
            qualityTotal[vQuality] = qualityTotal[vQuality] + 1;
            console.log(vQuality + " total correct is: " + qualityTotal[vQuality]);

            player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
            network.sendQuizCorrect();

            answerFullVerse = organizedVerses[vQuality][currentVerseIndex].Text;
            setAnswerResultTimeout(3000);

            // Track verse learning via music (if available)
            if (typeof window.MusicManager !== 'undefined' && window.MusicManager.recordVerseLearned) {
                window.MusicManager.recordVerseLearned(currentReference, true);
            }

            // Notify game.js of correct answer (for daily challenge & verse tracking)
            if (typeof window.onQuizCorrectAnswer === 'function') {
                window.onQuizCorrectAnswer(currentQuiz.mode, currentReference);
            }
        } else {
            isAnswerCorrect = false;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
            answerFullVerse = organizedVerses[vQuality][currentVerseIndex].Text;
            setAnswerResultTimeout(3000);

            if (!incorrectAnswerReferences.includes(currentReference)) {
                incorrectAnswerReferences.push(currentReference);
            }
        }
    }

    function pickRandomVerse() {
        currentVerseIndex = Math.floor(Math.random() * organizedVerses[vQuality].length);
        const verse = organizedVerses[vQuality][currentVerseIndex];
        currentQuiz = generateQuizForVerse(verse);
        clearAnswerResultTimeout();
    }

    function pickQualityVerse() {
        console.log("Quality:" + vQuality + ", Index: " + qualityIndex[vQuality] + "out of" + organizedVerses[vQuality].length);
        currentVerseIndex = qualityIndex[vQuality];
        const verse = organizedVerses[vQuality][currentVerseIndex];
        currentQuiz = generateQuizForVerse(verse);
        clearAnswerResultTimeout();

        // Try to play verse-specific learning music (non-blocking)
        if (typeof window.MusicManager !== 'undefined' && window.MusicManager.playVerseTrack) {
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
        clearAnswerResultTimeout();

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
        }
    }

    function createQualityButtons() {
        qualityButtons = [];
        const buttonColors = ['green', 'blue', 'purple'];

        const buttonQualities = Array.from(new Set(QUALITIES.sort(() => Math.random() - 0.5).slice(0, 3)));

        const buttonStartX = UILayout.getQualityButtonStartX(canvas.width, buttonQualities.length);
        for (let i = 0; i < buttonQualities.length; i++) {
            const buttonX = buttonStartX + i * (BUTTON_WIDTH + 7);
            const buttonY = 5;
            qualityButtons.push({
                x: buttonX,
                y: buttonY,
                width: BUTTON_WIDTH,
                height: BUTTON_HEIGHT,
                text: buttonQualities[i],
                color: buttonColors[i]
            });
        }
    }

    // Public interface
    window.QuizManager = {
        organizeByCategory2,
        pickQualityVerse,
        pickRandomVerse,
        handleQuizAnswer,
        createQualityButtons
    };
})();
