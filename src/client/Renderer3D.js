class Renderer3D extends Renderer {
    constructor(canvas, ctx, assets) {
        super(canvas, ctx, assets);
        this.viewMode = '3d';
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake = { x: 0, y: 0 }, damageNumbers = [], deathParticles = [], mouseX = null, mouseY = null) {
        // Safe first implementation: keep gameplay presentation identical until the
        // dedicated 3D renderer is built out in later phases.
        super.drawGame(
            gameState,
            player,
            playerCode,
            monsters,
            healingPoints,
            camera,
            uiState,
            inventoryState,
            walls,
            screenShake,
            damageNumbers,
            deathParticles,
            mouseX,
            mouseY
        );
    }
}

window.Renderer3D = Renderer3D;
