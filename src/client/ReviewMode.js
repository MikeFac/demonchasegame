// ReviewMode.js - Review mode functionality extracted from game.js
// IIFE pattern, sets window.ReviewMode (same as UILayout.js)
(function () {
    // Private audio state
    let isAudioPlaying = false;
    let currentAudio = null;

    // Review mode state
    let reviewCategoryPickerOpen = false;
    let repeatDelay = 5000; // Default 5 seconds in milliseconds
    let repeatTimer = null;
    let meditationMode = false; // Toggle for continuous repeat

    // Repeat delay options (in milliseconds)
    const REPEAT_DELAYS = {
        '5s': 5000,
        '15s': 15000,
        '1m': 60000,
        '5m': 300000,
        '1h': 3600000
    };

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
        meditationMode = false;
        reviewCategoryPickerOpen = false;

        if (window.Analytics) {
            var verseCount = incorrectAnswerReferences.length > 0 
                ? incorrectAnswerReferences.length 
                : (organizedVerses[vQuality] ? organizedVerses[vQuality].length : 0);
            Analytics.trackReviewModeUsed(verseCount);
        }
    }

    function restoreGameState() {
        gameMode = 'game';
        clearRepeatTimer();
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

            // Draw category picker if open
            if (reviewCategoryPickerOpen) {
                drawCategoryPicker();
                return; // Don't draw verse when picker is open
            }

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
                if (!qualityVerses || qualityVerses.length === 0) {
                    ctx.font = '18px Arial';
                    ctx.fillStyle = 'red';
                    ctx.fillText('No verses in this category', 10, 150);
                    return;
                }
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
                ctx.fillText(t('review.learn', tCategory(verseDetails.category)), 10, canvas.height - 90);

                ctx.font = '20px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(t('review.reference', verseReference), 10, canvas.height - 120);

                if (!isAudioPlaying && !repeatEnabled && !meditationMode) {
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
        const buttonWidth = 80;
        const buttonHeight = 40;
        const buttonY = canvas.height - 60;
        const prevButtonX = 20;
        const repeatButtonX = prevButtonX + buttonWidth + 10;
        const delayDropdownX = repeatButtonX + buttonWidth + 10;
        const nextButtonX = canvas.width - buttonWidth - 20;

        // Previous button
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(prevButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(t('review.previous'), prevButtonX + 10, buttonY + 25);

        // Repeat/Meditation button
        ctx.fillStyle = meditationMode ? '#4CAF50' : (repeatEnabled ? 'lightblue' : 'lightgray');
        ctx.fillRect(repeatButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        const repeatLabel = meditationMode ? t('review.meditationOn') : (repeatEnabled ? t('review.repeatOn') : t('review.repeat'));
        ctx.fillText(repeatLabel, repeatButtonX + 5, buttonY + 25);

        // Delay dropdown (only visible when meditation mode is on)
        if (meditationMode) {
            ctx.fillStyle = '#333';
            ctx.fillRect(delayDropdownX, buttonY, 70, buttonHeight);
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.strokeRect(delayDropdownX, buttonY, 70, buttonHeight);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'white';
            const delayLabel = getDelayLabel(repeatDelay);
            ctx.fillText(delayLabel, delayDropdownX + 8, buttonY + 25);
            // Dropdown arrow
            ctx.fillText('▾', delayDropdownX + 55, buttonY + 25);
        }

        // Next button
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(nextButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(t('review.next'), nextButtonX + 25, buttonY + 25);
    }

    function getDelayLabel(ms) {
        for (const [label, value] of Object.entries(REPEAT_DELAYS)) {
            if (value === ms) return label;
        }
        return '5s';
    }

    function drawCategoryPicker() {
        const categories = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) 
            ? QUALITIES 
            : Object.keys(organizedVerses);
        const currentCategory = vQuality;
        const padding = 10;
        const itemH = 32;
        const cols = 2;
        const itemSpacing = 6;
        const panelW = 280;
        const rows = Math.ceil(categories.length / cols);
        const colWidth = (panelW - padding * 2 - itemSpacing * (cols - 1)) / cols;
        const panelH = padding + rows * (itemH + itemSpacing) + padding + 30;

        const panelX = (canvas.width - panelW) / 2;
        const panelY = Math.max(30, (canvas.height - panelH) / 2);

        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Panel background
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('ui.selectCategory'), panelX + panelW / 2, panelY + 22);
        ctx.textAlign = 'left';

        // Category items in 2-column grid
        categories.forEach((cat, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemX = panelX + padding + col * (colWidth + itemSpacing);
            const itemY = panelY + 30 + padding + row * (itemH + itemSpacing);
            const isActive = cat === currentCategory;

            // Item background
            ctx.fillStyle = isActive ? 'rgba(74, 144, 226, 0.4)' : 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(itemX, itemY, colWidth, itemH);

            if (isActive) {
                ctx.strokeStyle = '#4a90e2';
                ctx.lineWidth = 2;
                ctx.strokeRect(itemX, itemY, colWidth, itemH);
            }

            // Item text
            ctx.fillStyle = isActive ? '#4a90e2' : '#ffffff';
            ctx.font = isActive ? 'bold 13px Arial' : '13px Arial';
            const displayName = (typeof tCategory === 'function') ? tCategory(cat) : cat;
            ctx.fillText(displayName, itemX + 8, itemY + itemH / 2 + 4);
        });
    }

    function drawDelayDropdown() {
        const options = Object.keys(REPEAT_DELAYS);
        const buttonWidth = 70;
        const buttonHeight = 40;
        const buttonY = canvas.height - 60;
        const delayDropdownX = 190; // Same as in drawNavigationButtons

        const dropdownW = 70;
        const itemH = 30;
        const dropdownH = options.length * itemH + 10;

        // Dropdown background
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        ctx.fillRect(delayDropdownX, buttonY - dropdownH - 5, dropdownW, dropdownH);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.strokeRect(delayDropdownX, buttonY - dropdownH - 5, dropdownW, dropdownH);

        // Options
        ctx.font = '14px Arial';
        options.forEach((opt, idx) => {
            const itemY = buttonY - dropdownH - 5 + 5 + idx * itemH;
            const isSelected = REPEAT_DELAYS[opt] === repeatDelay;
            
            if (isSelected) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
                ctx.fillRect(delayDropdownX + 2, itemY, dropdownW - 4, itemH);
            }
            
            ctx.fillStyle = isSelected ? '#4CAF50' : 'white';
            ctx.fillText(opt, delayDropdownX + 20, itemY + 20);
        });
    }

    function handleReviewClick(event) {
        const rect = canvas.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        const clickedY = event.clientY - rect.top;

        // Handle category picker clicks (modal - consumes all clicks)
        if (reviewCategoryPickerOpen) {
            const categories = (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) 
                ? QUALITIES 
                : Object.keys(organizedVerses);
            const padding = 10;
            const itemH = 32;
            const cols = 2;
            const itemSpacing = 6;
            const panelW = 280;
            const rows = Math.ceil(categories.length / cols);
            const colWidth = (panelW - padding * 2 - itemSpacing * (cols - 1)) / cols;
            const panelH = padding + rows * (itemH + itemSpacing) + padding + 30;

            const panelX = (canvas.width - panelW) / 2;
            const panelY = Math.max(30, (canvas.height - panelH) / 2);

            // Check if click is inside a category item
            for (let idx = 0; idx < categories.length; idx++) {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const itemX = panelX + padding + col * (colWidth + itemSpacing);
                const itemY = panelY + 30 + padding + row * (itemH + itemSpacing);

                if (clickedX >= itemX && clickedX <= itemX + colWidth &&
                    clickedY >= itemY && clickedY <= itemY + itemH) {
                    // Category selected
                    vQuality = categories[idx];
                    currentReviewVerseIndex = 0;
                    reviewCategoryPickerOpen = false;
                    stopAudio();
                    clearRepeatTimer();
                    repeatEnabled = false;
                    meditationMode = false;
                    hasPlayed = false;
                    displayReviewVerseScreen();
                    return;
                }
            }

            // Click outside items closes picker
            reviewCategoryPickerOpen = false;
            displayReviewVerseScreen();
            return;
        }

        // Check if the click was on the "Game" button
        if (clickedX >= canvas.width - 100 && clickedX <= canvas.width - 20 && clickedY >= 15 && clickedY <= 45) {
            stopAudio();
            clearRepeatTimer();
            repeatEnabled = false;
            meditationMode = false;
            hasPlayed = false;
            restoreGameState();
        }

        // Check if the click was on the quality/category button (opens picker)
        if (clickedX >= 20 && clickedX <= 100 && clickedY >= 15 && clickedY <= 45) {
            reviewCategoryPickerOpen = true;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Previous" button
        if (clickedX >= 20 && clickedX <= 100 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            if (currentReviewMode === 'incorrect') {
                currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
            } else if (currentReviewMode === 'quality') {
                currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
            }
            stopAudio();
            clearRepeatTimer();
            repeatEnabled = false;
            meditationMode = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Next" button
        if (clickedX >= canvas.width - 100 && clickedX <= canvas.width - 20 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            if (currentReviewMode === 'incorrect') {
                currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, incorrectAnswerReferences.length - 1);
            } else if (currentReviewMode === 'quality') {
                const qualityVerses = organizedVerses[vQuality];
                currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, qualityVerses.length - 1);
            }
            stopAudio();
            clearRepeatTimer();
            repeatEnabled = false;
            meditationMode = false;
            hasPlayed = false;
            displayReviewVerseScreen();
        }

        // Check if the click was on the "Repeat/Meditation" button
        if (clickedX >= 110 && clickedX <= 190 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            // Cycle through: off -> single repeat -> meditation mode
            if (!repeatEnabled && !meditationMode) {
                repeatEnabled = true;
                hasPlayed = false;
                startVerseAudio(getCurrentVerseReference());
            } else if (repeatEnabled && !meditationMode) {
                meditationMode = true;
                repeatEnabled = false;
                hasPlayed = false;
                startMeditationRepeat();
            } else {
                // Turn off meditation mode
                meditationMode = false;
                repeatEnabled = false;
                stopAudio();
                clearRepeatTimer();
            }
            displayReviewVerseScreen();
        }

        // Check if the click was on the delay dropdown (only in meditation mode)
        if (meditationMode && clickedX >= 200 && clickedX <= 270 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
            // Show delay dropdown (cycle through options for now)
            const options = Object.keys(REPEAT_DELAYS);
            const currentIndex = options.findIndex(opt => REPEAT_DELAYS[opt] === repeatDelay);
            const nextIndex = (currentIndex + 1) % options.length;
            repeatDelay = REPEAT_DELAYS[options[nextIndex]];
            displayReviewVerseScreen();
        }
    }

    function clearRepeatTimer() {
        if (repeatTimer) {
            clearTimeout(repeatTimer);
            repeatTimer = null;
        }
    }

    function startMeditationRepeat() {
        clearRepeatTimer();
        const verseRef = getCurrentVerseReference();
        if (verseRef && meditationMode) {
            startVerseAudio(verseRef);
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
        if (isAudioPlaying || (hasPlayed && !repeatEnabled && !meditationMode)) {
            return;
        }

        var $vdir = convertRef(verseReference);
        console.log("Verse directory and file:" + $vdir);
        isAudioPlaying = true;
        playAudio($vdir + ".ogg")
            .then(() => {
                isAudioPlaying = false;
                hasPlayed = true;
                
                // Handle meditation mode repeat
                if (meditationMode && gameMode === 'review') {
                    repeatTimer = setTimeout(() => {
                        if (meditationMode && gameMode === 'review') {
                            hasPlayed = false;
                            startVerseAudio(getCurrentVerseReference());
                        }
                    }, repeatDelay);
                }
                // Handle simple repeat mode (one repeat only)
                else if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                    setTimeout(() => {
                        if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                            hasPlayed = false;
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
        const qualityButtonX = 20;
        const gameButtonX = canvas.width - buttonWidth - 20;

        // Category button (tappable to open picker)
        ctx.fillStyle = reviewCategoryPickerOpen ? '#4a90e2' : 'lightblue';
        ctx.fillRect(qualityButtonX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = reviewCategoryPickerOpen ? '#4a90e2' : '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(qualityButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        const categoryLabel = (typeof tCategory === 'function') ? tCategory(vQuality) : vQuality;
        const displayLabel = categoryLabel.length > 10 ? categoryLabel.substring(0, 10) + '...' : categoryLabel;
        ctx.fillText(displayLabel + ' ▾', qualityButtonX + 5, buttonY + 20);

        // Game button
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(gameButtonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(t('review.game'), gameButtonX + 20, buttonY + 20);
    }

    function getCurrentVerseReference() {
        if (currentReviewMode === 'incorrect') {
            return incorrectAnswerReferences[currentReviewVerseIndex];
        } else if (currentReviewMode === 'quality') {
            const qualityVerses = organizedVerses[vQuality];
            return qualityVerses ? qualityVerses[currentReviewVerseIndex].Reference : null;
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
