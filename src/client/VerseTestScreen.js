/**
 * VerseTestScreen - Sequential First-Letter Verse Test
 * Tests whether the player can identify the first letter of consecutive words in a verse.
 * Accessed via hamburger menu → "Verse Test"
 */
const VerseTestScreen = (function() {
    // State
    let active = false;
    let verseText = "";
    let reference = "";
    let words = [];
    let startIndex = 0;
    let difficulty = 5;
    let currentStep = 0;
    let letterOptions = [];
    let result = null;       // null=in-progress, true=passed, false=failed
    let resultTimer = 0;
    let onComplete = null;
    let failAudio = null;    // Audio object for verse playback on failure

    // Alphabet pool (A-Z minus Q and X)
    const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUVWYZ'.split('');

    /**
     * Split verse text into words, preserving punctuation attached to words
     */
    function splitWords(text) {
        return text.split(/\s+/).filter(w => w.length > 0);
    }

    /**
     * Get the first letter of a word (uppercase), skipping leading punctuation
     */
    function getFirstLetter(word) {
        for (let i = 0; i < word.length; i++) {
            if (/[a-zA-Z]/.test(word[i])) {
                return word[i].toUpperCase();
            }
        }
        return word[0].toUpperCase();
    }

    /**
     * Generate 6 letter options: 1 correct at random position, 5 distractors
     */
    function generateLetterOptions(correctLetter) {
        const upper = correctLetter.toUpperCase();
        // Build pool excluding correct letter
        const pool = ALPHABET.filter(l => l !== upper);
        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        // Pick 5 distractors
        const distractors = pool.slice(0, 5);
        // Build options array
        const options = distractors.map(l => ({ letter: l, isCorrect: false }));
        // Insert correct at random position
        const insertAt = Math.floor(Math.random() * 7); // 0-6
        options.splice(insertAt, 0, { letter: upper, isCorrect: true });
        // Ensure exactly 6
        return options.slice(0, 6);
    }

    /**
     * Advance to next word or finish with success
     */
    function advanceStep() {
        currentStep++;
        if (currentStep >= difficulty) {
            // Success!
            result = true;
            resultTimer = 2000;
        } else {
            // Generate new options for next word
            const nextWord = words[startIndex + currentStep];
            const correctLetter = getFirstLetter(nextWord);
            letterOptions = generateLetterOptions(correctLetter);
        }
    }

    /**
     * Fail the test — show verse longer and speak it aloud
     */
    function failTest() {
        result = false;
        resultTimer = 999999; // Wait for audio to finish before counting down

        // Play verse audio using ReviewMode's convertRef + audio URL
        try {
            const vdir = ReviewMode.convertRef(reference);
            if (vdir) {
                const base = 'https://spiritualwar.games/otd/mv/www/audio/se/';
                failAudio = new Audio(base + vdir + '.ogg');
                failAudio.type = 'audio/ogg';
                failAudio.volume = 1;
                failAudio.onended = function() {
                    // Audio finished — show verse for 2 more seconds
                    resultTimer = 2000;
                };
                failAudio.onerror = function() {
                    console.error('Failed to load verse audio');
                    resultTimer = 4000; // Fallback: just show verse for 4 seconds
                };
                failAudio.play().catch(function(err) {
                    console.error('Failed to play verse audio:', err);
                    resultTimer = 4000; // Fallback: just show verse for 4 seconds
                });
            } else {
                resultTimer = 4000; // No audio available, show for 4 seconds
            }
        } catch (e) {
            console.error('Error playing verse audio on fail:', e);
            resultTimer = 4000;
        }
    }

    /**
     * Stop any playing fail audio
     */
    function stopFailAudio() {
        if (failAudio) {
            failAudio.pause();
            failAudio.currentTime = 0;
            failAudio = null;
        }
    }

    /**
     * Word-wrap text into lines that fit within maxWidth using the given ctx
     */
    function wrapText(ctx, wordsArr, startIdx, maxWidth, font) {
        ctx.font = font;
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < wordsArr.length; i++) {
            const word = wordsArr[i];
            let displayWord;

            if (i < startIdx) {
                displayWord = word;
            } else if (i < startIdx + currentStep) {
                displayWord = word;
            } else if (i === startIdx + currentStep) {
                displayWord = '_'.repeat(Math.max(word.length, 3));
            } else if (i < startIdx + difficulty) {
                displayWord = '_'.repeat(Math.max(word.length, 3));
            } else {
                displayWord = word;
            }

            const testLine = currentLine ? currentLine + ' ' + displayWord : displayWord;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push({ text: currentLine, wordIndices: [] });
                currentLine = displayWord;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push({ text: currentLine, wordIndices: [] });
        }
        return lines;
    }

    // Public API
    return {
        /**
         * Start a verse test session
         * @param {string} vText - The full verse text
         * @param {string} ref - The verse reference (e.g., "1 John 3:1-3")
         * @param {number} diff - Number of letters to test
         * @param {function} callback - Called with boolean result on completion
         */
        startTest(vText, ref, diff, callback) {
            verseText = vText;
            reference = ref;
            words = splitWords(vText);

            // Adjust difficulty to fit verse
            difficulty = Math.min(diff, words.length);
            if (difficulty < 3) difficulty = Math.min(3, words.length);

            // Pick random starting point
            const maxStart = Math.max(0, words.length - difficulty);
            startIndex = Math.floor(Math.random() * (maxStart + 1));

            currentStep = 0;
            result = null;
            resultTimer = 0;
            onComplete = callback || null;
            active = true;

            // Generate initial letter options
            const firstWord = words[startIndex];
            const correctLetter = getFirstLetter(firstWord);
            letterOptions = generateLetterOptions(correctLetter);
        },

        /**
         * Returns whether the test screen is currently active
         */
        isActive() {
            return active;
        },

        /**
         * Update timer (called each frame)
         * @param {number} dt - Delta time in ms
         */
        update(dt) {
            if (!active) return;
            if (result !== null) {
                resultTimer -= dt;
                if (resultTimer <= 0) {
                    stopFailAudio();
                    active = false;
                    if (onComplete) onComplete(result);
                }
            }
        },

        /**
         * Handle a click/tap
         * @param {number} x - Click x in canvas coords
         * @param {number} y - Click y in canvas coords
         * @param {number} canvasWidth
         * @param {number} canvasHeight
         * @returns {boolean} true if click was consumed
         */
        handleClick(x, y, canvasWidth, canvasHeight) {
            if (!active) return false;

            // If showing result, tap to dismiss early
            if (result !== null) {
                stopFailAudio();
                resultTimer = 0;
                return true;
            }

            // Check letter button clicks
            // Layout: 2 rows x 3 columns
            const btnW = 110;
            const btnH = 45;
            const btnGapX = 12;
            const btnGapY = 10;
            const totalW = 3 * btnW + 2 * btnGapX;
            const startX = (canvasWidth - totalW) / 2;
            const startY = canvasHeight - 140;

            for (let i = 0; i < letterOptions.length; i++) {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const bx = startX + col * (btnW + btnGapX);
                const by = startY + row * (btnH + btnGapY);

                if (x >= bx && x <= bx + btnW && y >= by && y <= by + btnH) {
                    const option = letterOptions[i];
                    if (option.isCorrect) {
                        advanceStep();
                    } else {
                        failTest();
                    }
                    return true;
                }
            }

            // Click consumed (don't pass through to game)
            return true;
        },

        /**
         * Render the full overlay
         * @param {CanvasRenderingContext2D} ctx
         * @param {number} canvasWidth
         * @param {number} canvasHeight
         */
        render(ctx, canvasWidth, canvasHeight) {
            if (!active) return;

            // Full-screen dark overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Result screen
            if (result !== null) {
                this.renderResult(ctx, canvasWidth, canvasHeight);
                return;
            }

            // Header: reference
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(reference, canvasWidth / 2, 35);

            // Verse area (y: 55 to ~320)
            const verseAreaTop = 55;
            const verseAreaMaxWidth = canvasWidth - 30;
            const lineHeight = 22;
            const font = '14px Arial';
            ctx.font = font;
            ctx.textAlign = 'left';

            // Render words with color-coding, word-wrapped
            let curX = 15;
            let curY = verseAreaTop;

            for (let i = 0; i < words.length; i++) {
                let displayWord;
                let color;

                if (i < startIndex) {
                    // Before test zone: normal white
                    displayWord = words[i];
                    color = '#cccccc';
                } else if (i < startIndex + currentStep) {
                    // Already answered: green
                    displayWord = words[i];
                    color = '#44ff44';
                } else if (i === startIndex + currentStep) {
                    // Current word: yellow underscores
                    displayWord = '_'.repeat(Math.max(words[i].length, 3));
                    color = '#ffdd00';
                } else if (i < startIndex + difficulty) {
                    // Upcoming test words: gray underscores
                    displayWord = '_'.repeat(Math.max(words[i].length, 3));
                    color = '#666666';
                } else {
                    // After test zone: normal white
                    displayWord = words[i];
                    color = '#cccccc';
                }

                const wordWidth = ctx.measureText(displayWord + ' ').width;

                // Wrap to next line if needed
                if (curX + wordWidth > verseAreaMaxWidth + 15 && curX > 15) {
                    curX = 15;
                    curY += lineHeight;
                }

                ctx.fillStyle = color;
                if (i === startIndex + currentStep) {
                    ctx.font = 'bold 14px Arial';
                } else {
                    ctx.font = font;
                }
                ctx.fillText(displayWord, curX, curY);
                ctx.font = font;
                curX += wordWidth;
            }

            // Progress bar (y: dynamic, below verse area)
            const progressY = Math.max(curY + 30, 340);
            const barX = 30;
            const barW = canvasWidth - 60;
            const barH = 10;

            // Background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(barX, progressY, barW, barH);

            // Fill
            const progress = currentStep / difficulty;
            ctx.fillStyle = '#44ff44';
            ctx.fillRect(barX, progressY, barW * progress, barH);

            // Border
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, progressY, barW, barH);

            // Progress text
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(currentStep + ' / ' + difficulty, canvasWidth / 2, progressY + barH + 15);

            // Letter buttons (2 rows x 3 columns)
            const btnW = 110;
            const btnH = 45;
            const btnGapX = 12;
            const btnGapY = 10;
            const totalBtnW = 3 * btnW + 2 * btnGapX;
            const startBtnX = (canvasWidth - totalBtnW) / 2;
            const startBtnY = canvasHeight - 140;

            for (let i = 0; i < letterOptions.length; i++) {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const bx = startBtnX + col * (btnW + btnGapX);
                const by = startBtnY + row * (btnH + btnGapY);

                // Button background
                ctx.fillStyle = '#1a5276';
                ctx.fillRect(bx, by, btnW, btnH);

                // Button border
                ctx.strokeStyle = '#5dade2';
                ctx.lineWidth = 2;
                ctx.strokeRect(bx, by, btnW, btnH);

                // Letter text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(letterOptions[i].letter, bx + btnW / 2, by + btnH / 2);
            }

            // Reset text alignment
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        },

        /**
         * Render the result screen (correct/wrong)
         */
        renderResult(ctx, canvasWidth, canvasHeight) {
            if (result === true) {
                // Green "Correct!"
                ctx.fillStyle = '#44ff44';
                ctx.font = 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(t('verseTest.correct'), canvasWidth / 2, canvasHeight / 2 - 40);
            } else {
                // Red "Wrong!"
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(t('verseTest.wrong'), canvasWidth / 2, canvasHeight / 2 - 40);
            }

            // Show the full verse
            ctx.fillStyle = '#cccccc';
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';

            // Word-wrap the verse for result display
            const maxLineWidth = canvasWidth - 40;
            const resultWords = verseText.split(/\s+/);
            let line = '';
            let lineY = canvasHeight / 2 + 10;
            const lineH = 18;

            for (let i = 0; i < resultWords.length; i++) {
                const testLine = line ? line + ' ' + resultWords[i] : resultWords[i];
                if (ctx.measureText(testLine).width > maxLineWidth && line) {
                    ctx.fillText(line, canvasWidth / 2, lineY);
                    line = resultWords[i];
                    lineY += lineH;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                ctx.fillText(line, canvasWidth / 2, lineY);
                lineY += lineH;
            }

            // Reference
            ctx.fillStyle = '#ffdd00';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(reference, canvasWidth / 2, lineY + 10);

            // Tap to dismiss hint
            ctx.fillStyle = '#888888';
            ctx.font = '11px Arial';
            ctx.fillText(t('ui.tapToContinue'), canvasWidth / 2, canvasHeight - 30);

            ctx.textAlign = 'left';
        }
    };
})();

window.VerseTestScreen = VerseTestScreen;
