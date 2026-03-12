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
    
    // UI State for Upgrade
    let hoveredButton = null;
    let isRepeatModeActive = false;
    let repeatDurationIndex = 1; // Default to 5s
    const REPEAT_DURATIONS = [2000, 5000, 10000];
    const REPEAT_LABELS = ['2s', '5s', '10s'];
    let dropdownOpen = false;
    let repeatTimer = null;
    let votdFlashMessage = null;

    let CANVAS_WIDTH = 400;
    let CANVAS_HEIGHT = 600;

    // Preloaded SVG icons
    const iconImages = {};
    let iconsLoaded = false;

    // Background images — all 3 preloaded, one picked randomly per verse session
    const bgImages = ['images/backgrounds/forest.png', 'images/backgrounds/lake.png', 'images/backgrounds/mountains.png'].map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });
    let currentBgImage = bgImages[0];

    function pickRandomBackground() {
        const loaded = bgImages.filter(img => img.complete && img.naturalWidth > 0);
        if (loaded.length > 0) currentBgImage = loaded[Math.floor(Math.random() * loaded.length)];
    }

    function drawBackground(c) {
        if (currentBgImage && currentBgImage.complete && currentBgImage.naturalWidth > 0) {
            const scale = Math.max(CANVAS_WIDTH / currentBgImage.width, CANVAS_HEIGHT / currentBgImage.height);
            const w = currentBgImage.width * scale;
            const h = currentBgImage.height * scale;
            c.drawImage(currentBgImage, (CANVAS_WIDTH - w) / 2, (CANVAS_HEIGHT - h) / 2, w, h);
            const grad = c.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            grad.addColorStop(0,    'rgba(10, 10, 25, 0.82)');
            grad.addColorStop(0.18, 'rgba(10, 10, 25, 0.55)');
            grad.addColorStop(0.6,  'rgba(10, 10, 25, 0.45)');
            grad.addColorStop(0.82, 'rgba(10, 10, 25, 0.65)');
            grad.addColorStop(1,    'rgba(10, 10, 25, 0.85)');
            c.fillStyle = grad;
            c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            c.fillStyle = '#0f0f1b';
            c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }

    function loadIcons() {
        if (iconsLoaded) return;
        const iconNames = ['back', 'next', 'play', 'repeat', 'share', 'stop'];
        iconNames.forEach(name => {
            const img = new Image();
            img.src = `images/icons/${name}.svg`;
            iconImages[name] = img;
        });
        iconsLoaded = true;
    }

    function drawSvgIcon(c, name, x, y, size, color) {
        const img = iconImages[name];
        if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            if (color) {
                c.globalCompositeOperation = 'source-over';
            }
            c.drawImage(img, x, y, size, size);
            c.restore();
        } else {
            c.save();
            c.strokeStyle = color || '#fff';
            c.fillStyle = color || '#fff';
            c.lineWidth = 2;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            const cx = x + size / 2;
            const cy = y + size / 2;
            const s = size * 0.6;
            if (name === 'back') {
                c.beginPath();
                c.moveTo(cx + s / 4, cy - s / 2);
                c.lineTo(cx - s / 4, cy);
                c.lineTo(cx + s / 4, cy + s / 2);
                c.stroke();
            } else if (name === 'next') {
                c.beginPath();
                c.moveTo(cx - s / 4, cy - s / 2);
                c.lineTo(cx + s / 4, cy);
                c.lineTo(cx - s / 4, cy + s / 2);
                c.stroke();
            } else if (name === 'play') {
                c.beginPath();
                c.moveTo(cx - s / 4, cy - s / 2);
                c.lineTo(cx + s / 2, cy);
                c.lineTo(cx - s / 4, cy + s / 2);
                c.closePath();
                c.fill();
            } else if (name === 'stop') {
                c.beginPath();
                c.rect(cx - s / 2, cy - s / 2, s, s);
                c.fill();
            } else if (name === 'repeat') {
                c.beginPath();
                c.arc(cx, cy, s / 2, -Math.PI / 2, Math.PI, false);
                c.stroke();
                c.beginPath();
                c.moveTo(cx - s / 2 - s / 6, cy - s / 6);
                c.lineTo(cx - s / 2, cy + s / 6);
                c.lineTo(cx - s / 2 + s / 6, cy - s / 6);
                c.stroke();
            } else if (name === 'share') {
                c.beginPath();
                c.arc(cx - s / 3, cy, s / 6, 0, Math.PI * 2);
                c.moveTo(cx + s / 3, cy - s / 3);
                c.arc(cx + s / 3, cy - s / 3, s / 6, 0, Math.PI * 2);
                c.moveTo(cx + s / 3, cy + s / 3);
                c.arc(cx + s / 3, cy + s / 3, s / 6, 0, Math.PI * 2);
                c.stroke();
                c.beginPath();
                c.moveTo(cx - s / 3 + s / 6, cy);
                c.lineTo(cx + s / 3 - s / 6, cy - s / 3);
                c.moveTo(cx - s / 3 + s / 6, cy);
                c.lineTo(cx + s / 3 - s / 6, cy + s / 3);
                c.stroke();
            }
            c.restore();
        }
    }

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

        loadIcons();
        pickRandomBackground();

        // Pause music during VOTD learning and restore it on return to gameplay.
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
        isRepeatModeActive = false;
        dropdownOpen = false;

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
        currentAudio.onended = function () { 
            isAudioPlaying = false; 
            if (isRepeatModeActive) {
                clearTimeout(repeatTimer);
                repeatTimer = setTimeout(() => {
                    if (isRepeatModeActive && window.gameMode === 'votd' && votdMode === 'learning') {
                        playVerseAudio();
                    }
                }, REPEAT_DURATIONS[repeatDurationIndex]);
            }
        };
        currentAudio.onerror = function () {
            console.warn('Failed to play verse audio:', audioUrl);
            isAudioPlaying = false;
        };
        currentAudio.play().catch(err => {
            console.warn('Audio playback failed:', err);
            isAudioPlaying = false;
        });
    }

    /**
     * Draw tooltip for desktop hover
     */
    function drawTooltip(c, text, x, y) {
        c.font = '12px Arial';
        const textWidth = c.measureText(text).width;
        const tw = textWidth + 12;
        const th = 22;
        
        let tx = x - tw / 2;
        let ty = y - th - 10;
        
        // Boundaries
        if (tx < 5) tx = 5;
        if (tx + tw > CANVAS_WIDTH - 5) tx = CANVAS_WIDTH - tw - 5;
        if (ty < 5) ty = y + 40;

        c.fillStyle = 'rgba(0, 0, 0, 0.85)';
        c.beginPath();
        c.roundRect(tx, ty, tw, th, 4);
        c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        c.stroke();

        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, tx + tw / 2, ty + th / 2);
        c.textBaseline = 'alphabetic';
    }

    function drawTimingDropdown(c, x, y) {
        const h = REPEAT_LABELS.length * 32;
        const w = 55;
        
        c.fillStyle = 'rgba(30, 30, 50, 0.98)';
        c.beginPath();
        c.roundRect(x, y, w, h, 8);
        c.fill();
        c.strokeStyle = '#4CAF50';
        c.lineWidth = 2;
        c.stroke();

        REPEAT_LABELS.forEach((label, i) => {
            const iy = y + i * 32;
            if (hoveredButton === `repeatOpt${i}`) {
                c.fillStyle = 'rgba(76, 175, 80, 0.2)';
                c.fillRect(x + 2, iy + 2, w - 4, 28);
            }
            c.fillStyle = repeatDurationIndex === i ? '#ffd700' : '#fff';
            c.font = repeatDurationIndex === i ? 'bold 13px Arial' : '13px Arial';
            c.textAlign = 'center';
            c.fillText(label, x + w / 2, iy + 21);
            
            hitRects.push({ name: `repeatOpt${i}`, x: x, y: iy, w: w, h: 32 });
        });
    }

    function handleMouseMove(x, y) {
        let found = null;
        for (const rect of hitRects) {
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                found = rect.name;
                break;
            }
        }
        if (hoveredButton !== found) {
            hoveredButton = found;
            render();
        }
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
        drawBackground(c);

        hitRects = [];

        // === TOP BAR ===
        const topBarHeight = 60;
        const iconSize = 44;
        const iconY = 12;

        // Back Icon (Top Left)
        const backX = 10;
        if (hoveredButton === 'exit') {
            c.fillStyle = 'rgba(255, 255, 255, 0.1)';
            c.beginPath();
            c.roundRect(backX, iconY, iconSize, iconSize, 10);
            c.fill();
        }
        drawSvgIcon(c, 'back', backX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'exit', x: backX, y: iconY, w: iconSize, h: iconSize, tooltip: t('common.back') });

        // Share Icon (Top Right)
        const shareX = CANVAS_WIDTH - iconSize - 10;
        if (hoveredButton === 'share') {
            c.fillStyle = 'rgba(255, 255, 255, 0.1)';
            c.beginPath();
            c.roundRect(shareX, iconY, iconSize, iconSize, 10);
            c.fill();
        }
        drawSvgIcon(c, 'share', shareX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'share', x: shareX, y: iconY, w: iconSize, h: iconSize, tooltip: t('common.share') });


        // Title (Centered)
        c.fillStyle = '#ffd700';
        c.font = 'bold 18px "Segoe UI", Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.verseOfTheDay'), CANVAS_WIDTH / 2, 32);

        c.fillStyle = 'rgba(255, 215, 0, 0.7)';
        c.font = '13px Arial';
        c.fillText(currentVerse.Reference, CANVAS_WIDTH / 2, 52);

        // === VERSE TEXT ===
        c.fillStyle = '#fff';
        c.font = 'bold 19px "Segoe UI", Arial';
        c.textAlign = 'left';
        drawWrappedText(c, currentVerse.Text, 25, topBarHeight + 40, CANVAS_WIDTH - 50, 30);

        // === BOTTOM CONTROLS ===
        const bottomY = CANVAS_HEIGHT - 110;
        
        // Play Audio Button (Center)
        const playSize = 56;
        const playX = CANVAS_WIDTH / 2 - playSize / 2;
        const playY = bottomY;
        if (hoveredButton === 'audio') {
            c.fillStyle = isAudioPlaying ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 170, 255, 0.15)';
            c.beginPath();
            c.arc(playX + playSize / 2, playY + playSize / 2, playSize / 2 + 6, 0, Math.PI * 2);
            c.fill();
        }
        drawSvgIcon(c, isAudioPlaying ? 'stop' : 'play', playX, playY, playSize, isAudioPlaying ? '#4CAF50' : '#00aaff');
        hitRects.push({ name: 'audio', x: playX, y: playY, w: playSize, h: playSize, tooltip: isAudioPlaying ? t('votd.stop') : t('votd.playAudio') });

        // Devotional Button (Left of Play)
        const devW = 90;
        const devH = 36;
        const devX = 20;
        const devY = bottomY + 10;
        if (hoveredButton === 'devotional') {
            c.fillStyle = 'rgba(232, 212, 77, 0.2)';
            c.beginPath();
            c.roundRect(devX, devY, devW, devH, 18);
            c.fill();
        }
        c.strokeStyle = '#e8d44d';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(devX, devY, devW, devH, 18);
        c.stroke();
        c.fillStyle = '#e8d44d';
        c.font = 'bold 11px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.devotional') || 'Devotional', devX + devW / 2, devY + 23);
        hitRects.push({ name: 'devotional', x: devX, y: devY, w: devW, h: devH });

        // Start Learning Button (Right of Play)
        const startSize = 48;
        const startX = CANVAS_WIDTH - startSize - 20;
        const startY = bottomY + 4;
        if (hoveredButton === 'startLearning') {
            c.fillStyle = 'rgba(76, 175, 80, 0.15)';
            c.beginPath();
            c.arc(startX + startSize / 2, startY + startSize / 2, startSize / 2 + 6, 0, Math.PI * 2);
            c.fill();
        }
        drawSvgIcon(c, 'next', startX, startY, startSize, '#4CAF50');
        c.fillStyle = '#4CAF50';
        c.font = 'bold 9px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.start').toUpperCase(), startX + startSize / 2, startY + startSize + 12);
        hitRects.push({ name: 'startLearning', x: startX, y: startY, w: startSize, h: startSize, tooltip: t('votd.startLearning') });

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
        drawBackground(c);

        hitRects = [];

        // === TOP BAR ===
        const topBarHeight = 60;
        const iconSize = 44;
        const iconY = 12;

        // Back Icon (Top Left)
        const backX = 10;
        if (hoveredButton === 'backToPresentation') {
            c.fillStyle = 'rgba(255, 255, 255, 0.1)';
            c.beginPath();
            c.roundRect(backX, iconY, iconSize, iconSize, 10);
            c.fill();
        }
        drawSvgIcon(c, 'back', backX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'backToPresentation', x: backX, y: iconY, w: iconSize, h: iconSize, tooltip: t('common.back') });

        // Share Icon (Top Right)
        const shareX = CANVAS_WIDTH - iconSize - 10;
        if (hoveredButton === 'share') {
            c.fillStyle = 'rgba(255, 255, 255, 0.1)';
            c.beginPath();
            c.roundRect(shareX, iconY, iconSize, iconSize, 10);
            c.fill();
        }
        drawSvgIcon(c, 'share', shareX, iconY, iconSize, '#fff');
        hitRects.push({ name: 'share', x: shareX, y: iconY, w: iconSize, h: iconSize, tooltip: t('common.share') });


        // Title (Centered)
        c.fillStyle = '#ffd700';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.learning', wordsHidden, maxWordsHidden), CANVAS_WIDTH / 2, 32);

        c.fillStyle = 'rgba(255, 215, 0, 0.7)';
        c.font = '13px Arial';
        c.fillText(currentVerse.Reference, CANVAS_WIDTH / 2, 52);

        // === VERSE WITH BLANKS ===
        c.fillStyle = '#fff';
        c.font = 'bold 17px "Segoe UI", Arial';
        c.textAlign = 'left';
        drawWrappedText(c, cachedVerseDisplay, 20, topBarHeight + 30, CANVAS_WIDTH - 40, 27);

        // === INSTRUCTION ===
        c.fillStyle = 'rgba(255, 255, 255, 0.5)';
        c.font = 'italic 12px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.readAloud'), CANVAS_WIDTH / 2, CANVAS_HEIGHT - 150);

        // === BOTTOM CONTROLS ===
        const bottomY = CANVAS_HEIGHT - 85;
        const repSize = 46;

        // Repeat Toggle (Left)
        const repX = 15;
        const repY = bottomY;
        if (hoveredButton === 'repeatToggle') {
            c.fillStyle = 'rgba(76, 175, 80, 0.15)';
            c.beginPath();
            c.arc(repX + repSize / 2, repY + repSize / 2, repSize / 2 + 5, 0, Math.PI * 2);
            c.fill();
        }
        drawSvgIcon(c, 'repeat', repX, repY, repSize, isRepeatModeActive ? '#4CAF50' : '#888');
        hitRects.push({ name: 'repeatToggle', x: repX, y: repY, w: repSize, h: repSize, tooltip: t('votd.repeatMode') });

        // Timing selector (to the RIGHT of repeat, never overlaps Share)
        if (isRepeatModeActive) {
            const timeX = repX + repSize + 8;
            const timeY = repY + 7;
            const timeW = 48;
            const timeH = 32;
            
            if (hoveredButton === 'timing') {
                c.fillStyle = 'rgba(76, 175, 80, 0.25)';
            } else {
                c.fillStyle = 'rgba(0, 0, 0, 0.4)';
            }
            c.beginPath();
            c.roundRect(timeX, timeY, timeW, timeH, 6);
            c.fill();
            c.strokeStyle = isRepeatModeActive ? '#4CAF50' : '#555';
            c.lineWidth = 1.5;
            c.stroke();
            
            c.fillStyle = '#fff';
            c.font = 'bold 12px Arial';
            c.textAlign = 'center';
            c.fillText(REPEAT_LABELS[repeatDurationIndex], timeX + timeW / 2, timeY + 21);
            hitRects.push({ name: 'timing', x: timeX, y: timeY, w: timeW, h: timeH, tooltip: t('votd.repeatTiming') });
            
            // Dropdown opens BELOW the timing button (not above where Share is)
            if (dropdownOpen) {
                drawTimingDropdown(c, timeX, timeY + timeH + 4);
            }
        }

        // Hide Word Button (Center)
        if (wordsHidden < maxWordsHidden) {
            const hwW = 95;
            const hwH = 38;
            const hwX = CANVAS_WIDTH / 2 - hwW / 2;
            const hwY = bottomY + 4;
            if (hoveredButton === 'hideWord') {
                c.fillStyle = 'rgba(230, 126, 34, 0.25)';
                c.beginPath();
                c.roundRect(hwX, hwY, hwW, hwH, 19);
                c.fill();
            }
            c.strokeStyle = '#e67e22';
            c.lineWidth = 2;
            c.beginPath();
            c.roundRect(hwX, hwY, hwW, hwH, 19);
            c.stroke();
            c.fillStyle = '#e67e22';
            c.font = 'bold 12px Arial';
            c.textAlign = 'center';
            c.fillText(t('votd.hideWord'), hwX + hwW / 2, hwY + 24);
            hitRects.push({ name: 'hideWord', x: hwX, y: hwY, w: hwW, h: hwH });
        }

        // Test Now Button (Right)
        const tnW = 80;
        const tnH = 38;
        const tnX = CANVAS_WIDTH - tnW - 15;
        const tnY = bottomY + 4;
        if (hoveredButton === 'testNow') {
            c.fillStyle = '#4CAF50';
            c.beginPath();
            c.roundRect(tnX, tnY, tnW, tnH, 19);
            c.fill();
            c.fillStyle = '#fff';
        } else {
            c.strokeStyle = '#4CAF50';
            c.lineWidth = 2;
            c.beginPath();
            c.roundRect(tnX, tnY, tnW, tnH, 19);
            c.stroke();
            c.fillStyle = '#4CAF50';
        }
        c.font = 'bold 12px Arial';
        c.textAlign = 'center';
        c.fillText(t('votd.testNow'), tnX + tnW / 2, tnY + 24);
        hitRects.push({ name: 'testNow', x: tnX, y: tnY, w: tnW, h: tnH });

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

        // Draw flash message (share feedback)
        if (votdFlashMessage) {
            const c = getCtx();
            const elapsed = Date.now() - votdFlashMessage.startTime;
            if (elapsed < votdFlashMessage.duration) {
                const alpha = Math.min(1, 1 - (elapsed / votdFlashMessage.duration) * 0.5);
                c.save();
                c.globalAlpha = alpha;
                c.fillStyle = 'rgba(76, 175, 80, 0.9)';
                c.font = 'bold 16px Arial';
                c.textAlign = 'center';
                const msgW = c.measureText(votdFlashMessage.text).width + 30;
                const msgX = CANVAS_WIDTH / 2 - msgW / 2;
                const msgY = 65;
                c.beginPath();
                c.roundRect(msgX, msgY, msgW, 32, 8);
                c.fill();
                c.fillStyle = '#fff';
                c.fillText(votdFlashMessage.text, CANVAS_WIDTH / 2, msgY + 22);
                c.textAlign = 'left';
                c.restore();
            } else {
                votdFlashMessage = null;
            }
        }

        // Draw Tooltip (Top Layer)
        if (hoveredButton) {
            const rect = hitRects.find(r => r.name === hoveredButton);
            if (rect && rect.tooltip) {
                drawTooltip(getCtx(), rect.tooltip, rect.x + rect.w / 2, rect.y);
            }
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
                if (rect.name === 'exit') {
                    exitLearningMode();
                } else if (rect.name === 'backToPresentation') {
                    currentPhase = 'presentation';
                    stopAudio();
                } else if (rect.name === 'audio') {
                    if (isAudioPlaying) stopAudio();
                    else playVerseAudio();
                } else if (rect.name === 'repeatToggle') {
                    isRepeatModeActive = !isRepeatModeActive;
                    if (!isRepeatModeActive) {
                        clearTimeout(repeatTimer);
                        dropdownOpen = false;
                    }
                } else if (rect.name === 'timing') {
                    dropdownOpen = !dropdownOpen;
                } else if (rect.name.startsWith('repeatOpt')) {
                    const idx = parseInt(rect.name.replace('repeatOpt', ''));
                    repeatDurationIndex = idx;
                    dropdownOpen = false;
                } else if (rect.name === 'share') {
                    if (window.ShareManager && currentVerse) {
                        ShareManager.shareVotd(currentVerse.Reference).then(result => {
                            if (result.success) {
                                votdFlashMessage = {
                                    text: result.method === 'native' ? '📤 Shared!' : '📋 Copied to clipboard!',
                                    startTime: Date.now(),
                                    duration: 2000
                                };
                                render();
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
                
                // If we didn't click inside the dropdown but it was open, close it
                if (dropdownOpen && !rect.name.startsWith('repeatOpt') && rect.name !== 'timing') {
                    dropdownOpen = false;
                }
                
                render();
                return;
            }
        }
        
        // Click outside any button closes dropdown
        if (dropdownOpen) {
            dropdownOpen = false;
            render();
        }
    }

    function handleMouseMove(x, y) {
        let found = null;
        for (const rect of hitRects) {
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                found = rect.name;
                break;
            }
        }
        if (hoveredButton !== found) {
            hoveredButton = found;
            render();
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
        clearTimeout(repeatTimer);
    }

    function exitLearningMode() {
        stopAudio();
        window.gameMode = 'game';
        votdMode = null;
        currentVerse = null;
        if (musicWasPlaying &&
            typeof MusicManager !== 'undefined' &&
            typeof MusicManager.resume === 'function') {
            MusicManager.resume();
        }
        musicWasPlaying = false;
    }

    window.VotdLearningMode = {
        start: start,
        render: render,
        handleClick: handleClick,
        handleMouseMove: handleMouseMove,
        launchTest: launchTest,
        exitLearningMode: exitLearningMode
    };
})();
