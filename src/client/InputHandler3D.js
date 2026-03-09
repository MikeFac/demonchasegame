class InputHandler3D extends InputHandler {
    constructor(canvas, constants) {
        super(canvas, constants);
        this.viewMode = '3d';
        this.forwardPressed = false;
        this.turnQueue = 0;
        this.fireQueue = 0;
        this.turnStep = Math.PI / 6;
        this.controls = null;

        this._handleKeyDown3D = this._handleKeyDown3D.bind(this);
        this._handleKeyUp3D = this._handleKeyUp3D.bind(this);

        window.addEventListener('keydown', this._handleKeyDown3D);
        window.addEventListener('keyup', this._handleKeyUp3D);
    }

    getMovementIntent() {
        return {
            forward: this.forwardPressed,
            turnSteps: this._consumeTurnQueue(),
            fire: this._consumeFireQueue()
        };
    }

    stopForwardMovement() {
        this.forwardPressed = false;
    }

    clearTarget() {
        super.clearTarget();
        this.forwardPressed = false;
    }

    destroy() {
        super.destroy();
        window.removeEventListener('keydown', this._handleKeyDown3D);
        window.removeEventListener('keyup', this._handleKeyUp3D);
    }

    _handlePlayableAreaClick(clickedX, clickedY, qualityLineHeight, buttonHeight, answerSectionHeight) {
        const controls = this._getControlRects();

        if (this._pointInRect(clickedX, clickedY, controls.left)) {
            this.clearTarget();
            this._queueTurn(-1);
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.right)) {
            this.clearTarget();
            this._queueTurn(1);
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.forward)) {
            this.forwardPressed = true;
            return;
        }
        if (this._pointInRect(clickedX, clickedY, controls.stop)) {
            this.clearTarget();
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
        for (const touch of Array.from(event.changedTouches)) {
            const point = this._getCanvasPoint(touch.clientX, touch.clientY);
            const controls = this._getControlRects();
            if (this._pointInRect(point.x, point.y, controls.left)) {
                this.clearTarget();
                this._queueTurn(-1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.right)) {
                this.clearTarget();
                this._queueTurn(1);
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.forward)) {
                this.forwardPressed = true;
                continue;
            }
            if (this._pointInRect(point.x, point.y, controls.stop)) {
                this.clearTarget();
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
        // Forward movement is toggle-based in 3D mode, so drag motion should not cancel it.
    }

    _handleTouchEnd(event) {
        if (event) event.preventDefault();
        // Forward movement is toggle-based in 3D mode, so touch release should not cancel it.
    }

    _handleKeyDown3D(event) {
        if (typeof gameMode !== 'undefined' && (gameMode === 'review' || gameMode === 'votd' || gameMode === 'overland')) {
            return;
        }
        if (event.repeat) return;
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            this.clearTarget();
            this._queueTurn(-1);
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            this.clearTarget();
            this._queueTurn(1);
        } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
            this.forwardPressed = true;
        } else if (event.code === 'ArrowDown' || event.code === 'KeyS' || event.code === 'Space') {
            this.clearTarget();
        } else if (event.code === 'Enter' || event.code === 'KeyF') {
            this._queueFire();
        }
    }

    _handleKeyUp3D(event) {
        // Forward movement is toggle-based in 3D mode, so key release does not cancel it.
    }

    _queueTurn(direction) {
        this.turnQueue += direction;
    }

    _consumeTurnQueue() {
        const steps = this.turnQueue;
        this.turnQueue = 0;
        return steps;
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
