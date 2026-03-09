class InputHandler3D extends InputHandler {
    constructor(canvas, constants) {
        super(canvas, constants);
        this.viewMode = '3d';
    }
}

window.InputHandler3D = InputHandler3D;
