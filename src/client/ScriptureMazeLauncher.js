(function () {
    'use strict';

    var canvas = null;
    var ctx = null;
    var renderer = null;
    var network = null;
    var lastState = null;
    var loopRunning = false;
    var animFrame = null;
    var demonImages = {};
    var launchOpts = null;
    var keydownHandler = null;
    var keyupHandler = null;
    var mouseDownHandler = null;
    var touchStartHandler = null;
    var ended = false;
    var moveState = { left: false, right: false, up: false, down: false };

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

    function start(opts) {
        launchOpts = opts || {};
        canvas = opts.canvas;
        ctx = opts.ctx;
        demonImages = opts.demonImages || {};
        renderer = new ScriptureMazeRenderer(canvas, ctx, demonImages, {
            playerSpriteUrl: opts.playerSpriteUrl || null
        });
        network = new LocalNetwork();
        ended = false;
        moveState = { left: false, right: false, up: false, down: false };

        _hideNonGameplayOverlays();
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';
        var menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';

        network.setCallbacks({
            onScriptureMazeState: function (state) {
                lastState = state;
            },
            onGameEnded: function () {
                ended = true;
            }
        });

        network.sendStartScriptureMazeGame(opts.mission || {});
        _installHooks();
        _setupInput();
        loopRunning = true;
        _renderLoop();
        window.gameMode = 'scriptureMaze';
        if (window.ModeManager && typeof window.ModeManager.adopt === 'function') {
            window.ModeManager.adopt('scriptureMaze', opts);
        }
    }

    function stop() {
        loopRunning = false;
        if (animFrame) {
            cancelAnimationFrame(animFrame);
            animFrame = null;
        }
        if (network) {
            network.disconnect();
            network = null;
        }
        _removeInput();
        _removeHooks();
        moveState = { left: false, right: false, up: false, down: false };
        lastState = null;
    }

    function isRunning() {
        return !!loopRunning;
    }

    function _renderLoop() {
        if (!loopRunning) return;
        if (lastState && renderer) {
            renderer.render(lastState);
        }
        animFrame = requestAnimationFrame(_renderLoop);
    }

    function _setupInput() {
        keydownHandler = function (e) {
            if (!network) return;
            if (lastState && lastState.prompt) {
                if (e.key >= '1' && e.key <= '4') {
                    network.sendScriptureMazeInput('answerPrompt', { index: parseInt(e.key, 10) - 1 });
                    e.preventDefault();
                    return;
                }
            }
            if (ended && e.key === 'Enter') {
                _finishRun();
                e.preventDefault();
                return;
            }

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') _setMoveKey('left', true);
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') _setMoveKey('right', true);
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') _setMoveKey('up', true);
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') _setMoveKey('down', true);
            if (e.key === 'Escape') {
                _leaveRun();
                e.preventDefault();
            }
        };

        keyupHandler = function (e) {
            if (!network) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') _setMoveKey('left', false);
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') _setMoveKey('right', false);
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') _setMoveKey('up', false);
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') _setMoveKey('down', false);
        };

        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);

        mouseDownHandler = function (e) {
            if (!canvas || !renderer) return;
            var point = _getCanvasPoint(e.clientX, e.clientY);
            _handlePointerAction(point);
            e.preventDefault();
        };

        touchStartHandler = function (e) {
            if (!canvas || !renderer || !e.touches || !e.touches.length) return;
            var touch = e.touches[0];
            var point = _getCanvasPoint(touch.clientX, touch.clientY);
            _handlePointerAction(point);
            e.preventDefault();
        };

        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    }

    function _removeInput() {
        if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
        if (keyupHandler) document.removeEventListener('keyup', keyupHandler);
        if (canvas && mouseDownHandler) canvas.removeEventListener('mousedown', mouseDownHandler);
        if (canvas && touchStartHandler) canvas.removeEventListener('touchstart', touchStartHandler);
        keydownHandler = null;
        keyupHandler = null;
        mouseDownHandler = null;
        touchStartHandler = null;
    }

    function _setMoveKey(key, value) {
        if (!network) return;
        moveState[key] = value;
        network.sendScriptureMazeInput('move', {
            left: moveState.left,
            right: moveState.right,
            up: moveState.up,
            down: moveState.down
        });
    }

    function _getCanvasPoint(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = rect.width ? (canvas.width / rect.width) : 1;
        var scaleY = rect.height ? (canvas.height / rect.height) : 1;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function _handlePointerAction(point) {
        if (!network || !renderer || !lastState) return;
        var action = renderer.getInputActionAtPoint(point.x, point.y, lastState);
        if (!action) return;

        if (action.type === 'answer') {
            network.sendScriptureMazeInput('answerPrompt', { index: action.index });
            return;
        }

        if (action.type === 'finish') {
            _finishRun();
            return;
        }

        if (action.type === 'move') {
            moveState.left = action.direction === 'left';
            moveState.right = action.direction === 'right';
            moveState.up = action.direction === 'up';
            moveState.down = action.direction === 'down';
            network.sendScriptureMazeInput('move', {
                left: moveState.left,
                right: moveState.right,
                up: moveState.up,
                down: moveState.down
            });
            return;
        }

        if (action.type === 'moveTo') {
            moveState = { left: false, right: false, up: false, down: false };
            network.sendScriptureMazeInput('moveTo', {
                col: action.col,
                row: action.row
            });
        }
    }

    function _finishRun() {
        var finalState = lastState;
        stop();
        if (launchOpts && typeof launchOpts.onEndGame === 'function') {
            launchOpts.onEndGame(finalState);
        }
    }

    function _leaveRun() {
        stop();
        if (launchOpts && typeof launchOpts.onLeaveGame === 'function') {
            launchOpts.onLeaveGame();
        }
    }

    function _installHooks() {
        window.render_game_to_text = function () {
            if (!lastState) return JSON.stringify({ mode: 'scriptureMaze', state: 'loading' });
            return JSON.stringify({
                mode: 'scriptureMaze',
                note: 'origin top-left, x right, y down',
                player: lastState.player,
                demons: lastState.demons.filter(function (d) { return d.active; }).map(function (d) {
                    return { x: Math.round(d.x), y: Math.round(d.y), type: d.demonType, behavior: d.behavior };
                }),
                bullets: 0,
                promptNode: lastState.promptNode ? { x: Math.round(lastState.promptNode.x), y: Math.round(lastState.promptNode.y) } : null,
                prompt: lastState.prompt ? {
                    reference: lastState.prompt.reference,
                    label: lastState.prompt.questionLabel,
                    options: lastState.prompt.options,
                    currentIndex: lastState.prompt.currentIndex
                } : null,
                ammo: 0,
                progress: lastState.progress,
                target: lastState.target,
                status: lastState.status,
                message: lastState.message,
                poweredUp: !!lastState.poweredUp,
                powerModeMsLeft: lastState.powerModeMsLeft || 0,
                pathTarget: lastState.pathTarget || null
            });
        };
        window.advanceTime = function (ms) {
            if (network && network.engine && typeof network.engine.advanceTime === 'function') {
                network.engine.advanceTime(ms);
            }
        };
    }

    function _removeHooks() {
        window.render_game_to_text = null;
        window.advanceTime = null;
    }

    window.ScriptureMazeLauncher = {
        start: start,
        stop: stop,
        isRunning: isRunning,
        _debugGetRenderer: function () {
            return renderer;
        },
        _debugGetState: function () {
            return lastState;
        }
    };
})();
