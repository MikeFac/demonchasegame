// QuizManager.js - Quiz/verse management extracted from game.js
// IIFE pattern, sets window.QuizManager (same as UILayout.js)
(function () {
    // Private state
    let answerResultTimeout = null;
    let answerFullVerse = null;

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

    function handleQuizAnswer(selectedOption) {
        if (selectedOption === firstLetters) {
            isAnswerCorrect = true;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
            qualityTotal[vQuality] = qualityTotal[vQuality] + 1;
            console.log(vQuality + " total correct is: " + qualityTotal[vQuality]);

            player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
            network.sendQuizCorrect();

            answerFullVerse = organizedVerses[vQuality][currentVerseIndex].Text;
            setAnswerResultTimeout(3000);
        } else {
            isAnswerCorrect = false;
            qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
            answerFullVerse = organizedVerses[vQuality][currentVerseIndex].Text;
            setAnswerResultTimeout(3000);

            const currentReference = organizedVerses[vQuality][currentVerseIndex].Reference;
            if (!incorrectAnswerReferences.includes(currentReference)) {
                incorrectAnswerReferences.push(currentReference);
            }
        }
    }

    function pickRandomVerse() {
        currentVerseIndex = Math.floor(Math.random() * organizedVerses[vQuality].length);
        const verseText = organizedVerses[vQuality][currentVerseIndex].Text;
        [gappedVerse, firstLetters, mcOptions] = generateQuiz(verseText);
        clearAnswerResultTimeout();
    }

    function pickQualityVerse() {
        console.log("Quality:" + vQuality + ", Index: " + qualityIndex[vQuality] + "out of" + organizedVerses[vQuality].length);
        currentVerseIndex = qualityIndex[vQuality];
        const verseText = organizedVerses[vQuality][currentVerseIndex].Text;
        [gappedVerse, firstLetters, mcOptions] = generateQuiz(verseText);
        clearAnswerResultTimeout();
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

    function generateQuiz(verse) {
        const [testVerse, firstLetters] = processVerse(verse, 2);
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

    // Public interface
    window.QuizManager = {
        organizeByCategory2,
        pickQualityVerse,
        pickRandomVerse,
        handleQuizAnswer,
        createQualityButtons
    };
})();
