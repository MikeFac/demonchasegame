// ReviewMode.js - Review mode functionality extracted from game.js
// IIFE pattern, sets window.ReviewMode (same as UILayout.js)
(function () {
    // Private audio state
    let isAudioPlaying = false;
    let currentAudio = null;

    function saveGameState() {
        console.log("Got to save game state - button clicked");
        let savedGameState = {
            player: {
                ...player
            },
            monsters: [...monsters],
        };
    }

    function startReviewMode() {
        gameMode = 'review';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        currentReviewVerseIndex = 0;
        repeatEnabled = false;
    }

    function restoreGameState() {
        gameMode = 'game';
    }

    function getVerseDetails(reference) {
        for (let category in organizedVerses) {
            for (let i = 0; i < organizedVerses[category].length; i++) {
                const verse = organizedVerses[category][i];
                if (verse.Reference === reference) {
                    return {
                        text: verse.Text,
                        category: category
                    };
                }
            }
        }
        return null;
    }

    function displayReviewVerseScreen() {
        if (gameMode === 'review') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, 60);

            drawReviewModeButtons();
            drawNavigationButtons();

            let verseReference;
            let verseDetails;

            if (incorrectAnswerReferences.length == 0) {
                currentReviewMode = 'quality';
            }
            if (currentReviewMode === 'incorrect') {
                verseReference = incorrectAnswerReferences[currentReviewVerseIndex];
                verseDetails = getVerseDetails(verseReference);
            } else if (currentReviewMode === 'quality') {
                const qualityVerses = organizedVerses[vQuality];
                verseReference = qualityVerses[currentReviewVerseIndex].Reference;
                verseDetails = {
                    text: qualityVerses[currentReviewVerseIndex].Text,
                    category: vQuality
                };
            }

            if (verseDetails) {
                displayReviewVerse(verseDetails.text);

                ctx.font = '20px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(`Learn: ${verseDetails.category}`, 10, canvas.height - 90);

                ctx.font = '20px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(`Reference: ${verseReference}`, 10, canvas.height - 120);

                if (!isAudioPlaying && !repeatEnabled) {
                    startVerseAudio(verseReference);
                }
            }
        }
    }

    function displayReviewVerse(text) {
        const fontSize = 22;
        const lineHeight = fontSize * 1.2;
        const maxWidth = canvas.width - 20;

        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'black';

        const words = text.split(' ');
        let line = '';
        let y = 100;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, 10, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }

        ctx.fillText(line, 10, y);
    }

    function drawNavigationButtons() {
        const buttonWidth = 100;
        const buttonHeight = 40;
        const buttonY = canvas.height - 60;
        const prevButtonX = 20;
        const repeatButtonX = prevButtonX + buttonWidth + 20;
        const nextButtonX = repeatButtonX + buttonWidth + 20;

        ctx.fillStyle = 'lightgray';
        ctx.fillRect(prevButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = repeatEnabled ? 'lightblue' : 'lightgray';
        ctx.fillRect(repeatButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(nextButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('Previous', prevButtonX + 10, buttonY + 25);
        ctx.fillText('Repeat', repeatButtonX + 20, buttonY + 25);
        ctx.fillText('Next', nextButtonX + 25, buttonY + 25);
    }

    function handleReviewClick(event) {
        const rect = canvas.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        const clickedY = event.clientY - rect.top;

        // Check if the click was on the "Game" button
        if (clickedX >= canvas.width - 100 && clickedX <= canvas.width - 20 && clickedY >= 15 && clickedY <= 45) {
            stopAudio();
            repeatEnabled = false;
            hasPlayed = false;
            restoreGameState();
        }

        // Check if the click was on the "Incorrect" button
        if (clickedX >= 20 && clickedX <= 100 && clickedY >= 15 && clickedY <= 45) {
            currentReviewMode = 'incorrect';
            currentReviewVerseIndex = 0;
            stopAudio();
            repeatEnabled = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the quality button
        if (clickedX >= 110 && clickedX <= 190 && clickedY >= 15 && clickedY <= 45) {
            currentReviewMode = 'quality';
            currentReviewVerseIndex = 0;
            stopAudio();
            repeatEnabled = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Previous" button
        if (clickedX >= 20 && clickedX <= 120 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            if (currentReviewMode === 'incorrect') {
                currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
            } else if (currentReviewMode === 'quality') {
                currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
            }
            stopAudio();
            repeatEnabled = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Next" button
        if (clickedX >= canvas.width - 120 && clickedX <= canvas.width - 20 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            if (currentReviewMode === 'incorrect') {
                currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, incorrectAnswerReferences.length - 1);
            } else if (currentReviewMode === 'quality') {
                const qualityVerses = organizedVerses[vQuality];
                currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, qualityVerses.length - 1);
            }
            stopAudio();
            repeatEnabled = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Repeat" button
        if (clickedX >= 140 && clickedX <= 240 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            repeatEnabled = !repeatEnabled;
            if (!repeatEnabled) {
                stopAudio();
            } else {
                hasPlayed = false;
                startVerseAudio(getCurrentVerseReference());
            }
            displayReviewVerseScreen();
        }
    }

    async function playAudio(verseRef) {
        var base = 'https://spiritualwar.games/otd/mv/www/audio/se/';
        var audio = new Audio(base + verseRef);
        audio.type = 'audio/ogg';
        audio.volume = 1;
        currentAudio = audio;

        return new Promise((resolve, reject) => {
            audio.onended = resolve;
            audio.onerror = reject;
            audio.play();
        });
    }

    var convertRef = function (Reference) {
        console.log("Reference to convert: " + Reference);
        var $lookup = {
            Chronicles: 'CH',
            Corinthians: 'CO',
            John: 'JHN',
            Peter: 'PE',
            Thessalonians: 'TH',
            Kings: 'KI',
            Samuel: 'SA',
            Timothy: 'TI',
            Genesis: 'GEN',
            Exodus: 'EXO',
            Leviticus: 'LEV',
            Numbers: 'NUM',
            Deuteronomy: 'DEU',
            Joshua: 'JOS',
            Judges: 'JDG',
            Ruth: 'RUT',
            Ezra: 'EZR',
            Nehemiah: 'NEH',
            Esther: 'EST',
            Job: 'JOB',
            Psalm: 'PSA',
            Psalms: 'PSA',
            Proverbs: 'PRO',
            Ecclesiastes: 'ECC',
            'Song of Solomon': 'SNG',
            'Song of Songs': 'SNG',
            Isaiah: 'ISA',
            Jeremiah: 'JER',
            Ezekiel: 'EZK',
            Daniel: 'DAN',
            Hosea: 'HOS',
            Joel: 'JOL',
            Amos: 'AMO',
            Obadiah: 'OBA',
            Jonah: 'JON',
            Micah: 'MIC',
            Nahum: 'NAM',
            Habbakuk: 'HAB',
            Zephaniah: 'ZEP',
            Haggai: 'HAG',
            Zechariah: 'ZEC',
            Malachi: 'MAL',
            Matthew: 'MAT',
            Mark: 'MRK',
            Luke: 'LUK',
            Acts: 'ACT',
            Romans: 'ROM',
            Galatians: 'GAL',
            Ephesians: 'EPH',
            Philippians: 'PHP',
            Colossians: 'COL',
            Titus: 'TIT',
            Philemon: 'PHM',
            Hebrews: 'HEB',
            James: 'JAS',
            Jude: 'JUD',
            Revelation: 'REV'
        };

        let arr = Reference.split(' ');
        let bookCode, bookPrefix, bookNameMain, chapterVerse;
        if (arr[0] in ['1', '2', '3']) {
            bookPrefix = arr[0];
            bookNameMain = arr[1];
            chapterVerse = arr[2];
            if (bookNameMain === 'John') {
                bookCode = bookPrefix + 'JN';
            } else {
                bookCode = bookPrefix + $lookup[bookNameMain];
            }
            console.log("Arr[0] = " + arr[0]);
            console.log(bookCode);
        } else {
            bookPrefix = '';
            bookNameMain = arr[0];
            chapterVerse = arr[1];
            bookCode = $lookup[arr[0]];
            if (typeof bookCode === undefined) {
                console.error(arr[0] + "is not a valid book");
                return "";
            }
        }
        let $arr2 = chapterVerse.split(':');
        let $arr3 = $arr2[1].split('-');
        return (bookCode + '-' + $arr2[0] + '-' + $arr3[0]);
    };

    function startVerseAudio(verseReference) {
        if (isAudioPlaying || (hasPlayed && !repeatEnabled)) {
            return;
        }

        var $vdir = convertRef(verseReference);
        console.log("Verse directory and file:" + $vdir);
        isAudioPlaying = true;
        playAudio($vdir + ".ogg")
            .then(() => {
                isAudioPlaying = false;
                hasPlayed = true;
                if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                    setTimeout(() => {
                        if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                            startVerseAudio(verseReference);
                        }
                    }, 5000);
                }
            })
            .catch((error) => {
                isAudioPlaying = false;
                console.error('Error playing audio:', error);
            });
    }

    function stopAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            isAudioPlaying = false;
            currentAudio = null;
        }
        isAudioPlaying = false;
    }

    function drawReviewModeButtons() {
        const buttonWidth = 80;
        const buttonHeight = 30;
        const buttonY = 15;
        const incorrectButtonX = 20;
        const qualityButtonX = incorrectButtonX + buttonWidth + 10;
        const gameButtonX = canvas.width - buttonWidth - 20;

        ctx.fillStyle = currentReviewMode === 'incorrect' ? 'lightblue' : 'lightgray';
        ctx.fillRect(incorrectButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = currentReviewMode === 'quality' ? 'lightblue' : 'lightgray';
        ctx.fillRect(qualityButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = 'lightgray';
        ctx.fillRect(gameButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('Incorrect', incorrectButtonX + 10, buttonY + 20);
        ctx.fillText(vQuality, qualityButtonX + 10, buttonY + 20);
        ctx.fillText('Game', gameButtonX + 20, buttonY + 20);
    }

    function getCurrentVerseReference() {
        if (currentReviewMode === 'incorrect') {
            return incorrectAnswerReferences[currentReviewVerseIndex];
        } else if (currentReviewMode === 'quality') {
            const qualityVerses = organizedVerses[vQuality];
            return qualityVerses[currentReviewVerseIndex].Reference;
        }
    }

    // Public interface
    window.ReviewMode = {
        displayReviewVerseScreen,
        handleReviewClick,
        startReviewMode,
        saveGameState,
        restoreGameState,
        stopAudio,
        convertRef,
        playAudio
    };
})();
