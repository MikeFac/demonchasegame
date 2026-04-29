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
    var _launchOpts = null;

    var WAVE_QUIZ_QUESTION_COUNT = 1;
    var WAVE_CLOZE_BLANK_COUNT = 2;
    var WAVE_QUIZ_MIN_ANSWER_DELAY_MS = 2000;
    var WAVE_QUIZ_OPTION_COUNT = 6;
    var WAVE_CLICK_SUPPRESSION_MS = 250;
    var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Input state
    var _keysDown = {};
    var _isTouching = false;
    var _pointerSuppressedUntil = 0;

    // Quiz state
    var _quizPaused = false;
    var _currentQuiz = null;

    // Callbacks to return to menu/overland
    var _onEndGame = null;
    var _onLeaveGame = null;
    var _onRestartGame = null;

    // Wave menu state
    var _waveMenuOpen = false;

    function _hideNonGameplayOverlays() {
        var splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.classList.remove('fade-out');
            splashScreen.style.display = 'none';
        }

        var quickStartOverlay = document.getElementById('quickStartOverlay');
        if (quickStartOverlay) quickStartOverlay.style.display = 'none';

        var votdModal = document.getElementById('votdModal');
        if (votdModal) votdModal.style.display = 'none';
    }

    /**
     * Start a wave assault game.
     * @param {Object} opts
     *   opts.canvas      — game canvas element
     *   opts.ctx         — canvas 2d context
     *   opts.demonImages — pre-loaded demon Image objects { type: Image }
     *   opts.waveConfig  — optional overrides (totalWaves, etc.)
     *   opts.onEndGame   — callback when game ends (return to menu)
     *   opts.mission     — mission object (for progress tracking)
     */
    function startWaveGame(opts) {
        _launchOpts = opts;
        canvas = opts.canvas;
        ctx = opts.ctx;
        demonImages = opts.demonImages || {};
        _onEndGame = opts.onEndGame || function () { window.location.reload(); };
        _onLeaveGame = opts.onLeaveGame || function () { window.location.href = '/'; };
        _onRestartGame = opts.onRestartGame || function () { window.location.reload(); };
        _waveMenuOpen = false;

        _hideNonGameplayOverlays();
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';
        var menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';

        waveRenderer = new WaveRenderer(canvas, ctx, demonImages);

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
                    var penaltySeconds = Math.round((data.fireLockoutMs || 0) / 1000) || 15;
                    waveRenderer.addFlashMessage('Wrong! Cannons disabled for ' + penaltySeconds + 's!', '#ff4444', 2800);
                    waveRenderer.triggerShake(4, 8);
                }
            },
            onGameEnded: function (data) {
                console.log('Wave game ended:', data.result);
                _setupEndGameClick(data);
            },
            onArmorAbsorb: function () {
                waveRenderer.addFlashMessage('ARMOR!', '#8888ff', 1500);
            }
        });

        network.sendStartWaveGame(opts.waveConfig || {});
        _setupInputHandlers();
        _ensureWaveMenu();
        _waveLoopRunning = true;
        _waveLoop();

        window.gameMode = 'waveGame';
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('wave', opts);
        }
        console.log('WaveGameLauncher: Wave game started');
    }

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
        _removeQuizOverlay();
        _removeWaveMenu();
        lastWaveState = null;
        _quizPaused = false;
        _waveMenuOpen = false;
        window.gameMode = 'menu';
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('menu');
        }
        console.log('WaveGameLauncher: Wave game stopped');
    }

    function _leaveWaveGame() {
        stopWaveGame();
        if (_onLeaveGame) _onLeaveGame();
    }

    function _restartWaveGame() {
        stopWaveGame();
        if (_onRestartGame) {
            _onRestartGame();
        } else if (_launchOpts) {
            startWaveGame(_launchOpts);
        }
    }

    // ==================== RENDER LOOP ====================

    function _waveLoop() {
        if (!_waveLoopRunning) return;

        if (lastWaveState && waveRenderer) {
            waveRenderer.render(lastWaveState);

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

    function _cancelWaveFireInput() {
        _isTouching = false;
        delete _keysDown[' '];
        delete _keysDown.Spacebar;
        if (network) network.sendWaveInput('fire', false);
    }

    function _setupInputHandlers() {
        _keydownHandler = function (e) {
            if (_quizPaused || _waveMenuOpen) {
                if (e.key === ' ' || e.key === 'Spacebar') e.preventDefault();
                return;
            }

            _keysDown[e.key] = true;
            _updateMovement();

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

        _mousemoveHandler = function (e) {
            if (_waveMenuOpen) return;
            _sendPointerPosition(e.clientX);
        };
        _mousedownHandler = function (e) {
            if (_handleWaveMenuClick(e)) return;
            if (_quizPaused || _waveMenuOpen || Date.now() < _pointerSuppressedUntil) return;
            _isTouching = true;

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

        _touchstartHandler = function (e) {
            e.preventDefault();
            if (_quizPaused || _waveMenuOpen || Date.now() < _pointerSuppressedUntil) return;
            _isTouching = true;
            var touch = e.touches[0];
            _sendPointerPosition(touch.clientX);
            if (network) network.sendWaveInput('fire', true);
        };
        _touchmoveHandler = function (e) {
            e.preventDefault();
            if (!e.touches || !e.touches[0]) return;
            _sendPointerPosition(e.touches[0].clientX);
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
        var left = _keysDown['ArrowLeft'] || _keysDown.a || _keysDown.A;
        var right = _keysDown['ArrowRight'] || _keysDown.d || _keysDown.D;
        if (network) {
            network.sendWaveInput('moveLeft', !!left);
            network.sendWaveInput('moveRight', !!right);
        }
    }

    // ==================== QUIZ ====================

    function _removeQuizOverlay() {
        var overlay = document.getElementById('waveQuizOverlay');
        if (overlay) overlay.remove();
    }

    function _pickWaveQuizQuality() {
        var missionQualities = (window.currentMission && Array.isArray(window.currentMission.qualities))
            ? window.currentMission.qualities
            : [];
        var preferredQuality = window.vQuality || missionQualities[0] || 'Faith';

        if (window.organizedVerses && window.organizedVerses[preferredQuality] && window.organizedVerses[preferredQuality].length > 0) {
            return preferredQuality;
        }

        for (var i = 0; i < missionQualities.length; i++) {
            if (window.organizedVerses && window.organizedVerses[missionQualities[i]] && window.organizedVerses[missionQualities[i]].length > 0) {
                return missionQualities[i];
            }
        }

        var allQualities = window.organizedVerses ? Object.keys(window.organizedVerses) : [];
        for (var qi = 0; qi < allQualities.length; qi++) {
            if (window.organizedVerses[allQualities[qi]] && window.organizedVerses[allQualities[qi]].length > 0) {
                return allQualities[qi];
            }
        }

        return preferredQuality;
    }

    function _getCandidateWords(verseText) {
        var words = String(verseText || '').split(/\s+/);
        var candidates = [];
        for (var i = 0; i < words.length; i++) {
            var clean = words[i].replace(/[^A-Za-z']/g, '');
            if (clean.length >= 4 && /^[A-Za-z]/.test(clean)) {
                candidates.push({
                    index: i,
                    cleanWord: clean
                });
            }
        }
        return candidates;
    }

    function _buildLetterOptions(correctLetter) {
        var options = [correctLetter];
        var used = {};
        used[correctLetter] = true;

        while (options.length < WAVE_QUIZ_OPTION_COUNT) {
            var nextLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            if (!used[nextLetter]) {
                used[nextLetter] = true;
                options.push(nextLetter);
            }
        }

        for (var i = options.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = options[i];
            options[i] = options[j];
            options[j] = temp;
        }
        return options;
    }

    function _buildWaveQuestion(verseData) {
        if (!verseData || !verseData.Text) return null;

        var candidates = _getCandidateWords(verseData.Text);
        if (!candidates.length) return null;

        for (var shuffleIndex = candidates.length - 1; shuffleIndex > 0; shuffleIndex--) {
            var swapIndex = Math.floor(Math.random() * (shuffleIndex + 1));
            var tempCandidate = candidates[shuffleIndex];
            candidates[shuffleIndex] = candidates[swapIndex];
            candidates[swapIndex] = tempCandidate;
        }

        var blankCount = Math.min(WAVE_CLOZE_BLANK_COUNT, candidates.length);
        var selected = candidates.slice(0, blankCount).sort(function (a, b) {
            return a.index - b.index;
        });
        var words = verseData.Text.split(/\s+/);

        selected.forEach(function (picked) {
            var maskedWord = Array(picked.cleanWord.length + 1).join('_');
            words[picked.index] = words[picked.index].replace(picked.cleanWord, maskedWord);
        });

        return {
            verseReference: verseData.Reference || '',
            promptText: selected.length > 1
                ? 'Fill both blanks by choosing the first letter of each missing word.'
                : 'Choose the first letter of the hidden word.',
            questionText: '"' + words.join(' ') + '"',
            answers: selected.map(function (entry) { return entry.cleanWord; }),
            revealedAnswers: [],
            currentAnswerIndex: 0,
            options: _buildLetterOptions(selected[0].cleanWord.charAt(0).toUpperCase())
        };
    }

    function _buildWaveQuizSession() {
        var quality = _pickWaveQuizQuality();
        var verses = (window.organizedVerses && window.organizedVerses[quality]) ? window.organizedVerses[quality].slice() : [];
        if (!verses.length) return null;

        var questions = [];
        while (questions.length < WAVE_QUIZ_QUESTION_COUNT && verses.length > 0) {
            var verseIndex = Math.floor(Math.random() * verses.length);
            var verseData = verses.splice(verseIndex, 1)[0];
            var question = _buildWaveQuestion(verseData);
            if (question) {
                questions.push(question);
            }
        }

        if (!questions.length) return null;

        return {
            currentIndex: 0,
            questions: questions,
            unlockAt: 0
        };
    }

    function _setQuizUnlock(panel) {
        if (!_currentQuiz) return;

        var countdownEl = panel.querySelector('#waveQuizCountdown');
        var buttons = panel.querySelectorAll('#waveQuizOptions button');
        _currentQuiz.unlockAt = Date.now() + WAVE_QUIZ_MIN_ANSWER_DELAY_MS;

        buttons.forEach(function (button) {
            button.disabled = true;
            button.style.opacity = '0.55';
            button.style.cursor = 'not-allowed';
        });

        function tick() {
            if (!_currentQuiz) return;

            var remainingMs = Math.max(0, _currentQuiz.unlockAt - Date.now());
            if (countdownEl) {
                countdownEl.textContent = remainingMs > 0
                    ? 'Answering unlocks in ' + (remainingMs / 1000).toFixed(1) + 's'
                    : 'Answer now';
            }
            if (remainingMs <= 0) {
                buttons.forEach(function (button) {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
                return;
            }
            setTimeout(tick, 100);
        }

        tick();
    }

    function _renderWaveQuizQuestion(panel) {
        if (!_currentQuiz || !_currentQuiz.questions.length) return;

        var question = _currentQuiz.questions[_currentQuiz.currentIndex];
        var progressEl = panel.querySelector('#waveQuizProgress');
        var promptEl = panel.querySelector('#waveQuizPrompt');
        var questionEl = panel.querySelector('#waveQuizQuestion');
        var optionsEl = panel.querySelector('#waveQuizOptions');

        progressEl.textContent = 'Blank ' + (question.currentAnswerIndex + 1) + ' / ' + question.answers.length;
        promptEl.textContent = question.promptText + ' ' + question.verseReference;
        questionEl.textContent = _getWaveQuestionDisplayText(question);
        optionsEl.innerHTML = '';

        question.options.forEach(function (letter) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = letter;
            btn.style.cssText = 'padding:14px;border:1px solid #4a90e2;background:rgba(74,144,226,0.2);color:#fff;border-radius:8px;cursor:pointer;font-size:22px;font-weight:bold;transition:background 0.2s;';
            btn.dataset.correct = (letter === question.answers[question.currentAnswerIndex].charAt(0).toUpperCase()) ? 'true' : 'false';
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (!_currentQuiz || Date.now() < _currentQuiz.unlockAt || btn.disabled) return;

                if (btn.dataset.correct !== 'true') {
                    _answerQuiz(false);
                    return;
                }

                question.revealedAnswers.push(question.answers[question.currentAnswerIndex]);
                question.currentAnswerIndex++;

                if (question.currentAnswerIndex < question.answers.length) {
                    question.options = _buildLetterOptions(question.answers[question.currentAnswerIndex].charAt(0).toUpperCase());
                    _renderWaveQuizQuestion(panel);
                    return;
                }

                if (_currentQuiz.currentIndex >= _currentQuiz.questions.length - 1) {
                    _answerQuiz(true);
                    return;
                }

                _currentQuiz.currentIndex++;
                _renderWaveQuizQuestion(panel);
            });
            btn.addEventListener('mouseenter', function () {
                if (!btn.disabled) btn.style.background = 'rgba(74,144,226,0.5)';
            });
            btn.addEventListener('mouseleave', function () {
                btn.style.background = 'rgba(74,144,226,0.2)';
            });
            optionsEl.appendChild(btn);
        });

        _setQuizUnlock(panel);
    }

    function _getWaveQuestionDisplayText(question) {
        var text = question && question.questionText ? question.questionText : '';
        var parts = text.split(/_+/);
        if (parts.length <= 1) return text;

        var display = parts[0];
        for (var i = 0; i < question.answers.length; i++) {
            display += i < question.revealedAnswers.length ? question.revealedAnswers[i] : '_____';
            if (i + 1 < parts.length) {
                display += parts[i + 1];
            }
        }
        return display;
    }

    function _triggerQuizUI() {
        _cancelWaveFireInput();
        _pointerSuppressedUntil = Date.now() + WAVE_CLICK_SUPPRESSION_MS;
        _currentQuiz = _buildWaveQuizSession();

        if (!_currentQuiz) {
            _answerQuiz(true);
            return;
        }

        _removeQuizOverlay();

        var overlay = document.createElement('div');
        overlay.id = 'waveQuizOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,20,0.85);z-index:100;display:flex;align-items:center;justify-content:center;';
        overlay.addEventListener('click', function (event) {
            if (_currentQuiz && Date.now() < _currentQuiz.unlockAt) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        var panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #4a90e2;border-radius:15px;padding:25px;max-width:420px;width:90%;color:#fff;text-align:center;';
        panel.innerHTML = '<h2 style="color:#6699ff;margin-bottom:15px;">⚔️ VERSE CHALLENGE ⚔️</h2>' +
            '<p style="font-size:14px;opacity:0.8;margin-bottom:8px;">Answer both correctly for +15 HP and +250 Score.</p>' +
            '<p id="waveQuizProgress" style="font-size:13px;color:#a5c8ff;margin:0 0 10px 0;">Blank 1 / ' + _currentQuiz.questions[0].answers.length + '</p>' +
            '<p id="waveQuizCountdown" style="font-size:13px;color:#ffd166;margin:0 0 12px 0;">Answering unlocks in 2.0s</p>' +
            '<p id="waveQuizPrompt" style="font-size:14px;opacity:0.9;margin-bottom:10px;"></p>' +
            '<p id="waveQuizQuestion" style="font-size:16px;margin-bottom:20px;line-height:1.45;">Loading verse...</p>' +
            '<div id="waveQuizOptions" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;"></div>';

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        _renderWaveQuizQuestion(panel);
    }

    function _answerQuiz(correct) {
        _quizPaused = false;
        _pointerSuppressedUntil = Date.now() + WAVE_CLICK_SUPPRESSION_MS;
        _removeQuizOverlay();
        _currentQuiz = null;

        if (network) {
            network.sendWaveInput('quizAnswer', { correct: correct });
        }
    }

    function _setupEndGameClick() {
        // End game click is handled in mousedown handler.
    }

    function _ensureWaveMenu() {
        _removeWaveMenu();

        var menuButton = document.createElement('button');
        menuButton.id = 'waveMenuButton';
        menuButton.type = 'button';
        menuButton.textContent = 'Menu';
        menuButton.style.cssText = 'position:fixed;top:8px;right:10px;z-index:130;padding:8px 14px;border:2px solid rgba(255,255,255,0.7);border-radius:8px;background:rgba(12,16,28,0.88);color:#fff;font-weight:bold;cursor:pointer;';
        menuButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            _waveMenuOpen = !_waveMenuOpen;
            _renderWaveMenuState();
        });

        var menuPanel = document.createElement('div');
        menuPanel.id = 'waveMenuPanel';
        menuPanel.style.cssText = 'display:none;position:fixed;top:52px;right:10px;z-index:131;min-width:220px;background:rgba(12,16,28,0.96);border:2px solid #ffd666;border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,0.45);';
        menuPanel.innerHTML =
            '<button type="button" data-wave-menu-item="songs" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Songs</button>' +
            '<button type="button" data-wave-menu-item="affinityHelp" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Affinity Help</button>' +
            '<button type="button" data-wave-menu-item="restart" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Restart Mission</button>' +
            '<button type="button" data-wave-menu-item="leave" style="display:block;width:100%;padding:10px 12px;background:rgba(255,68,68,0.2);border:1px solid rgba(255,100,100,0.45);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Leave Mission</button>';

        menuPanel.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('[data-wave-menu-item]') : null;
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            _handleWaveMenuAction(button.getAttribute('data-wave-menu-item'));
        });

        document.body.appendChild(menuButton);
        document.body.appendChild(menuPanel);
        document.addEventListener('mousedown', _handleWaveMenuOutsideClick, true);
        document.addEventListener('touchstart', _handleWaveMenuOutsideClick, true);
    }

    function _removeWaveMenu() {
        var menuButton = document.getElementById('waveMenuButton');
        var menuPanel = document.getElementById('waveMenuPanel');
        if (menuButton) menuButton.remove();
        if (menuPanel) menuPanel.remove();
        document.removeEventListener('mousedown', _handleWaveMenuOutsideClick, true);
        document.removeEventListener('touchstart', _handleWaveMenuOutsideClick, true);
    }

    function _renderWaveMenuState() {
        var menuPanel = document.getElementById('waveMenuPanel');
        if (menuPanel) {
            menuPanel.style.display = _waveMenuOpen ? 'block' : 'none';
        }
    }

    function _handleWaveMenuOutsideClick(event) {
        if (!_waveMenuOpen) return;
        var menuPanel = document.getElementById('waveMenuPanel');
        var menuButton = document.getElementById('waveMenuButton');
        var target = event.target;
        if ((menuPanel && menuPanel.contains(target)) || (menuButton && menuButton.contains(target))) {
            return;
        }
        _waveMenuOpen = false;
        _renderWaveMenuState();
    }

    function _handleWaveMenuClick(event) {
        if (!_waveMenuOpen) return false;
        var menuPanel = document.getElementById('waveMenuPanel');
        var menuButton = document.getElementById('waveMenuButton');
        var target = event.target;
        if ((menuPanel && menuPanel.contains(target)) || (menuButton && menuButton.contains(target))) {
            return true;
        }
        _waveMenuOpen = false;
        _renderWaveMenuState();
        return false;
    }

    function _handleWaveMenuAction(itemId) {
        _waveMenuOpen = false;
        _renderWaveMenuState();

        if (itemId === 'songs') {
            if (window.SongLibraryOverlay) {
                window.SongLibraryOverlay.open({ currentReference: null });
            }
            return;
        }

        if (itemId === 'affinityHelp') {
            if (window.AffinityHelpOverlay) {
                window.AffinityHelpOverlay.open();
            }
            return;
        }

        if (itemId === 'restart') {
            _restartWaveGame();
            return;
        }

        if (itemId === 'leave') {
            _leaveWaveGame();
        }
    }

    window.WaveGameLauncher = {
        start: startWaveGame,
        stop: stopWaveGame,
        isRunning: function () { return _waveLoopRunning; }
    };
})();
