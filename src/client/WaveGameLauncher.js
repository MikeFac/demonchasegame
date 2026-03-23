/**
 * WaveGameLauncher — Client-side integration for Wave Assault mode.
 *
 * Manages:
 *  - Starting wave games from mission selection
 *  - Wave renderer setup and game loop
 *  - Input handling (keyboard + touch/mouse for horizontal movement)
 *  - Quiz pause UI integration
 *  - End-game return to overland/menu
 */
(function () {
    'use strict';

    // References set on launch
    var canvas, ctx;
    var waveRenderer = null;
    var network = null;
    var lastWaveState = null;
    var _waveLoopRunning = false;
    var _waveAnimFrame = null;
    var demonImages = {};

    // Input state
    var _keysDown = {};
    var _touchX = null;
    var _isTouching = false;

    // Quiz state
    var _quizPaused = false;
    var _currentQuiz = null;

    // Callbacks to return to menu/overland
    var _onEndGame = null;

    /**
     * Start a wave assault game.
     * @param {Object} opts
     *   opts.canvas      — game canvas element
     *   opts.ctx          — canvas 2d context
     *   opts.demonImages  — pre-loaded demon Image objects { type: Image }
     *   opts.waveConfig   — optional overrides (totalWaves, etc.)
     *   opts.onEndGame    — callback when game ends (return to menu)
     *   opts.mission      — mission object (for progress tracking)
     */
    function startWaveGame(opts) {
        canvas = opts.canvas;
        ctx = opts.ctx;
        demonImages = opts.demonImages || {};
        _onEndGame = opts.onEndGame || function () { window.location.reload(); };

        // Ensure canvas is visible
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';
        var menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';

        // Create renderer
        waveRenderer = new WaveRenderer(canvas, ctx, demonImages);

        // Create network (LocalNetwork for offline wave game)
        network = new LocalNetwork();
        network.setCallbacks({
            onWaveGameState: function (state) {
                lastWaveState = state;
            },
            onWaveStarted: function (data) {
                console.log('Wave ' + data.wave + ' started: ' + data.waveName);
                waveRenderer.addFlashMessage('Wave ' + data.wave + ': ' + data.waveName, '#ffdd00', 2500);
            },
            onWaveCleared: function (data) {
                console.log('Wave ' + data.wave + ' cleared! Score: ' + data.score);
            },
            onBulletHit: function (data) {
                if (lastWaveState) {
                    waveRenderer.addExplosion(data.x, data.y, '#ff8800');
                }
            },
            onMonsterKilled: function (data) {
                waveRenderer.addExplosion(data.x, data.y, data.isBoss ? '#ffdd00' : '#ff4400');
                waveRenderer.triggerShake(data.isBoss ? 8 : 3, data.isBoss ? 15 : 8);
                if (data.isBoss) {
                    waveRenderer.addFlashMessage(data.bossLabel + ' DEFEATED!', '#ffdd00', 3000);
                }
            },
            onPlayerHit: function (data) {
                waveRenderer.triggerShake(6, 12);
                waveRenderer.addFlashMessage('-' + data.damage + ' HP!', '#ff4444', 1500);
            },
            onQuizPause: function (data) {
                _quizPaused = true;
                waveRenderer.drawQuizPause(data);
                _triggerQuizUI();
            },
            onQuizBonus: function (data) {
                if (data.type === 'correct') {
                    waveRenderer.addFlashMessage('+15 HP  +250 Score!', '#44ff44', 2500);
                } else {
                    waveRenderer.addFlashMessage('Wrong! Demons speed up!', '#ff4444', 2500);
                    waveRenderer.triggerShake(4, 8);
                }
            },
            onGameEnded: function (data) {
                console.log('Wave game ended:', data.result);
                // Let the renderer show victory/defeat screen —
                // handle click to return to menu
                _setupEndGameClick(data);
            },
            onArmorAbsorb: function (data) {
                waveRenderer.addFlashMessage('ARMOR!', '#8888ff', 1500);
            }
        });

        // Start wave engine
        network.sendStartWaveGame(opts.waveConfig || {});

        // Set up input handlers
        _setupInputHandlers();

        // Start render loop
        _waveLoopRunning = true;
        _waveLoop();

        // Set game mode
        window.gameMode = 'waveGame';
        console.log('WaveGameLauncher: Wave game started');
    }

    /**
     * Stop and clean up the wave game.
     */
    function stopWaveGame() {
        _waveLoopRunning = false;
        if (_waveAnimFrame) {
            cancelAnimationFrame(_waveAnimFrame);
            _waveAnimFrame = null;
        }
        if (network) {
            network.disconnect();
            network = null;
        }
        _removeInputHandlers();
        lastWaveState = null;
        _quizPaused = false;
        window.gameMode = 'menu';
        console.log('WaveGameLauncher: Wave game stopped');
    }

    // ==================== RENDER LOOP ====================

    function _waveLoop() {
        if (!_waveLoopRunning) return;

        if (lastWaveState && waveRenderer) {
            waveRenderer.render(lastWaveState);

            // If quiz is paused, draw quiz overlay on top
            if (_quizPaused) {
                waveRenderer.drawQuizPause({});
            }
        }

        _waveAnimFrame = requestAnimationFrame(_waveLoop);
    }

    // ==================== INPUT ====================

    var _keydownHandler, _keyupHandler, _mousemoveHandler, _mousedownHandler, _mouseupHandler;
    var _touchstartHandler, _touchmoveHandler, _touchendHandler;

    function _sendPointerPosition(clientX) {
        if (!lastWaveState || !waveRenderer || !network) return;

        var rect = canvas.getBoundingClientRect();
        var canvasX = clientX - rect.left;
        var arenaPos = waveRenderer.canvasToArena(canvasX, 0, lastWaveState.arenaWidth, lastWaveState.arenaHeight);
        network.sendWaveInput('setPosition', { x: arenaPos.x });
    }

    function _setupInputHandlers() {
        // Keyboard
        _keydownHandler = function (e) {
            _keysDown[e.key] = true;
            _updateMovement();

            // Space = fire
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (network) network.sendWaveInput('fire', true);
            }
        };
        _keyupHandler = function (e) {
            delete _keysDown[e.key];
            _updateMovement();

            if (e.key === ' ' || e.key === 'Spacebar') {
                if (network) network.sendWaveInput('fire', false);
            }
        };

        document.addEventListener('keydown', _keydownHandler);
        document.addEventListener('keyup', _keyupHandler);

        // Mouse / touch: move player to x position, fire only while pressed
        _mousemoveHandler = function (e) {
            _sendPointerPosition(e.clientX);
        };
        _mousedownHandler = function (e) {
            _isTouching = true;

            // Check end-game button click
            if (lastWaveState && (lastWaveState.waveState === 'victory' || lastWaveState.waveState === 'defeat')) {
                if (waveRenderer && waveRenderer.endButtonRect) {
                    var rect = canvas.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    var btn = waveRenderer.endButtonRect;
                    if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
                        stopWaveGame();
                        if (_onEndGame) _onEndGame();
                        return;
                    }
                }
            }

            _sendPointerPosition(e.clientX);
            if (network) network.sendWaveInput('fire', true);
        };
        _mouseupHandler = function () {
            _isTouching = false;
            if (network) network.sendWaveInput('fire', false);
        };

        canvas.addEventListener('mousemove', _mousemoveHandler);
        canvas.addEventListener('mousedown', _mousedownHandler);
        canvas.addEventListener('mouseup', _mouseupHandler);

        // Touch
        _touchstartHandler = function (e) {
            e.preventDefault();
            _isTouching = true;
            var touch = e.touches[0];
            _sendPointerPosition(touch.clientX);
            if (network) network.sendWaveInput('fire', true);
        };
        _touchmoveHandler = function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            _sendPointerPosition(touch.clientX);
        };
        _touchendHandler = function (e) {
            e.preventDefault();
            _isTouching = false;
            if (network) network.sendWaveInput('fire', false);
        };

        canvas.addEventListener('touchstart', _touchstartHandler, { passive: false });
        canvas.addEventListener('touchmove', _touchmoveHandler, { passive: false });
        canvas.addEventListener('touchend', _touchendHandler, { passive: false });
    }

    function _removeInputHandlers() {
        document.removeEventListener('keydown', _keydownHandler);
        document.removeEventListener('keyup', _keyupHandler);
        if (canvas) {
            canvas.removeEventListener('mousemove', _mousemoveHandler);
            canvas.removeEventListener('mousedown', _mousedownHandler);
            canvas.removeEventListener('mouseup', _mouseupHandler);
            canvas.removeEventListener('touchstart', _touchstartHandler);
            canvas.removeEventListener('touchmove', _touchmoveHandler);
            canvas.removeEventListener('touchend', _touchendHandler);
        }
    }

    function _updateMovement() {
        var left = _keysDown['ArrowLeft'] || _keysDown['a'] || _keysDown['A'];
        var right = _keysDown['ArrowRight'] || _keysDown['d'] || _keysDown['D'];
        if (network) {
            network.sendWaveInput('moveLeft', !!left);
            network.sendWaveInput('moveRight', !!right);
        }
    }

    // ==================== QUIZ ====================

    function _triggerQuizUI() {
        // Use the existing QuizManager to generate a quiz question
        // For the prototype, we'll create a simple quiz popup overlay
        if (typeof QuizManager !== 'undefined' && QuizManager.pickQualityVerse) {
            QuizManager.pickQualityVerse();
        }

        // Create a DOM overlay for quiz
        var overlay = document.createElement('div');
        overlay.id = 'waveQuizOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,20,0.85);z-index:100;display:flex;align-items:center;justify-content:center;';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #4a90e2;border-radius:15px;padding:25px;max-width:400px;width:90%;color:#fff;text-align:center;';

        panel.innerHTML = '<h2 style="color:#6699ff;margin-bottom:15px;">⚔️ VERSE CHALLENGE ⚔️</h2>' +
            '<p style="font-size:14px;opacity:0.8;margin-bottom:20px;">Answer correctly for +15 HP and +250 Score!</p>' +
            '<p style="font-size:16px;margin-bottom:20px;" id="waveQuizQuestion">Loading verse...</p>' +
            '<div id="waveQuizOptions" style="display:flex;flex-direction:column;gap:10px;"></div>';

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // Generate quiz content
        _generateQuizContent(panel);
    }

    function _generateQuizContent(panel) {
        // Get current verse for quiz
        var vQuality = window.vQuality || 'Faith';
        var verseData = null;

        if (window.organizedVerses && window.organizedVerses[vQuality]) {
            var verses = window.organizedVerses[vQuality];
            verseData = verses[Math.floor(Math.random() * verses.length)];
        }

        if (!verseData) {
            // Fallback: skip quiz
            _answerQuiz(true);
            return;
        }

        var questionEl = panel.querySelector('#waveQuizQuestion');
        var optionsEl = panel.querySelector('#waveQuizOptions');

        // Simple missing word quiz
        var words = verseData.Text.split(' ');
        var targetIdx = Math.floor(Math.random() * Math.max(1, words.length - 2)) + 1;
        var correctWord = words[targetIdx];
        words[targetIdx] = '______';
        questionEl.textContent = '"' + words.join(' ') + '" — ' + verseData.Reference;

        // Generate options
        var options = [correctWord];
        var decoyWords = ['faith', 'love', 'hope', 'grace', 'truth', 'spirit', 'peace', 'mercy', 'power', 'glory'];
        while (options.length < 4) {
            var decoy = decoyWords[Math.floor(Math.random() * decoyWords.length)];
            if (!options.includes(decoy) && decoy !== correctWord.toLowerCase()) {
                options.push(decoy);
            }
        }

        // Shuffle
        for (var i = options.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = options[i];
            options[i] = options[j];
            options[j] = temp;
        }

        for (var oi = 0; oi < options.length; oi++) {
            var btn = document.createElement('button');
            btn.textContent = options[oi];
            btn.style.cssText = 'padding:12px;border:1px solid #4a90e2;background:rgba(74,144,226,0.2);color:#fff;border-radius:8px;cursor:pointer;font-size:15px;transition:background 0.2s;';
            btn.dataset.correct = (options[oi] === correctWord) ? 'true' : 'false';
            btn.addEventListener('click', function () {
                var isCorrect = this.dataset.correct === 'true';
                _answerQuiz(isCorrect);
            });
            btn.addEventListener('mouseenter', function () {
                this.style.background = 'rgba(74,144,226,0.5)';
            });
            btn.addEventListener('mouseleave', function () {
                this.style.background = 'rgba(74,144,226,0.2)';
            });
            optionsEl.appendChild(btn);
        }
    }

    function _answerQuiz(correct) {
        _quizPaused = false;
        var overlay = document.getElementById('waveQuizOverlay');
        if (overlay) overlay.remove();

        if (network) {
            network.sendWaveInput('quizAnswer', { correct: correct });
        }
    }

    function _setupEndGameClick(data) {
        // End game click is handled in mousedown handler
        // We just store the data for the return callback
    }

    // ==================== EXPOSE ====================

    window.WaveGameLauncher = {
        start: startWaveGame,
        stop: stopWaveGame,
        isRunning: function () { return _waveLoopRunning; }
    };
})();
