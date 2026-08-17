class InputHandler3D extends InputHandler {
    constructor(canvas, constants) {
        super(canvas, constants);
        this.viewMode = '3d';
        this.forwardPressed = false;
        this.fireQueue = 0;
        this.turnSpeed = Math.PI * 2 / 3;
        this.pendingTurnRadians = 0;
        this.lastTurnSampleAt = this._now();
        this.keyboardTurnLeft = false;
        this.keyboardTurnRight = false;
        this.mouseTurnDirection = 0;
        this.touchTurnDirections = new Map();
        this.controls = null;

        this._handleKeyDown3D = this._handleKeyDown3D.bind(this);
        this._handleKeyUp3D = this._handleKeyUp3D.bind(this);
        this._handleMouseDown3D = this._handleMouseDown3D.bind(this);
        this._handleMouseUp3D = this._handleMouseUp3D.bind(this);
        this._handleWindowBlur3D = this._handleWindowBlur3D.bind(this);
        this._handleTouchCancel3D = this._handleTouchCancel3D.bind(this);

        window.addEventListener('keydown', this._handleKeyDown3D);
        window.addEventListener('keyup', this._handleKeyUp3D);
        window.addEventListener('mouseup', this._handleMouseUp3D);
        window.addEventListener('blur', this._handleWindowBlur3D);
        canvas.addEventListener('mousedown', this._handleMouseDown3D);
        canvas.addEventListener('touchcancel', this._handleTouchCancel3D, { passive: false });
    }

    getMovementIntent() {
        return {
            forward: this.forwardPressed,
            turnRadians: this._consumeTurnRadians(),
            turnDirection: this._getTurnDirection(),
            fire: this._consumeFireQueue()
        };
    }

    stopForwardMovement() {
        this.forwardPressed = false;
    }

    clearTarget() {
        super.clearTarget();
    }

    destroy() {
        super.destroy();
        window.removeEventListener('keydown', this._handleKeyDown3D);
        window.removeEventListener('keyup', this._handleKeyUp3D);
        window.removeEventListener('mouseup', this._handleMouseUp3D);
        window.removeEventListener('blur', this._handleWindowBlur3D);
        this.canvas.removeEventListener('mousedown', this._handleMouseDown3D);
        this.canvas.removeEventListener('touchcancel', this._handleTouchCancel3D);
    }

    _handlePlayableAreaClick(clickedX, clickedY, qualityLineHeight, buttonHeight, answerSectionHeight) {
        const controls = this._getControlRects();

        if (this._pointInRect(clickedX, clickedY, controls.left)) {
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.right)) {
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.forward)) {
            this.forwardPressed = true;
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.stop)) {
            this._stopAndClearTarget();
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.fire)) {
            this._queueFire();
            return;
        }

        // In 3D mode, movement is pad-driven only.
        // Deliberately ignore general playable-area taps so click-to-move never activates.
    }

    _handleTouchStart(event) {
        if (!event.changedTouches || event.changedTouches.length === 0) return;
        event.preventDefault();
        this._accumulateHeldTurn();
        for (const touch of Array.from(event.changedTouches)) {
            const point = this._getCanvasPoint(touch.clientX, touch.clientY);
            const controls = this._getControlRects();
            if (this._pointInRect(point.x, point.y, controls.left)) {
                this._stopAndClearTarget();
                this.touchTurnDirections.set(touch.identifier, -1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.right)) {
                this._stopAndClearTarget();
                this.touchTurnDirections.set(touch.identifier, 1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.forward)) {
                this.forwardPressed = true;
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.stop)) {
                this._stopAndClearTarget();
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.fire)) {
                this._queueFire();
                continue;
            }
            this._handleGameModeTouch(point.x, point.y, false);
        }
    }

    _handleTouchMove(event) {
        event.preventDefault();
        this._accumulateHeldTurn();
        for (const touch of Array.from(event.changedTouches || [])) {
            if (!this.touchTurnDirections.has(touch.identifier)) continue;
            const point = this._getCanvasPoint(touch.clientX, touch.clientY);
            const controls = this._getControlRects();
            if (this._pointInRect(point.x, point.y, controls.left)) {
                this.touchTurnDirections.set(touch.identifier, -1);
            } else if (this._pointInRect(point.x, point.y, controls.right)) {
                this.touchTurnDirections.set(touch.identifier, 1);
            } else {
                this.touchTurnDirections.delete(touch.identifier);
            }
        }
    }

    _handleTouchEnd(event) {
        if (event) event.preventDefault();
        this._accumulateHeldTurn();
        for (const touch of Array.from(event?.changedTouches || [])) {
            this.touchTurnDirections.delete(touch.identifier);
        }
        // Forward movement is toggle-based in 3D mode, so touch release does not cancel it.
    }

    _handleKeyDown3D(event) {
        if (typeof gameMode !== 'undefined' && (gameMode === 'review' || gameMode === 'votd' || gameMode === 'overland')) {
            return;
        }
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            if (!this.keyboardTurnLeft) {
                this._accumulateHeldTurn();
                this.keyboardTurnLeft = true;
                this._stopAndClearTarget();
            }
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            if (!this.keyboardTurnRight) {
                this._accumulateHeldTurn();
                this.keyboardTurnRight = true;
                this._stopAndClearTarget();
            }
        } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
            this.forwardPressed = true;
        } else if (event.code === 'ArrowDown' || event.code === 'KeyS' || event.code === 'Space') {
            this._stopAndClearTarget();
        } else if (!event.repeat && (event.code === 'Enter' || event.code === 'KeyF')) {
            this._queueFire();
        }
    }

    _handleKeyUp3D(event) {
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            this._accumulateHeldTurn();
            this.keyboardTurnLeft = false;
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            this._accumulateHeldTurn();
            this.keyboardTurnRight = false;
        }
        // Forward movement is toggle-based in 3D mode, so key release does not cancel it.
    }

    _handleMouseDown3D(event) {
        if (event.button !== 0) return;
        const point = this._getCanvasPoint(event.clientX, event.clientY);
        const controls = this._getControlRects();
        const direction = this._pointInRect(point.x, point.y, controls.left)
            ? -1
            : (this._pointInRect(point.x, point.y, controls.right) ? 1 : 0);
        if (!direction) return;

        event.preventDefault();
        this._accumulateHeldTurn();
        this.mouseTurnDirection = direction;
        this._stopAndClearTarget();
    }

    _handleMouseUp3D() {
        if (!this.mouseTurnDirection) return;
        this._accumulateHeldTurn();
        this.mouseTurnDirection = 0;
    }

    _handleTouchCancel3D(event) {
        if (event) event.preventDefault();
        this._accumulateHeldTurn();
        this.touchTurnDirections.clear();
    }

    _handleWindowBlur3D() {
        this._accumulateHeldTurn();
        this.keyboardTurnLeft = false;
        this.keyboardTurnRight = false;
        this.mouseTurnDirection = 0;
        this.touchTurnDirections.clear();
    }

    _getTurnDirection() {
        let direction = 0;
        if (this.keyboardTurnLeft) direction -= 1;
        if (this.keyboardTurnRight) direction += 1;
        direction += this.mouseTurnDirection;
        for (const touchDirection of this.touchTurnDirections.values()) {
            direction += touchDirection;
        }
        return Math.max(-1, Math.min(1, direction));
    }

    _accumulateHeldTurn(now = this._now()) {
        const elapsedSeconds = Math.min(0.05, Math.max(0, now - this.lastTurnSampleAt) / 1000);
        this.pendingTurnRadians += this._getTurnDirection() * this.turnSpeed * elapsedSeconds;
        this.lastTurnSampleAt = now;
    }

    _consumeTurnRadians() {
        this._accumulateHeldTurn();
        const radians = this.pendingTurnRadians;
        this.pendingTurnRadians = 0;
        return radians;
    }

    _now() {
        return typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
    }

    _queueFire() {
        this.fireQueue += 1;
    }

    _consumeFireQueue() {
        const shots = this.fireQueue;
        this.fireQueue = 0;
        return shots;
    }

    _pointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }

    _stopAndClearTarget() {
        super.clearTarget();
        this.forwardPressed = false;
    }

    _getControlRects() {
        const size = Math.min(88, Math.max(64, this.canvas.width * 0.14));
        const gap = 14;
        const bottom = this.canvas.height - size - 22;
        const leftX = 18;
        const rightX = leftX + size + 10;
        const forwardX = this.canvas.width - size - 18;
        const forwardY = bottom - 18;
        const stopX = forwardX;
        const stopY = forwardY - size - 12;
        const fireX = this.canvas.width - size - 18;
        const fireY = this.constants.QUALITY_LINE_HEIGHT + 58;
        this.controls = {
            left: { x: leftX, y: bottom, width: size, height: size },
            right: { x: rightX, y: bottom, width: size, height: size },
            forward: { x: forwardX, y: forwardY, width: size, height: size + gap },
            stop: { x: stopX, y: stopY, width: size, height: size },
            fire: { x: fireX, y: fireY, width: size, height: size }
        };
        return this.controls;
    }
}

window.InputHandler3D = InputHandler3D;
