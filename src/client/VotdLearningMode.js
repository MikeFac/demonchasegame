// VotdLearningMode.js - Progressive VOTD memorization/meditation interface
// IIFE pattern, sets window.VotdLearningMode
(function () {
    let currentVerse = null;
    let wordsHidden = 0;
    let maxWordsHidden = 0;
    let hiddenIndices = [];
    let hitRects = [];
    let isAudioPlaying = false;
    let currentAudio = null;
    let currentPhase = 'presentation'; // 'presentation' | 'learning'
    let cachedVerseDisplay = '';
    let musicWasPlaying = false;

    let CANVAS_WIDTH = 400;
    let CANVAS_HEIGHT = 600;

    function getCanvas() {
        return typeof canvas !== 'undefined' ? canvas : { width: 400, height: 600 };
    }
    function getCtx() {
        return typeof ctx !== 'undefined' ? ctx : null;
    }
    function updateDimensions() {
        const c = getCanvas();
        CANVAS_WIDTH = c.width || 400;
        CANVAS_HEIGHT = c.height || 600;
    }

    /**
     * Start learning mode with a verse
     */
    function start(verseObj) {
        if (!verseObj) {
            console.error('No verse provided to VotdLearningMode');
            return;
        }

        // Pause music during VOTD
        if (typeof MusicManager !== 'undefined' && MusicManager.getIsPlaying()) {
            musicWasPlaying = true;
            MusicManager.pause();
        } else {
            musicWasPlaying = false;
        }

        currentVerse = verseObj;
        wordsHidden = 0;
        hiddenIndices = [];
        cachedVerseDisplay = currentVerse.Text;
        currentPhase = 'presentation';
        isAudioPlaying = false;

        const verseWords = currentVerse.Text.split(' ');
        maxWordsHidden = Math.ceil(verseWords.length / 2);

        window.gameMode = 'votd';
        votdMode = 'learning';

        console.log('VOTD Learning Mode started:', currentVerse.Reference);
    }

    function playVerseAudio() {
        if (isAudioPlaying) return;

        const audioPath = convertRefToAudioPath(currentVerse.Reference);
        const audioUrl = 'https://spiritualwar.games/otd/mv/www/audio/se/' + audioPath;

        isAudioPlaying = true;
        currentAudio = new Audio(audioUrl);
        currentAudio.onended = function () { isAudioPlaying = false; };
        currentAudio.onerror = function () {
            console.warn('Failed to play verse audio:', audioUrl);
            isAudioPlaying = false;
        };
        currentAudio.play().catch(err => {
            console.warn('Audio playback failed:', err);
            isAudioPlaying = false;
        });
    }

    function convertRefToAudioPath(reference) {
        const bookMap = {
            'Genesis': 'GEN', '1 Samuel': 'SA1', '2 Samuel': 'SA2', 'Psalms': 'PSA',
            'Proverbs': 'PRV', 'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM',
            'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL',
            'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC',
            'Nahum': 'NAH', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG',
            'Zechariah': 'ZEC', 'Malachi': 'MAL', 'Matthew': 'MAT', 'Mark': 'MRK',
            'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM',
            '1 Corinthians': 'CO1', '2 Corinthians': 'CO2', 'Galatians': 'GAL',
            'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
            '1 Thessalonians': 'TH1', '2 Thessalonians': 'TH2', '1 Timothy': 'TI1',
            '2 Timothy': 'TI2', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB',
            'James': 'JAS', '1 Peter': 'PE1', '2 Peter': 'PE2', '1 John': 'JO1',
            '2 John': 'JO2', '3 John': 'JO3', 'Jude': 'JUD', 'Revelation': 'REV',
            'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
            'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Kings': 'KI1',
            '2 Kings': 'KI2', '1 Chronicles': 'CH1', '2 Chronicles': 'CH2',
            'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB',
            'Ecclesiastes': 'ECC', 'Song of Solomon': 'SON'
        };
        const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
        if (!match) return 'UNKNOWN.ogg';
        const bookCode = bookMap[match[1]] || 'UNK';
        return `${bookCode}-${match[2]}-${match[3]}.ogg`;
    }

    /**
     * Hide one more word and rebuild display. Called once per click.
     */
    function hideNextWord() {
        if (wordsHidden >= maxWordsHidden) return;

        const verseWords = currentVerse.Text.split(' ');
        // Pick a random word that isn't already hidden
        const available = [];
        for (let i = 0; i < verseWords.length; i++) {
            if (!hiddenIndices.includes(i)) available.push(i);
        }
        if (available.length === 0) return;

        const pick = available[Math.floor(Math.random() * available.length)];
        hiddenIndices.push(pick);
        hiddenIndices.sort((a, b) => a - b);
        wordsHidden = hiddenIndices.length;

        // Rebuild cached display
        cachedVerseDisplay = verseWords.map((word, idx) => {
            if (hiddenIndices.includes(idx)) {
                return '_'.repeat(Math.max(3, word.length));
            }
            return word;
        }).join(' ');
    }

    /**
     * Draw presentation phase (full verse + audio + start)
     */
    function drawPresentation() {
        updateDimensions();
        const c = getCtx();
        if (!c) return;

        c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        c.fillStyle = '#1a1a2e';
        c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        c.fillStyle = '#ffd700';
        c.font = 'bold 24px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.verseOfTheDay'), CANVAS_WIDTH / 2, 40);

        c.fillStyle = '#aaa';
        c.font = '14px Arial';
        c.fillText(currentVerse.Reference, CANVAS_WIDTH / 2, 65);

        c.fillStyle = '#fff';
        c.font = 'bold 18px Arial';
        c.textAlign = 'left';
        drawWrappedText(c, currentVerse.Text, 20, 100, CANVAS_WIDTH - 40, 30);

        hitRects = [];

        // Play audio button
        const audioX = CANVAS_WIDTH / 2 - 60;
        const audioY = CANVAS_HEIGHT - 140;
        c.fillStyle = isAudioPlaying ? '#00aa00' : '#0066cc';
        c.fillRect(audioX, audioY, 120, 40);
        c.fillStyle = '#fff';
        c.font = '16px Arial';
        c.textAlign = 'center';
        c.fillText(isAudioPlaying ? t('votd.playing') : t('votd.playAudio'), audioX + 60, audioY + 28);
        hitRects.push({ name: 'audio', x: audioX, y: audioY, w: 120, h: 40 });

        // Devotional button
        const devX = CANVAS_WIDTH / 2 - 60;
        const devY = CANVAS_HEIGHT - 80;
        c.fillStyle = '#e8d44d';
        c.fillRect(devX, devY, 120, 36);
        c.fillStyle = '#333';
        c.font = 'bold 14px Arial';
        c.fillText('Devotional', devX + 60, devY + 24);
        hitRects.push({ name: 'devotional', x: devX, y: devY, w: 120, h: 36 });

        // Share button (left side at bottom)
        const shareX = 20;
        const shareY = CANVAS_HEIGHT - 35;
        c.fillStyle = '#4CAF50';
        c.fillRect(shareX, shareY, 70, 32);
        c.fillStyle = '#fff';
        c.font = '14px Arial';
        c.textAlign = 'center';
        c.fillText('📤 Share', shareX + 35, shareY + 22);
        hitRects.push({ name: 'share', x: shareX, y: shareY, w: 70, h: 32 });

        // Start Learning button (center)
        const startX = CANVAS_WIDTH / 2 - 70;
        const startY = CANVAS_HEIGHT - 35;
        c.fillStyle = '#4CAF50';
        c.fillRect(startX, startY, 140, 32);
        c.fillStyle = '#fff';
        c.font = '15px Arial';
        c.fillText(t('votd.startLearning'), startX + 70, startY + 22);
        hitRects.push({ name: 'startLearning', x: startX, y: startY, w: 140, h: 32 });

        c.textAlign = 'left';
    }

    /**
     * Draw learning phase (verse with progressive blanks, no quiz)
     */
    function drawLearning() {
        updateDimensions();
        const c = getCtx();
        if (!c) return;

        c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        c.fillStyle = '#1a1a2e';
        c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Header
        c.fillStyle = '#ffd700';
        c.font = 'bold 20px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.learning', wordsHidden, maxWordsHidden), CANVAS_WIDTH / 2, 30);

        // Reference
        c.fillStyle = '#aaa';
        c.font = '13px Arial';
        c.fillText(currentVerse.Reference, CANVAS_WIDTH / 2, 50);

        // Verse with blanks
        c.fillStyle = '#fff';
        c.font = 'bold 16px Arial';
        c.textAlign = 'left';
        drawWrappedText(c, cachedVerseDisplay, 20, 80, CANVAS_WIDTH - 40, 26);

        // Instruction
        c.fillStyle = '#888';
        c.font = '13px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.readAloud'), CANVAS_WIDTH / 2, CANVAS_HEIGHT - 130);

        hitRects = [];

        // Replay audio (top right)
        const raX = CANVAS_WIDTH - 110;
        c.fillStyle = '#0066cc';
        c.fillRect(raX, 5, 100, 28);
        c.fillStyle = '#fff';
        c.font = '12px Arial';
        c.fillText(t('votd.replayAudio'), raX + 50, 24);
        hitRects.push({ name: 'audio', x: raX, y: 5, w: 100, h: 28 });

        // Bottom buttons
        const btnY = CANVAS_HEIGHT - 55;
        const btnH = 40;

        // Hide Word button (left)
        if (wordsHidden < maxWordsHidden) {
            const hwX = 20;
            const hwW = 120;
            c.fillStyle = '#e67e22';
            c.fillRect(hwX, btnY, hwW, btnH);
            c.fillStyle = '#fff';
            c.font = 'bold 14px Arial';
            c.textAlign = 'center';
            c.fillText(t('votd.hideWord'), hwX + hwW / 2, btnY + 27);
            hitRects.push({ name: 'hideWord', x: hwX, y: btnY, w: hwW, h: btnH });
        }

        // Test Now button (right)
        const tnX = CANVAS_WIDTH - 140;
        const tnW = 120;
        c.fillStyle = '#4CAF50';
        c.fillRect(tnX, btnY, tnW, btnH);
        c.fillStyle = '#fff';
        c.font = 'bold 14px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.testNow'), tnX + tnW / 2, btnY + 27);
        hitRects.push({ name: 'testNow', x: tnX, y: btnY, w: tnW, h: btnH });

        c.textAlign = 'left';
    }

    function drawWrappedText(c, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            if (c.measureText(testLine).width > maxWidth && i > 0) {
                c.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line.length > 0) c.fillText(line, x, y);
    }

    function openDevotional() {
        if (!currentVerse || !window.SermonViewer) return;
        stopAudio();
        var category = currentVerse.Category || 'General';
        SermonViewer.open(currentVerse.Reference, currentVerse.Text, category, function () {
            // Return to VOTD learning mode when sermon viewer closes
        });
    }

    function render() {
        // If sermon viewer is open, let it render instead
        if (window.SermonViewer && SermonViewer.isOpen()) {
            SermonViewer.render();
            return;
        }

        if (currentPhase === 'presentation') {
            drawPresentation();
        } else if (currentPhase === 'learning') {
            drawLearning();
        }
    }

    function handleClick(x, y) {
        // If sermon viewer is open, delegate clicks to it
        if (window.SermonViewer && SermonViewer.isOpen()) {
            SermonViewer.handleClick(x, y);
            return;
        }

        for (const rect of hitRects) {
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                if (rect.name === 'audio') {
                    playVerseAudio();
                } else if (rect.name === 'share') {
                    if (window.ShareManager && currentVerse) {
                        ShareManager.shareVotd(currentVerse.Reference).then(result => {
                            if (result.success) {
                                ShareManager.showShareSuccess(result.method);
                            }
                        });
                    }
                } else if (rect.name === 'startLearning') {
                    currentPhase = 'learning';
                    hideNextWord(); // Start with 1 word hidden
                } else if (rect.name === 'hideWord') {
                    hideNextWord();
                } else if (rect.name === 'testNow') {
                    launchTest();
                } else if (rect.name === 'devotional') {
                    openDevotional();
                }
                return;
            }
        }
    }

    function launchTest() {
        stopAudio();
        votdMode = 'test';
        if (window.VotdTestMode) {
            VotdTestMode.start(currentVerse);
        } else {
            console.error('VotdTestMode not available');
            exitLearningMode();
        }
    }

    function stopAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        isAudioPlaying = false;
    }

    function exitLearningMode() {
        stopAudio();
        window.gameMode = 'game';
        votdMode = null;
        currentVerse = null;
    }

    window.VotdLearningMode = {
        start: start,
        render: render,
        handleClick: handleClick,
        launchTest: launchTest,
        exitLearningMode: exitLearningMode
    };
})();
