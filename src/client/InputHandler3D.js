class InputHandler3D extends InputHandler {
    constructor(canvas, constants) {
        super(canvas, constants);
        this.viewMode = constants.viewMode || 'third-person';
        this.cameraProfile = constants.cameraProfile || 'chase';
        this.inputProfile = constants.inputProfile || 'chase';
        this.isDirectional3D = true;
        this.forwardPressed = false;
        this.fireQueue = 0;
        this.turnSpeed = Math.PI * 2 / 3;
        this.pendingTurnRadians = 0;
        this.lastTurnSampleAt = this._now();
        this.keyboardTurnLeft = false;
        this.keyboardTurnRight = false;
        this.keyboardForward = false;
        this.keyboardBackward = false;
        this.mouseTurnDirection = 0;
        this.mouseMoveDirection = 0;
        this.mouseLooking = false;
        this.mouseLookLastX = null;
        this.touchTurnDirections = new Map();
        this.touchMoveDirections = new Map();
        this.touchLookPoints = new Map();
        this.mouseLookSensitivity = 0.006;
        this.touchLookSensitivity = 0.007;
        this.controls = null;

        this._handleKeyDown3D = this._handleKeyDown3D.bind(this);
        this._handleKeyUp3D = this._handleKeyUp3D.bind(this);
        this._handleMouseDown3D = this._handleMouseDown3D.bind(this);
        this._handleMouseMove3D = this._handleMouseMove3D.bind(this);
        this._handleMouseUp3D = this._handleMouseUp3D.bind(this);
        this._handleWindowBlur3D = this._handleWindowBlur3D.bind(this);
        this._handleTouchCancel3D = this._handleTouchCancel3D.bind(this);

        window.addEventListener('keydown', this._handleKeyDown3D);
        window.addEventListener('keyup', this._handleKeyUp3D);
        window.addEventListener('mouseup', this._handleMouseUp3D);
        window.addEventListener('blur', this._handleWindowBlur3D);
        canvas.addEventListener('mousedown', this._handleMouseDown3D);
        canvas.addEventListener('mousemove', this._handleMouseMove3D);
        canvas.addEventListener('touchcancel', this._handleTouchCancel3D, { passive: false });
    }

    getMovementIntent() {
        if (this._isDirectionalInputBlocked()) {
            this.clearDirectionalInput();
            return { forward: 0, turnRadians: 0, turnDirection: 0, fire: 0 };
        }
        return {
            forward: this._getMoveDirection(),
            turnRadians: this._consumeTurnRadians(),
            turnDirection: this._getTurnDirection(),
            fire: this._consumeFireQueue()
        };
    }

    stopForwardMovement() {
        this.forwardPressed = false;
        this.keyboardForward = false;
        this.keyboardBackward = false;
        this.mouseMoveDirection = 0;
        this.touchMoveDirections.clear();
    }

    clearDirectionalInput() {
        this._accumulateHeldTurn();
        this.stopForwardMovement();
        this.keyboardTurnLeft = false;
        this.keyboardTurnRight = false;
        this.mouseTurnDirection = 0;
        this.touchTurnDirections.clear();
        this.mouseLooking = false;
        this.mouseLookLastX = null;
        this.touchLookPoints.clear();
        this.pendingTurnRadians = 0;
        this.fireQueue = 0;
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
        this.canvas.removeEventListener('mousemove', this._handleMouseMove3D);
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
            if (this.inputProfile === 'first-person') return;
            this.forwardPressed = true;
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.stop)) {
            if (this.inputProfile === 'first-person') return;
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
                if (this.inputProfile === 'chase') this._stopAndClearTarget();
                else super.clearTarget();
                this.touchTurnDirections.set(touch.identifier, -1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.right)) {
                if (this.inputProfile === 'chase') this._stopAndClearTarget();
                else super.clearTarget();
                this.touchTurnDirections.set(touch.identifier, 1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.forward)) {
                if (this.inputProfile === 'first-person') this.touchMoveDirections.set(touch.identifier, 1);
                else this.forwardPressed = true;
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.stop)) {
                if (this.inputProfile === 'first-person') this.touchMoveDirections.set(touch.identifier, -1);
                else this._stopAndClearTarget();
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.fire)) {
                this._queueFire();
                continue;
            }
            this._handleGameModeTouch(point.x, point.y, false);
            if (this.inputProfile === 'first-person' && this._isLookZone(point)) {
                this.touchLookPoints.set(touch.identifier, point);
            }
        }
    }

    _handleTouchMove(event) {
        event.preventDefault();
        this._accumulateHeldTurn();
        for (const touch of Array.from(event.changedTouches || [])) {
            const point = this._getCanvasPoint(touch.clientX, touch.clientY);
            const controls = this._getControlRects();
            if (this.touchTurnDirections.has(touch.identifier)) {
                if (this._pointInRect(point.x, point.y, controls.left)) {
                    this.touchTurnDirections.set(touch.identifier, -1);
                } else if (this._pointInRect(point.x, point.y, controls.right)) {
                    this.touchTurnDirections.set(touch.identifier, 1);
                } else {
                    this.touchTurnDirections.delete(touch.identifier);
                }
            }
            if (this.touchMoveDirections.has(touch.identifier)) {
                if (this._pointInRect(point.x, point.y, controls.forward)) {
                    this.touchMoveDirections.set(touch.identifier, 1);
                } else if (this._pointInRect(point.x, point.y, controls.stop)) {
                    this.touchMoveDirections.set(touch.identifier, -1);
                } else {
                    this.touchMoveDirections.delete(touch.identifier);
                }
            }
            const previousLook = this.touchLookPoints.get(touch.identifier);
            if (previousLook) {
                this.pendingTurnRadians += (point.x - previousLook.x) * this.touchLookSensitivity;
                this.touchLookPoints.set(touch.identifier, point);
            }
        }
    }

    _handleTouchEnd(event) {
        if (event) event.preventDefault();
        this._accumulateHeldTurn();
        for (const touch of Array.from(event?.changedTouches || [])) {
            this.touchTurnDirections.delete(touch.identifier);
            this.touchMoveDirections.delete(touch.identifier);
            this.touchLookPoints.delete(touch.identifier);
        }
        // Chase movement remains toggle-based; first-person movement stops on release.
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
            if (this.inputProfile === 'first-person') this.keyboardForward = true;
            else this.forwardPressed = true;
        } else if (event.code === 'ArrowDown' || event.code === 'KeyS' || event.code === 'Space') {
            if (this.inputProfile === 'first-person' && event.code !== 'Space') this.keyboardBackward = true;
            else this._stopAndClearTarget();
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
        } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
            if (this.inputProfile === 'first-person') this.keyboardForward = false;
        } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
            if (this.inputProfile === 'first-person') this.keyboardBackward = false;
        }
        // Chase movement remains toggle-based; first-person movement stops on release.
    }

    _handleMouseDown3D(event) {
        if (event.button !== 0) return;
        const point = this._getCanvasPoint(event.clientX, event.clientY);
        const controls = this._getControlRects();
        const direction = this._pointInRect(point.x, point.y, controls.left)
            ? -1
            : (this._pointInRect(point.x, point.y, controls.right) ? 1 : 0);
        if (!direction && this.inputProfile === 'first-person') {
            if (this._pointInRect(point.x, point.y, controls.forward)) {
                event.preventDefault();
                this.mouseMoveDirection = 1;
                return;
            }
            if (this._pointInRect(point.x, point.y, controls.stop)) {
                event.preventDefault();
                this.mouseMoveDirection = -1;
                return;
            }
            if (this._isLookZone(point)) {
                event.preventDefault();
                this.mouseLooking = true;
                this.mouseLookLastX = point.x;
            }
            return;
        }
        if (!direction) return;

        event.preventDefault();
        this._accumulateHeldTurn();
        this.mouseTurnDirection = direction;
        if (this.inputProfile === 'chase') this._stopAndClearTarget();
        else super.clearTarget();
    }

    _handleMouseMove3D(event) {
        if (!this.mouseLooking || this.inputProfile !== 'first-person') return;
        const point = this._getCanvasPoint(event.clientX, event.clientY);
        if (this.mouseLookLastX !== null) {
            this.pendingTurnRadians += (point.x - this.mouseLookLastX) * this.mouseLookSensitivity;
        }
        this.mouseLookLastX = point.x;
    }

    _handleMouseUp3D() {
        if (this.mouseTurnDirection) this._accumulateHeldTurn();
        this.mouseTurnDirection = 0;
        this.mouseMoveDirection = 0;
        this.mouseLooking = false;
        this.mouseLookLastX = null;
    }

    _handleTouchCancel3D(event) {
        if (event) event.preventDefault();
        this._accumulateHeldTurn();
        this.touchTurnDirections.clear();
        this.touchMoveDirections.clear();
        this.touchLookPoints.clear();
        this.stopForwardMovement();
    }

    _handleWindowBlur3D() {
        this.clearDirectionalInput();
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

    _getMoveDirection() {
        if (this.inputProfile !== 'first-person') return this.forwardPressed ? 1 : 0;
        let direction = 0;
        if (this.keyboardForward) direction += 1;
        if (this.keyboardBackward) direction -= 1;
        direction += this.mouseMoveDirection;
        for (const touchDirection of this.touchMoveDirections.values()) direction += touchDirection;
        return Math.max(-1, Math.min(1, direction));
    }

    _isLookZone(point) {
        const top = this.constants.QUALITY_LINE_HEIGHT + this.constants.BUTTON_HEIGHT;
        const bottom = this.canvas.height - this.constants.ANSWER_SECTION_HEIGHT;
        return point.x >= this.canvas.width * 0.32 && point.y >= top && point.y <= bottom;
    }

    _isDirectionalInputBlocked() {
        if (typeof gameMode !== 'undefined' && gameMode !== 'game') return true;
        if (typeof menuOpen !== 'undefined' && menuOpen) return true;
        if (typeof categoryPickerOpen !== 'undefined' && categoryPickerOpen) return true;
        if (typeof goalsOverlayVisible !== 'undefined' && goalsOverlayVisible) return true;
        if (typeof inventoryOpen !== 'undefined' && inventoryOpen) return true;
        if (typeof window !== 'undefined' && typeof window.isStoryPaused === 'function' && window.isStoryPaused()) return true;
        if (typeof VerseTestScreen !== 'undefined' && VerseTestScreen.isActive()) return true;
        return false;
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
        this.controls = get3DControlLayout(
            this.canvas,
            this.constants.QUALITY_LINE_HEIGHT,
            this.viewMode
        );
        return this.controls;
    }
}

window.InputHandler3D = InputHandler3D;
