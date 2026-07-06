(function () {
    'use strict';

    var canvas, ctx;
    var network = null;
    var lastStorySnapshot = null;
    var _storyLoopRunning = false;
    var _storyAnimFrame = null;
    var npcImages = {};
    var _launchOpts = null;
    var _storyEngine = null;

    var _onEndGame = null;
    var _onLeaveGame = null;
    var _onRestartGame = null;

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
     * Start a story-driven mission.
     * @param {Object} opts
     *   opts.canvas      - game canvas element
     *   opts.ctx         - canvas 2d context
     *   opts.npcImages   - pre-loaded NPC Image objects { id: Image }
     *   opts.mission     - mission object (with storyPhases, npcs, etc.)
     *   opts.onEndGame   - callback when game ends
     *   opts.onLeaveGame - callback when leaving
     *   opts.onRestartGame - callback when restarting
     */
    function startStoryMission(opts) {
        _launchOpts = opts;
        canvas = opts.canvas;
        ctx = opts.ctx;
        npcImages = opts.npcImages || {};
        _onEndGame = opts.onEndGame || function () { window.location.reload(); };
        _onLeaveGame = opts.onLeaveGame || function () { window.location.href = '/'; };
        _onRestartGame = opts.onRestartGame || function () { window.location.reload(); };

        _hideNonGameplayOverlays();
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';
        var menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';

        var mission = opts.mission;

        network = new LocalNetwork();

        network.setCallbacks({
            onStoryPhase: function (snapshot) {
                lastStorySnapshot = snapshot;
                _applyPhaseMusic(snapshot && snapshot.currentPhaseId);
            },
            onObjectCollected: function (data) {
                // re-render handled by snapshot updates
            },
            onStoryEnded: function (data) {
                _setupEndGameClick(data);
            },
            onGameEnded: function (data) {
                _setupEndGameClick(data);
            },
            onGameStateUpdate: function (state) {
                lastStorySnapshot = lastStorySnapshot || {};
                lastStorySnapshot.combatState = state;
            }
        });

        var StoryMissionEngine = window.StoryMissionEngine;
        var engine;
        var emitter = {
            emit: function (event, data) {
                if (network) {
                    network._handleEngineEvent(event, data);
                }
            }
        };

        if (StoryMissionEngine) {
            engine = new StoryMissionEngine(emitter, mission, 'story-' + Date.now());
            _storyEngine = engine;
            engine.start();
        }

        _setupInputHandlers(engine);
        _storyLoopRunning = true;
        _storyLoop();

        window.gameMode = 'story';
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('story', opts);
        }

        _ensureStoryMenu();
        console.log('StoryMissionLauncher: story mission started');
    }

    function stopStoryMission() {
        _storyLoopRunning = false;
        if (_storyAnimFrame) {
            cancelAnimationFrame(_storyAnimFrame);
            _storyAnimFrame = null;
        }
        if (network) {
            network.disconnect();
            network = null;
        }
        _storyEngine = null;
        _removeInputHandlers();
        _removeStoryMenu();
        lastStorySnapshot = null;
        window.gameMode = 'menu';
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('menu');
        }
        console.log('StoryMissionLauncher: story mission stopped');
    }

    function _leaveStoryMission() {
        stopStoryMission();
        if (_onLeaveGame) _onLeaveGame();
    }

    function _restartStoryMission() {
        stopStoryMission();
        if (_onRestartGame) {
            _onRestartGame();
        } else if (_launchOpts) {
            startStoryMission(_launchOpts);
        }
    }

    // ==================== RENDER LOOP ====================

    function _storyLoop() {
        if (!_storyLoopRunning) return;

        if (lastStorySnapshot && window.StoryMissionRenderer) {
            window.StoryMissionRenderer.render(ctx, canvas, lastStorySnapshot, {
                npcImages: npcImages,
                mission: _launchOpts ? _launchOpts.mission : null
            });

            // Check for pending puzzle solved (from DOM overlay input)
            if (window.StoryMissionRenderer._puzzleState && window.StoryMissionRenderer._puzzleState.pendingSolved) {
                window.StoryMissionRenderer._puzzleState.pendingSolved = false;
                if (_storyEngine) {
                    _storyEngine.handleInput('local', 'puzzleSolved');
                }
            }
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading story...', canvas.width / 2, canvas.height / 2);
        }

        _storyAnimFrame = requestAnimationFrame(_storyLoop);
    }

    // ==================== INPUT ====================

    var _clickHandler, _keydownHandler, _mousemoveHandler;

    function _setupInputHandlers(engine) {
        _clickHandler = function (e) {
            if (_handleStoryMenuClick(e)) return;

            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            if (lastStorySnapshot && (lastStorySnapshot.ended)) {
                stopStoryMission();
                if (_onEndGame) _onEndGame();
                return;
            }

            if (window.StoryMissionRenderer && typeof window.StoryMissionRenderer.handleClick === 'function') {
                var action = window.StoryMissionRenderer.handleClick(x, y, lastStorySnapshot, canvas, { mission: _launchOpts ? _launchOpts.mission : null });
                if (action && engine) {
                    if (action.type === 'advanceDialogue') {
                        engine.handleInput('local', 'advanceDialogue');
                    } else if (action.type === 'collectObject') {
                        engine.handleInput('local', 'collectObject', { objectId: action.objectId });
                    } else if (action.type === 'puzzleSolved') {
                        engine.handleInput('local', 'puzzleSolved');
                    } else if (action.type === 'endMission') {
                        engine.handleInput('local', 'endMission');
                    } else if (action.type === 'sermon') {
                        if (window.SermonViewer) {
                            window.SermonViewer.open({ currentReference: action.sermonRef });
                        }
                    }
                }
            }
        };
        _keydownHandler = function (e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (engine && lastStorySnapshot && !lastStorySnapshot.ended) {
                    engine.handleInput('local', 'advanceDialogue');
                }
            }
        };
        _mousemoveHandler = function (e) {
            if (!lastStorySnapshot || lastStorySnapshot.ended) return;
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            if (window.StoryMissionRenderer && typeof window.StoryMissionRenderer.updateHover === 'function') {
                window.StoryMissionRenderer.updateHover(x, y, lastStorySnapshot, canvas, { mission: _launchOpts ? _launchOpts.mission : null });
            }
        };

        canvas.addEventListener('click', _clickHandler);
        document.addEventListener('keydown', _keydownHandler);
        canvas.addEventListener('mousemove', _mousemoveHandler);
    }

    function _removeInputHandlers() {
        if (_clickHandler) canvas.removeEventListener('click', _clickHandler);
        if (_keydownHandler) document.removeEventListener('keydown', _keydownHandler);
        if (_mousemoveHandler) canvas.removeEventListener('mousemove', _mousemoveHandler);
    }

    // ==================== MUSIC ====================

    function _applyPhaseMusic(phaseId) {
        if (!window.MusicManager || !_launchOpts || !_launchOpts.mission) return;

        var musicCfg = _launchOpts.mission.music || {};
        var tracks = musicCfg.phaseTracks || {};
        var phaseUrl = tracks[phaseId];

        MusicManager.stop();
        if (phaseUrl) {
            MusicManager.playTrackUrl(phaseUrl, false, { loop: true, playbackType: 'track' });
        } else {
            MusicManager.playTrack(musicCfg.fallbackTrackIndex || 0);
        }
    }

    // ==================== END GAME ====================

    function _setupEndGameClick(data) {
        // end-game click is handled in the click handler above by checking snapshot.ended
    }

    // ==================== MENU ====================

    var _storyMenuOpen = false;

    function _ensureStoryMenu() {
        _removeStoryMenu();

        var menuButton = document.createElement('button');
        menuButton.id = 'storyMenuButton';
        menuButton.type = 'button';
        menuButton.textContent = 'Menu';
        menuButton.style.cssText = 'position:fixed;top:8px;right:10px;z-index:130;padding:8px 14px;border:2px solid rgba(255,255,255,0.7);border-radius:8px;background:rgba(12,16,28,0.88);color:#fff;font-weight:bold;cursor:pointer;';
        menuButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            _storyMenuOpen = !_storyMenuOpen;
            _renderStoryMenuState();
        });

        var menuPanel = document.createElement('div');
        menuPanel.id = 'storyMenuPanel';
        menuPanel.style.cssText = 'display:none;position:fixed;top:52px;right:10px;z-index:131;min-width:220px;background:rgba(12,16,28,0.96);border:2px solid #ffd666;border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,0.45);';
        menuPanel.innerHTML =
            '<button type="button" data-story-menu-item="songs" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Songs</button>' +
            '<button type="button" data-story-menu-item="affinityHelp" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Affinity Help</button>' +
            '<button type="button" data-story-menu-item="restart" style="display:block;width:100%;margin:0 0 8px 0;padding:10px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Restart Mission</button>' +
            '<button type="button" data-story-menu-item="leave" style="display:block;width:100%;padding:10px 12px;background:rgba(255,68,68,0.2);border:1px solid rgba(255,100,100,0.45);border-radius:8px;color:#fff;text-align:left;cursor:pointer;">Leave Mission</button>';

        menuPanel.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('[data-story-menu-item]') : null;
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            _handleStoryMenuAction(button.getAttribute('data-story-menu-item'));
        });

        document.body.appendChild(menuButton);
        document.body.appendChild(menuPanel);
        document.addEventListener('mousedown', _handleStoryMenuOutsideClick, true);
        document.addEventListener('touchstart', _handleStoryMenuOutsideClick, true);
    }

    function _removeStoryMenu() {
        var menuButton = document.getElementById('storyMenuButton');
        var menuPanel = document.getElementById('storyMenuPanel');
        if (menuButton) menuButton.remove();
        if (menuPanel) menuPanel.remove();
        document.removeEventListener('mousedown', _handleStoryMenuOutsideClick, true);
        document.removeEventListener('touchstart', _handleStoryMenuOutsideClick, true);
    }

    function _renderStoryMenuState() {
        var menuPanel = document.getElementById('storyMenuPanel');
        if (menuPanel) {
            menuPanel.style.display = _storyMenuOpen ? 'block' : 'none';
        }
    }

    function _handleStoryMenuOutsideClick(event) {
        if (!_storyMenuOpen) return;
        var menuPanel = document.getElementById('storyMenuPanel');
        var menuButton = document.getElementById('storyMenuButton');
        var target = event.target;
        if ((menuPanel && menuPanel.contains(target)) || (menuButton && menuButton.contains(target))) {
            return;
        }
        _storyMenuOpen = false;
        _renderStoryMenuState();
    }

    function _handleStoryMenuClick(event) {
        if (!_storyMenuOpen) return false;
        var menuPanel = document.getElementById('storyMenuPanel');
        var menuButton = document.getElementById('storyMenuButton');
        var target = event.target;
        if ((menuPanel && menuPanel.contains(target)) || (menuButton && menuButton.contains(target))) {
            return true;
        }
        _storyMenuOpen = false;
        _renderStoryMenuState();
        return false;
    }

    function _handleStoryMenuAction(itemId) {
        _storyMenuOpen = false;
        _renderStoryMenuState();

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
            _restartStoryMission();
            return;
        }
        if (itemId === 'leave') {
            _leaveStoryMission();
        }
    }

    window.StoryMissionLauncher = {
        start: startStoryMission,
        stop: stopStoryMission,
        isRunning: function () { return _storyLoopRunning; }
    };
})();