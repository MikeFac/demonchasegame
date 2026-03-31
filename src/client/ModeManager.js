(function () {
    'use strict';

    var _modes = {};
    var _currentModeId = null;
    var _currentMode = null;
    var _paused = false;

    function _applyLegacyMode(modeDefinition, context) {
        if (typeof window === 'undefined' || !modeDefinition) return;
        var legacyGameMode = modeDefinition.legacyGameMode;
        if (typeof modeDefinition.getLegacyGameMode === 'function') {
            legacyGameMode = modeDefinition.getLegacyGameMode(context);
        }
        if (legacyGameMode) {
            window.gameMode = legacyGameMode;
        }
    }

    function register(modeDefinition) {
        if (!modeDefinition || !modeDefinition.id) {
            throw new Error('ModeManager.register requires a modeDefinition with an id');
        }
        _modes[modeDefinition.id] = modeDefinition;
        return modeDefinition;
    }

    async function start(modeId, context) {
        var nextMode = _modes[modeId];
        if (!nextMode) {
            throw new Error('ModeManager.start unknown mode: ' + modeId);
        }

        if (typeof nextMode.canStart === 'function' && nextMode.canStart(context) === false) {
            return false;
        }

        if (_currentMode && _currentMode !== nextMode && typeof _currentMode.stop === 'function') {
            await _currentMode.stop('mode-transition');
        }

        _currentModeId = modeId;
        _currentMode = nextMode;
        _paused = false;
        _applyLegacyMode(nextMode, context);

        if (typeof nextMode.start === 'function') {
            await nextMode.start(context || {});
        }

        return true;
    }

    async function stopCurrent(reason) {
        if (_currentMode && typeof _currentMode.stop === 'function') {
            await _currentMode.stop(reason || 'manual-stop');
        }
        _currentModeId = null;
        _currentMode = null;
        _paused = false;
    }

    function pauseCurrent() {
        if (_currentMode && typeof _currentMode.pause === 'function') {
            _currentMode.pause();
        }
        _paused = true;
    }

    function resumeCurrent() {
        if (_currentMode && typeof _currentMode.resume === 'function') {
            _currentMode.resume();
        }
        _paused = false;
    }

    function handleResize(dimensions) {
        if (_currentMode && typeof _currentMode.handleResize === 'function') {
            _currentMode.handleResize(dimensions || {});
        }
    }

    function getCurrentModeId() {
        return _currentModeId;
    }

    function getCurrentMode() {
        return _currentMode;
    }

    function adopt(modeId, context) {
        _currentModeId = modeId;
        _currentMode = _modes[modeId] || null;
        _paused = false;
        if (_currentMode) {
            _applyLegacyMode(_currentMode, context);
        }
        return _currentMode;
    }

    window.ModeManager = {
        register: register,
        start: start,
        stopCurrent: stopCurrent,
        pauseCurrent: pauseCurrent,
        resumeCurrent: resumeCurrent,
        handleResize: handleResize,
        getCurrentModeId: getCurrentModeId,
        getCurrentMode: getCurrentMode,
        adopt: adopt
    };
})();
