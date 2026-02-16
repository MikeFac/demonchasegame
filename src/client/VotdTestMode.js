// VotdTestMode.js - VOTD final assessment, one word at a time
// IIFE pattern, sets window.VotdTestMode
(function () {
    let currentVerse = null;
    let verseWords = [];
    let hiddenWordCount = 0;
    let hiddenIndices = [];
    let currentWordIdx = 0; // Which hidden word we're testing now
    let correctLetters = '';
    let currentAnswer = null; // Selected letter for current word
    let testState = 'answering'; // 'answering' | 'success'
    let successStartTime = 0;
    let confettiParticles = [];
    let cachedOptions = []; // Cached letter options per hidden word
    let hitRects = [];
    let revealedIndices = new Set(); // Hidden word indices that have been correctly answered

    const TEXT_Y_START = 80;
    const LINE_HEIGHT = 26;

    function getCtx() {
        return typeof ctx !== 'undefined' ? ctx : null;
    }
    function getCanvas() {
        return typeof canvas !== 'undefined' ? canvas : { width: 400, height: 600 };
    }
    function getCanvasWidth() { return getCanvas().width || 400; }
    function getCanvasHeight() { return getCanvas().height || 600; }

    /**
     * Start test mode
     */
    function start(verseObj) {
        if (!verseObj) {
            console.error('No verse provided to VotdTestMode');
            return;
        }

        currentVerse = verseObj;
        verseWords = currentVerse.Text.split(' ');
        hiddenWordCount = Math.ceil(verseWords.length / 2);
        testState = 'answering';
        currentWordIdx = 0;
        currentAnswer = null;
        confettiParticles = [];
        revealedIndices = new Set();

        selectWordsToHide();
        prepareOptions();

        gameMode = 'votd';
        votdMode = 'test';

        console.log('VOTD Test Mode started:', currentVerse.Reference,
            'Testing', hiddenWordCount, 'words one at a time');
    }

    /**
     * Randomly select 50% of words to hide
     */
    function selectWordsToHide() {
        const indices = Array.from(Array(verseWords.length).keys());
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        hiddenIndices = indices.slice(0, hiddenWordCount);
        hiddenIndices.sort((a, b) => a - b);

        correctLetters = '';
        hiddenIndices.forEach(idx => {
            correctLetters += verseWords[idx].charAt(0).toUpperCase();
        });
    }

    /**
     * Pre-generate letter options for each hidden word (called once)
     */
    function prepareOptions() {
        const allLetters = new Set();
        verseWords.forEach(word => allLetters.add(word.charAt(0).toUpperCase()));
        const alphabet = 'ABCDEFGHIJKLMNOPRSTUVWY'.split(''); // No Q, X, Z
        const distractors = alphabet.filter(l => !allLetters.has(l));

        cachedOptions = [];
        for (let i = 0; i < hiddenIndices.length; i++) {
            const correct = correctLetters.charAt(i);
            const options = [correct];

            // Shuffle distractors for variety per word
            const shuffled = distractors.slice();
            for (let j = shuffled.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
            for (let j = 0; j < 5 && j < shuffled.length; j++) {
                options.push(shuffled[j]);
            }

            // Shuffle all options
            for (let j = options.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [options[j], options[k]] = [options[k], options[j]];
            }

            cachedOptions.push({ correct, options });
        }
    }

    /**
     * Draw verse with blanks, revealed words shown in green
     */
    function drawVerseWithState(c, x, y, maxWidth, lineHeight) {
        const words = [];
        const colors = [];
        for (let i = 0; i < verseWords.length; i++) {
            if (revealedIndices.has(i)) {
                words.push(verseWords[i]);
                colors.push('#4CAF50'); // Green for revealed
            } else if (hiddenIndices.includes(i)) {
                words.push('_'.repeat(Math.max(3, verseWords[i].length)));
                colors.push('#fff');
            } else {
                words.push(verseWords[i]);
                colors.push('#fff');
            }
        }

        // Word-wrap with per-word coloring
        let line = '';
        let lineColors = [];
        let lineWords = [];
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            if (c.measureText(testLine).width > maxWidth && i > 0) {
                // Draw this line word by word
                drawColoredLine(c, lineWords, lineColors, x, y);
                line = words[i] + ' ';
                lineWords = [words[i]];
                lineColors = [colors[i]];
                y += lineHeight;
            } else {
                line = testLine;
                lineWords.push(words[i]);
                lineColors.push(colors[i]);
            }
        }
        if (lineWords.length > 0) {
            drawColoredLine(c, lineWords, lineColors, x, y);
        }
    }

    function drawColoredLine(c, words, colors, x, y) {
        let curX = x;
        for (let i = 0; i < words.length; i++) {
            c.fillStyle = colors[i];
            c.fillText(words[i], curX, y);
            curX += c.measureText(words[i] + ' ').width;
        }
    }

    /**
     * Play a short ding sound for correct answer
     */
    function playDing() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const actx = new AudioContext();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.frequency.setValueAtTime(880, actx.currentTime); // A5
            gain.gain.setValueAtTime(0.3, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
            osc.start(actx.currentTime);
            osc.stop(actx.currentTime + 0.15);
        } catch (e) {
            // Ignore audio errors
        }
    }

    /**
     * Draw answering phase - one word at a time
     */
    function drawAnswering() {
        const c = getCtx();
        if (!c) return;

        const cw = getCanvasWidth();
        const ch = getCanvasHeight();

        c.clearRect(0, 0, cw, ch);
        c.fillStyle = '#1a1a2e';
        c.fillRect(0, 0, cw, ch);

        // Header
        c.fillStyle = '#ffd700';
        c.font = 'bold 22px Arial';
        c.textAlign = 'center';
        c.fillText('Test Your Memory', cw / 2, 35);

        // Progress
        c.fillStyle = '#aaa';
        c.font = '13px Arial';
        c.fillText(`${currentVerse.Reference}  —  Word ${currentWordIdx + 1} of ${hiddenWordCount}`, cw / 2, 55);

        // Verse with blanks (revealed words in green)
        c.font = 'bold 15px Arial';
        c.textAlign = 'left';
        drawVerseWithState(c, 20, TEXT_Y_START, cw - 40, LINE_HEIGHT);

        hitRects = [];

        // Current word prompt
        const wordIdx = hiddenIndices[currentWordIdx];
        const word = verseWords[wordIdx];
        const promptY = 280;

        c.fillStyle = '#ffd700';
        c.font = 'bold 16px Arial';
        c.textAlign = 'center';
        c.fillText(`What letter does the missing word start with?`, cw / 2, promptY);

        c.fillStyle = '#888';
        c.font = '13px Arial';
        c.fillText(`(Hint: ${word.length} letters)`, cw / 2, promptY + 22);

        // Letter buttons from cached options
        const opts = cachedOptions[currentWordIdx];
        const buttonW = 55;
        const buttonH = 45;
        const spacing = 10;
        const totalW = opts.options.length * (buttonW + spacing) - spacing;
        const startX = (cw - totalW) / 2;
        const btnY = promptY + 50;

        for (let i = 0; i < opts.options.length; i++) {
            const letter = opts.options[i];
            const bx = startX + i * (buttonW + spacing);
            c.fillStyle = '#333';
            c.fillRect(bx, btnY, buttonW, buttonH);
            c.fillStyle = '#fff';
            c.font = 'bold 24px Arial';
            c.textAlign = 'center';
            c.fillText(letter, bx + buttonW / 2, btnY + 32);

            hitRects.push({
                name: 'letter', letter: letter,
                x: bx, y: btnY, w: buttonW, h: buttonH
            });
        }

        c.textAlign = 'left';
    }

    function drawWrappedText(text, x, y, maxWidth, lineHeight) {
        const c = getCtx();
        if (!c) return;
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

    function drawSuccess() {
        const c = getCtx();
        if (!c) return;

        const cw = getCanvasWidth();
        const ch = getCanvasHeight();

        c.clearRect(0, 0, cw, ch);
        c.fillStyle = '#1a1a2e';
        c.fillRect(0, 0, cw, ch);

        drawConfetti();

        c.fillStyle = '#ffd700';
        c.font = 'bold 28px Arial';
        c.textAlign = 'center';
        c.fillText('Verse Complete!', cw / 2, ch / 2 - 40);

        c.fillStyle = '#4CAF50';
        c.font = 'bold 22px Arial';
        c.fillText('Well done!', cw / 2, ch / 2 + 40);

        c.fillStyle = '#fff';
        c.font = '14px Arial';
        c.fillText('Returning to game...', cw / 2, ch / 2 + 100);
    }

    function playFanfare() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const actx = new AudioContext();
            const notes = [
                { freq: 523, time: 0 }, { freq: 659, time: 0.15 },
                { freq: 784, time: 0.3 }, { freq: 1047, time: 0.45 }
            ];
            notes.forEach(note => {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.frequency.setValueAtTime(note.freq, actx.currentTime + note.time);
                gain.gain.setValueAtTime(0.3, actx.currentTime + note.time);
                gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + note.time + 0.15);
                osc.start(actx.currentTime + note.time);
                osc.stop(actx.currentTime + note.time + 0.15);
            });
        } catch (e) {
            console.warn('Fanfare failed:', e);
        }
    }

    function initConfetti() {
        confettiParticles = [];
        for (let i = 0; i < 75; i++) {
            confettiParticles.push({
                x: Math.random() * getCanvasWidth(),
                y: -20,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                life: 1.0,
                spin: Math.random() * 20,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }
    }

    function updateConfetti(deltaTime) {
        confettiParticles.forEach(p => {
            p.y += p.vy;
            p.x += p.vx;
            p.vy += 0.2;
            p.spin += 10;
            p.life -= deltaTime / 3.5;
        });
        confettiParticles = confettiParticles.filter(p => p.life > 0);
    }

    function drawConfetti() {
        const c = getCtx();
        if (!c) return;
        confettiParticles.forEach(p => {
            c.save();
            c.globalAlpha = Math.max(0, p.life);
            c.translate(p.x, p.y);
            c.rotate((p.spin * Math.PI) / 180);
            c.fillStyle = p.color;
            c.fillRect(-5, -5, 10, 10);
            c.restore();
        });
    }

    function render(deltaTime) {
        deltaTime = deltaTime || 0.016;
        if (testState === 'answering') {
            drawAnswering();
        } else if (testState === 'success') {
            updateConfetti(deltaTime);
            drawSuccess();
            if ((Date.now() - successStartTime) / 1000 > 3) {
                exitTestMode();
            }
        }
    }

    function handleClick(x, y) {
        if (testState !== 'answering') return;

        for (const rect of hitRects) {
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                if (rect.name === 'letter') {
                    currentAnswer = rect.letter;
                    checkAnswer(); // Immediate check on click
                }
                return;
            }
        }
    }

    function checkAnswer() {
        const correct = cachedOptions[currentWordIdx].correct;
        if (currentAnswer === correct) {
            // Correct — reveal the word and play ding
            revealedIndices.add(hiddenIndices[currentWordIdx]);
            playDing();

            currentWordIdx++;
            currentAnswer = null;

            if (currentWordIdx >= hiddenWordCount) {
                // All words done — success!
                showSuccess();
            }
            // Otherwise render next word (options already cached)
        } else {
            // Wrong — reset answer
            currentAnswer = null;
        }
    }

    function showSuccess() {
        testState = 'success';
        successStartTime = Date.now();
        playFanfare();
        initConfetti();

        if (typeof VersOfTheDayManager !== 'undefined') {
            VersOfTheDayManager.earnBonus();
        }
        console.log('VOTD Test completed successfully!');
    }

    function exitTestMode() {
        gameMode = 'game';
        votdMode = null;
        currentVerse = null;
        testState = 'answering';
    }

    window.VotdTestMode = {
        start: start,
        render: render,
        handleClick: handleClick,
        exitTestMode: exitTestMode
    };
})();
