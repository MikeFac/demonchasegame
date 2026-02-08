let PRD = false;
let currentTime = Date.now();
let socket;
let playerCode = null;  // code to access player information for the current player

// Declare the canvas variable globally
let canvas;

// World and camera
// World and camera
const { WORLD_WIDTH, WORLD_HEIGHT } = Constants;
// let camera = { x: 0, y: 0 }; // Already there, but let's be precise about replacement
let camera = { x: 0, y: 0 };

let gameState = {
    players: {},
    monsters: [],
    healingPoints: [],
    connectedPlayers: 0,
    gameLevel: 1,
    maxSpawns: 0,
    spawnsLeft: 0,
    terrainTheme: 'stone'
};

// Walls received once via 'walls' event (not in periodic gameState broadcast)
let clientWalls = [];
let clientWallGrid = null;

let isGameLoaded = false;

function drawLoadingScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Loading...', canvas.width / 2 - 50, canvas.height / 2);
}

// Wait for the DOM content to load
document.addEventListener('DOMContentLoaded', function () {
    // Get the canvas element by its ID
    canvas = document.getElementById('gameCanvas');

    // Check if the canvas element exists
    if (canvas) {
        // Get the 2D rendering context
        ctx = canvas.getContext('2d');

        // Rest of your game initialization code...
    } else {
        console.error('Canvas element not found');
    }
});

let player = {
    x: 100,
    y: 100,
    health: 60,
    maxHealth: 100,
    width: 0,
    height: 0,
    xp: 0,
    level: 1,
    healthBar: {}
    // Add other necessary player properties
};

// Game variables
let ctx, monsters, healingPoints, chaseTrigger, lastAttackedMonster;
let playerImg, otherPlayerImg, healingPointImg, demonImages, explosionImg;
let PLAYER_SPEED = 5;
let MONSTER_SPEED = 1; // Slower monster speed

const ATTACK_RATE = 700; // milliseconds (0.5 seconds)
const MAX_HEALING_POINTS = 2; // Maximum number of healing points on the screen
const MIN_HEALING_POINT_DISTANCE = 50; // Minimum distance between healing points and other objects
const COMBAT_DISTANCE = 60; // Distance for combat to happen
const MINIMUM_DISTANCE = 30; // Minimum distance between player and monster
// UI constants from centralized UILayout (loaded via script tag)
const QUALITY_LINE_HEIGHT = UILayout.QUALITY_LINE_HEIGHT;
const BUTTON_WIDTH = UILayout.BUTTON_WIDTH;
const BUTTON_HEIGHT = UILayout.BUTTON_HEIGHT;
const BUTTON_PADDING = UILayout.BUTTON_PADDING;
const ANSWER_SECTION_HEIGHT = UILayout.ANSWER_SECTION_HEIGHT;
const VERSECHANGETIME = 20000;
let mouseX, mouseY; // Variables to store the last known mouse position (legacy, being replaced by InputHandler)
let inputHandler; // InputHandler instance
let lastAttackTime = 0; // Keep track of the last attack time

//Multiplayer - rate of sending stuff to server
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 100; // Update player data every 100 milliseconds (adjust as needed)

let qualityButtons = [];
let updateButtonsTimer = null;
let levelCompleted = false;
let levelAdvanceCountdown = 0;
let levelAdvanceTimer = null;

// If qualities is set to [] then all qualities will be used
// Level config shared between client and server (loaded via script tag)
const levelData = LevelConfig.levelData;

let QUALITIES;
let ALL_QUALITIES;
// gameCategory variable is taken from index.php?category=Whatever

let currentQuiz = null; // Unified quiz object from QuizManager
let answerFullVerse = null;
let isAnswerCorrect = null; // Global variable to store the answer status
let gameOverFlag = false;
let maxSpawns = 0;  //should be updated by server
let spawnsLeft = 10; //should be updated by server
// Get the current script path
const currentScriptPath = document.currentScript.src;
const scriptDirectory = currentScriptPath.substring(0, currentScriptPath.lastIndexOf('/'));

let gameMode = 'game'; // Possible values: 'game', 'review'
let repeatEnabled = false;
let repeatTimeout = null;
let hasPlayed = false;

// Shield of Faith state
let shieldInventory = 0;
let shieldActive = false;
let shieldEndTime = 0;
let shieldImg = null;
let shieldPoints = [];
let inventoryOpen = false;

// Menu state
let menuOpen = false;

// for monster explosion
let explosionTimer = 0;
const EXPLOSION_INTERVAL = 100; // Adjust the interval as needed

const DEMON_TYPES = {
    Fear: `${scriptDirectory}/fear_demon.png`,
    Condemnation: `${scriptDirectory}/condemnation_demon.png`,
    Unbelief: `${scriptDirectory}/unbelief_demon.png`,
    Ignorance: `${scriptDirectory}/ignorance_spirit.png`,
    Depression: `${scriptDirectory}/depression_spirit.png`,
    Strife: `${scriptDirectory}/strife_spirit.png`,
    Confusion: `${scriptDirectory}/confusion_spirit.png`,
    Infirmity: `${scriptDirectory}/infirmity_spirit.png`,
    Doubt: `${scriptDirectory}/doubt_spirit.png`
};

const levelXPRequirements = LevelConfig.levelXPRequirements;

// Audio assets
const attackSound = new Audio(`${scriptDirectory}/attack_sound.mp3`);
const playerHit = new Audio(`${scriptDirectory}/player_hit.mp3`);
const healingRecharge = new Audio(`${scriptDirectory}/healing_recharge.mp3`);
const demonDies = new Audio(`${scriptDirectory}/demon_dies.mp3`);
const gameOver = new Audio(`${scriptDirectory}/game_over.mp3`);

let currentVerseIndex = null; // Index of the currently displayed verse
let verseTimer = null; // Timer for displaying the next verse
let incorrectAnswerReferences = [];
let currentReviewMode = 'quality'; // Possible values: 'incorrect', 'quality'

// Helper function to load an image (if you don't already have this)
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

// to retrieve verses from database in PRD
async function loadVerses() {
    console.log("gameCategory: " + gameCategory);
    try {
        const response = await fetch('get_verses.php?category=' + gameCategory);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();
        console.log('Verses loaded:', data);
        organizedVerses = QuizManager.organizeByCategory2(data); // Assign the retrieved verses to organizedVerses
    } catch (error) {
        console.error('Error loading verses:', error);
        throw new Error('Failed to load verses'); // This will propagate the error
    }
}

function setLevelData(gameState) {
    const numLevels = Object.keys(levelData).length;
    console.log("Number of levels:", numLevels);
    if (numLevels >= gameState.gameLevel) {
        const levelConfig = levelData[gameState.gameLevel];
        QUALITIES = levelConfig.qualities;
        if (QUALITIES.length === 0) {
            QUALITIES = ALL_QUALITIES;
        }
        MAX_MONSTERS = levelConfig.maxMonsters;
        PLAYER_SPEED = levelConfig.playerSpeed;
        MONSTER_SPEED = levelConfig.monsterSpeed;
        MONSTER_SPAWN_RATE = levelConfig.spawnRate;

        // Update gameState
        gameState.maxSpawns = levelConfig.maxMonsters;
        gameState.spawnsLeft = levelConfig.maxMonsters;

        // Emit updated game state to server
        network.sendGameStateUpdate(gameState);
    } else {
        console.log("All levels completed");
        gameOverFlag = true;
    }
}

function startGame(mode, roomId) {
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.style.display = 'none';
    canvas.style.display = 'block';

    init().then(() => {
        if (mode === 'solo') {
            network.sendStartSoloGame();
        } else if (mode === 'join' && roomId) {
            network.sendJoinGame(roomId);
        }
        gameLoop();
    }).catch((error) => {
        console.error('Error initializing game:', error);
    });
}

// Wait for the DOM content to load
document.addEventListener('DOMContentLoaded', function () {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    ctx = canvas.getContext('2d');

    // Parse URL params
    const roomId = urlParams.get('room');
    const mode = urlParams.get('mode');

    if (roomId) {
        // Coming from lobby redirect — skip menu, join game
        startGame('join', roomId);
    } else if (mode === 'solo') {
        // Lobby "Practice (Solo)" shortcut — skip menu
        startGame('solo');
    } else {
        // Show menu, wait for button click
        document.getElementById('btnSolo').addEventListener('click', () => {
            startGame('solo');
        });
        document.getElementById('btnMultiplayer').addEventListener('click', () => {
            window.location.href = '/lobby';
        });
    }
});


async function init() {
    return new Promise(async (resolve) => {
        isGameLoaded = false;

        // Define callbacks first
        const networkCallbacks = {
            onGameStateUpdate: (newGameState) => {
                updateGameState(newGameState);
            },
            onPlayerCode: (code) => {
                if (playerCode === null) {
                    playerCode = code.toString();
                    console.log('Received my player code:', playerCode);
                    player = {
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        health: 60,
                        maxHealth: 100,
                        width: 48,
                        height: 48,
                        xp: 0,
                        level: 1,
                        ammo: 20 // Initial Spirit Ammo
                    };
                    gameState.players[playerCode] = player;
                } else {
                    console.log('New player joined with code:', code);
                }
            },
            onPlayerNumber: (playerNumber) => {
                console.log(`Received player number: ${playerNumber}`);
                // Only 4 player sprites exist, so wrap around
                const spriteNumber = ((playerNumber - 1) % 4) + 1;
                const playerImage = `player${spriteNumber}.png`;
                playerImg = new Image();
                playerImg.src = `${scriptDirectory}/${playerImage}`;
                playerImg.onload = function () {
                    console.log(`Player ${playerNumber} image loaded successfully`);
                    player.width = playerImg.width;
                    player.height = playerImg.height;
                };
                playerImg.onerror = function () {
                    console.error(`Failed to load player ${playerNumber} image`);
                };
            },
            onMonsterKilled: ({ monsterId }) => {
                demonDies.play();
                console.log(`Monster ${monsterId} was killed`);
                // Clear enemy HUD if this was the monster we were tracking
                if (lastAttackedMonster && lastAttackedMonster.id === monsterId) {
                    lastAttackedMonster = null;
                }
            },
            onWalls: (data) => {
                clientWalls = data.walls;
                // Build client-side WallGrid from flat array
                const grid = [];
                for (let r = 0; r < data.rows; r++) {
                    grid[r] = [];
                    for (let c = 0; c < data.cols; c++) {
                        grid[r][c] = data.gridFlat[r * data.cols + c] === 1;
                    }
                }
                clientWallGrid = new WallGrid(grid, data.rows, data.cols, data.cellSize);

                // Move player to spawn point if available
                if (data.spawnX !== undefined && data.spawnY !== undefined) {
                    player.x = data.spawnX;
                    player.y = data.spawnY;
                }
                console.log('Received walls:', clientWalls.length, 'tiles');
            },
            onLevelAdvancing: (data) => {
                console.log('Level advancing! Countdown:', data.countdown);
                levelCompleted = true;
                levelAdvanceCountdown = data.countdown;

                // Clear any existing timer
                if (levelAdvanceTimer) clearInterval(levelAdvanceTimer);

                levelAdvanceTimer = setInterval(() => {
                    levelAdvanceCountdown--;
                    if (levelAdvanceCountdown <= 0) {
                        clearInterval(levelAdvanceTimer);
                        levelAdvanceTimer = null;
                        levelCompleted = false;
                        levelAdvanceCountdown = 0;
                        // Reset monstersKilled so we don't immediately trigger next level
                        gameState.monstersKilled = 0;
                        setLevelData(gameState);
                    }
                }, 1000);
            }
        };

        // Connect to server with callbacks already set
        try {
            await network.connect(networkCallbacks);
            console.log('Connected to game server');
        } catch (error) {
            console.error('Failed to connect:', error);
        }

        // Load other images
        try {
            // Load other player image
            otherPlayerImg = await loadImage(`${scriptDirectory}/otherPlayer.png`);
            console.log('Other player image loaded successfully');

            // Load healing point image
            healingPointImg = await loadImage(`${scriptDirectory}/healing_point.png`);
            console.log('Healing point image loaded successfully');


            console.log('otherPLayer and healingPointImg loaded successfully');
        } catch (error) {
            console.error('Error loading otherPLayer and healingPoint:', error);
        }




        // this might get replaced in PRD on the server - check
        ALL_QUALITIES = ['Faith', 'Courage', 'Knowledge', 'Love', 'Wisdom', 'Healing', 'Joy', 'Focus', 'Prosperity', 'Purity', 'Humility', 'Forgiveness', 'Hope', 'Praise', 'Intercession', 'Endurance', 'Good News', 'Identity'];

        if (PRD) {
            try {
                await loadVerses();
                // Continue with game initialization using organizedVerses
                console.log('Game initialized with verses:', organizedVerses);
                ALL_QUALITIES = Object.keys(organizedVerses);
                console.log("QUALITIES:" + ALL_QUALITIES);
            } catch (error) {
                console.error('Failed to initialize game:', error);
            }
            // otherwise load it locally       
        } else {
            QUALITIES = ALL_QUALITIES;
            verses = loadSelectedVerses();
            organizedVerses = organizeByCategory(verses);
        }

        vQuality = QUALITIES[Math.floor(Math.random() * QUALITIES.length)]; // Initial random quality

        qualityIndex = {};
        for (const quality of ALL_QUALITIES) {
            qualityIndex[quality] = 0;
        }

        qualityTotal = {};
        for (const quality of ALL_QUALITIES) {
            qualityTotal[quality] = 0;
        }

        MONSTER_SPAWN_RATE = 5000;
        repeatEnabled = false;
        repeatTimeout = null;
        hasPlayed = false;

        currentReviewMode = 'quality'; // Possible values: 'incorrect', 'quality'
        gameMode = 'game';
        levelCompleted = false;
        levelAdvanceCountdown = 0;
        levelAdvanceTimer = null;
        canvas.width = 400; // Set the canvas width to 412 pixels (for Samsung Galaxy A53 in portrait mode)
        canvas.height = Math.min(600, window.innerHeight - 80); // Reduced max height and increased margin to prevent scrollbars on mobile
        ctx = canvas.getContext('2d');
        console.log('Canvas width:', canvas.width);
        console.log('Canvas height:', canvas.height);
        mouseX = canvas.width / 2;
        mouseY = canvas.height / 2;

        explosionTimer = 0;

        // Pick the initial quality verse
        QuizManager.pickQualityVerse();
        console.log('Initialised currentVerseIndex: ' + currentVerseIndex);

        // Set up the timer to display a new verse every 10 seconds
        verseTimer = setInterval(QuizManager.pickQualityVerse, VERSECHANGETIME);

        // Create quality buttons
        QuizManager.createQualityButtons();

        // Set up the timer to update quality buttons every 22 seconds
        updateButtonsTimer = setInterval(QuizManager.createQualityButtons, 22000);

        healingPointImg = new Image();
        healingPointImg.src = `${scriptDirectory}/healing_point.png`;
        healingPointImg.onload = function () {
            console.log('Healing point image loaded');
        };
        healingPointImg.onerror = function () {
            console.error('Error loading healing point image');
        };

        // Load shield image
        shieldImg = new Image();
        shieldImg.src = `${scriptDirectory}/shield_of_faith.png`;
        shieldImg.onload = function () {
            console.log('Shield of Faith image loaded');
        };
        shieldImg.onerror = function () {
            console.log('Shield image not found, using fallback rendering');
            shieldImg = null;
        };

        // Load demon images
        demonImages = {};
        const demonImagePromises = Object.keys(DEMON_TYPES).map((demonType) => {
            return new Promise((resolve, reject) => {
                demonImages[demonType] = new Image();
                demonImages[demonType].src = DEMON_TYPES[demonType];
                demonImages[demonType].onload = function () {
                    console.log(`${demonType} demon image loaded`);
                    resolve();
                };
                demonImages[demonType].onerror = function () {
                    console.error(`Error loading ${demonType} demon image`);
                    reject();
                };
            });
        });

        try {
            await Promise.all(demonImagePromises);
            console.log('All demon images loaded');
        } catch (error) {
            console.error('Error loading demon images:', error);
        }
        explosionImg = new Image();
        explosionImg.src = `${scriptDirectory}/explosion2.png`;
        explosionImg.onload = function () {
            console.log('Explosion image loaded');
        };
        explosionImg.onerror = function () {
            console.error('Error loading explosion image');
        };

        // Initialize InputHandler
        inputHandler = new InputHandler(canvas, {
            QUALITY_LINE_HEIGHT,
            BUTTON_HEIGHT,
            BUTTON_WIDTH,
            ANSWER_SECTION_HEIGHT
        });

        // Set up InputHandler callbacks
        inputHandler.setCallbacks({
            onQualityButtonClick: (qualityText) => {
                vQuality = qualityText;
                QuizManager.pickQualityVerse();
            },
            onQuizOptionClick: (selectedOption) => {
                QuizManager.handleQuizAnswer(selectedOption);
            },
            onReviewModeClick: (event) => {
                ReviewMode.handleReviewClick(event);
            },
            onHamburgerClick: () => {
                menuOpen = !menuOpen;
            },
            onMenuItemClick: (itemId) => {
                // Always close menu after selection
                menuOpen = false;
                
                if (itemId === 'review') {
                    ReviewMode.saveGameState();
                    ReviewMode.startReviewMode();
                } else if (itemId === 'playPause') {
                    MusicManager.togglePlay();
                    console.log('Music playing:', MusicManager.getIsPlaying());
                } else if (itemId === 'nextSong') {
                    // Cycle to next track (wrap around)
                    const state = MusicManager.getState();
                    const nextIndex = (state.currentTrackIndex + 1) % state.tracks.length;
                    MusicManager.playTrack(nextIndex);
                    console.log('Next song:', state.tracks[nextIndex].name);
                }
            },
            onGameClick: (x, y) => {
                // Check inventory button click (floating "i" icon in top-left area)
                const ib = UILayout.inventoryButton;
                const invBtnX = UILayout.getInventoryButtonX();
                const invBtnY = ib.topOffset;
                const invBtnSize = ib.size;

                if (x >= invBtnX && x <= invBtnX + invBtnSize &&
                    y >= invBtnY && y <= invBtnY + invBtnSize) {
                    inventoryOpen = !inventoryOpen;
                    return true;
                }

                // Check inventory panel clicks when open
                if (inventoryOpen) {
                    const ip = UILayout.inventoryPanel;
                    const panelX = UILayout.getInventoryPanelX();
                    const panelY = ip.topOffset;
                    const panelW = ip.width;
                    const panelH = ip.height;

                    // "Use" button for shield
                    const ub = UILayout.inventoryUseButton;
                    const useBtnX = panelX + ub.xOffsetInPanel;
                    const useBtnY = panelY + ub.yOffsetInPanel;
                    const useBtnW = ub.width;
                    const useBtnH = ub.height;

                    if (x >= useBtnX && x <= useBtnX + useBtnW &&
                        y >= useBtnY && y <= useBtnY + useBtnH &&
                        shieldInventory > 0 && !shieldActive) {
                        shieldInventory--;
                        shieldActive = true;
                        shieldEndTime = Date.now() + Constants.SHIELD_DURATION;
                        inventoryOpen = false;
                        console.log('Shield of Faith activated!');
                        return true;
                    }

                    // Click anywhere in panel area consumes the click
                    if (x >= panelX && x <= panelX + panelW &&
                        y >= panelY && y <= panelY + panelH) {
                        return true;
                    }

                    // Click outside panel closes it
                    inventoryOpen = false;
                    return true;
                }

                // Check if clicked on a monster (Shooting)
                // Need to account for camera position since x,y are screen coords
                // But monsters are in world coords.
                const worldX = x + camera.x;
                const worldY = y + camera.y;

                // Simple point-in-rect check for monsters
                // Reverse iterate to hit top-most drawn monster first (if any)
                for (let i = monsters.length - 1; i >= 0; i--) {
                    const m = monsters[i];
                    if (
                        worldX >= m.x - m.width / 2 &&
                        worldX <= m.x + m.width / 2 &&
                        worldY >= m.y - m.height / 2 &&
                        worldY <= m.y + m.height / 2
                    ) {
                        // Clicked on a monster!
                        // Server handles ammo validation and deduction
                        network.sendShoot({ x: worldX, y: worldY });
                        return true; // Handled (prevent movement)
                    }
                }

                return false; // Not handled (allow movement)
            }
        });

        console.log('Game initialized');

        resolve();
    });
}

// Note: handleMouseClick has been replaced by InputHandler module

// Game loop
function gameLoop() {

    if (!playerCode) {
        console.log("Waiting for player code assignment");
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!isGameLoaded) {
        drawLoadingScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gameState) {
        console.error("Game state is undefined");
        requestAnimationFrame(gameLoop);
        return;
    }
    //for multiplayer
    if (!player) console.log("Player not initialised in gameLoop");
    currentTime = Date.now();
    const elapsedTime = currentTime - lastUpdateTime;

    if (gameMode === 'game') {
        const uiState = {
            vQuality,
            qualityButtons,
            gameOverFlag,
            isAnswerCorrect,
            levelCompleted,
            levelAdvanceCountdown,
            lastAttackedMonster,
            explosionTimer,
            currentVerse: {
                text: answerFullVerse || (currentQuiz ? currentQuiz.promptText : ''),
                reference: organizedVerses[vQuality][currentVerseIndex].Reference
            },
            quiz: answerFullVerse ? null : currentQuiz,
            menuState: {
                menuOpen,
                musicState: MusicManager.getState(),
                reviewActive: gameMode === 'review'
            }
        };

        const assets = {
            playerImg,
            otherPlayerImg,
            demonImages,
            explosionImg,
            healingPointImg,
            shieldImg
        };

        // Instantiate renderer if not already (hack for now, should be in init)
        if (!window.renderer) {
            window.renderer = new Renderer(canvas, ctx, assets);
        }
        window.renderer.assets = assets; // Update assets in case they loaded late

        // Build shield state for renderer
        const shieldState = {
            count: shieldInventory,
            active: shieldActive,
            remaining: shieldActive ? Math.max(0, shieldEndTime - Date.now()) : 0,
            inventoryOpen: inventoryOpen
        };

        window.renderer.drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, shieldState, clientWalls);

        // If game over, stop processing movement/combat but keep rendering
        if (gameOverFlag) {
            requestAnimationFrame(gameLoop);
            return;
        }

        /*
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the quality line
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, QUALITY_LINE_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial'; // Set the font size
        ctx.fillText(`Quality: ${vQuality}`, 7, 22);

        drawReviewButton();

        // Draw quality buttons on same row, right-aligned (moved 8px right)
        const buttonStartX = canvas.width - (qualityButtons.length * (BUTTON_WIDTH + 7)) - 7 + 8;
        qualityButtons.forEach((button, index) => {
            const buttonX = buttonStartX + index * (BUTTON_WIDTH + 7);
            ctx.fillStyle = button.color;
            ctx.fillRect(buttonX, 5, BUTTON_WIDTH, BUTTON_HEIGHT);

            // Use white text for better visibility on colored backgrounds
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Arial'; // Made text bold
            ctx.fillText(button.text, buttonX + BUTTON_PADDING, 5 + BUTTON_HEIGHT - BUTTON_PADDING);
        });

        // In the gameLoop function
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial'; // Set the font size
        ctx.fillText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`, 7, QUALITY_LINE_HEIGHT - 7);

        // Show enemy info only if actively in combat (within combat distance)
        if (lastAttackedMonster && lastAttackedMonster.health > 0) {
            // Verify monster still exists in current monsters array
            const stillExists = monsters.some(m => m.id === lastAttackedMonster.id);
            if (stillExists) {
                // Check if player is within combat distance
                const dx = lastAttackedMonster.x - player.x;
                const dy = lastAttackedMonster.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < COMBAT_DISTANCE) {
                    const enemyText = `Enemy: ${lastAttackedMonster.demonType} ${lastAttackedMonster.health}`;
                    ctx.fillText(enemyText, ctx.measureText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`).width + 14, QUALITY_LINE_HEIGHT - 7);
                }
            } else {
                // Monster was killed, clear the reference
                lastAttackedMonster = null;
            }
        }

        // Display the game level in bold yellow
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 14px Arial'; // Set the font size and bold style
        const gameLevelText = `${gameState.gameLevel}`;
        const gameLevelWidth = ctx.measureText(gameLevelText).width;
        ctx.fillText(gameLevelText, canvas.width - gameLevelWidth - 7, 40);

        if (gameOverFlag) {
            ctx.fillStyle = 'green';
            ctx.font = '29px Arial'; // Set the font size
            ctx.fillText('G A M E   O V E R', canvas.width / 2 - 140, canvas.height / 2);
            return;
        }

        // Display the answer status
        if (isAnswerCorrect === true) {
            ctx.fillStyle = 'green';
            ctx.font = '17px Arial'; // Set the font size
            ctx.fillText('Correct!', canvas.width / 2 - 35, canvas.height / 2);
        } else if (isAnswerCorrect === false) {
            ctx.fillStyle = 'red';
            ctx.font = '17px Arial'; // Set the font size
            ctx.fillText('Incorrect!', canvas.width / 2 - 35, canvas.height / 2);
        }
        */

        // Move the player
        // Get movement target from InputHandler
        const worldTarget = inputHandler ? inputHandler.getWorldTarget() : null;

        if (worldTarget) {
            let dx = worldTarget.x - player.x;
            let dy = worldTarget.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            const THRESHOLD_DISTANCE = 5; // Adjust this value as needed

            if (distance > THRESHOLD_DISTANCE) {
                // Calculate new position
                const newX = player.x + (dx / distance) * PLAYER_SPEED;
                const newY = player.y + (dy / distance) * PLAYER_SPEED;

                // Check monster collision
                let monsterCollision = false;
                for (const monster of monsters) {
                    const monsterDx = newX - monster.x;
                    const monsterDy = newY - monster.y;
                    const monsterDist = Math.sqrt(monsterDx * monsterDx + monsterDy * monsterDy);
                    if (monsterDist < (player.width / 2 + monster.width / 2)) {
                        monsterCollision = true;
                        break;
                    }
                }

                // Try moving in both dimensions
                if (!monsterCollision && !checkWallCollision(newX, newY, player.width, player.height)) {
                    player.x = newX;
                    player.y = newY;
                }
                // If blocked, try sliding along X axis only
                else if (!monsterCollision && !checkWallCollision(newX, player.y, player.width, player.height)) {
                    player.x = newX;
                }
                // If blocked, try sliding along Y axis only
                else if (!monsterCollision && !checkWallCollision(player.x, newY, player.width, player.height)) {
                    player.y = newY;
                }

                // Keep player within world bounds
                player.x = Math.max(0, Math.min(player.x, WORLD_WIDTH));
                player.y = Math.max(0, Math.min(player.y, WORLD_HEIGHT));

                // Send the player's position to the server
                network.sendPosition(player.x, player.y);
            } else {
                // Player has arrived at target, clear it
                inputHandler.clearTarget();
            }
        }

        // Update camera to follow player
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;

        // Clamp camera to world bounds
        camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width));
        camera.y = Math.max(0, Math.min(camera.y, WORLD_HEIGHT - canvas.height));

        // Update InputHandler with current camera for click-to-world coord conversion
        if (inputHandler) {
            inputHandler.setCamera(camera);
        }



        // Handle collisions and attacks
        currentTime = Date.now();
        monsters.forEach(monster => {
            let dx = monster.x - player.x;
            let dy = monster.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < COMBAT_DISTANCE) {
                // Handle combat
                if (currentTime - lastAttackTime > ATTACK_RATE) {
                    lastAttackTime = currentTime;
                    if (isAnswerCorrect === true) {
                        attackSound.play(); // Play the attack sound effect
                        monster.isAttacked = true; // Set isAttacked to true when the monster is attacked
                        setTimeout(() => {
                            monster.isAttacked = false; // Set isAttacked back to false after a short duration
                        }, 200); // Adjust the duration as needed
                        // Create the attackData structure
                        handlePlayerAttack(monster);
                    }

                    // Store the last attacked monster
                    lastAttackedMonster = monster;

                    // Shield blocks monster damage
                    if (!shieldActive) {
                        // Calculate random damage between 0 and the monster's maximum damage
                        const damage = Math.floor(Math.random() * (monster.maxDamage + 1) * gameState.gameLevel);
                        player.health -= damage; // Monster attacks the player locally for immediate feedback
                        network.sendPlayerHit(damage);

                        playerHit.play(); // Play the attack sound effect
                        if (player.health <= 0) {
                            gameOver.play();
                            gameOverFlag = true;
                        }
                    }
                }
            }

        });

        // Check if the level is completed
        // Require 60% of monsters to be killed (allows some to be stuck/missed)
        const killed = gameState.monstersKilled || 0;
        const total = gameState.maxSpawns;

        if (killed >= total * 0.6 && !levelCompleted) {
            console.log("Checking level completion. Killed:", killed, "Total:", total);
            if (gameState.gameLevel < Object.keys(levelData).length) {
                console.log("Level completed — notifying server");
                // Notify server; it will broadcast levelAdvancing to all clients
                network.sendLevelCompleted();
                // Set flag to prevent duplicate sends (server countdown will set levelCompleted via callback)
                levelCompleted = true;
            } else {
                console.log("Game completed");
                /*
                ctx.fillStyle = 'green';
                ctx.font = '29px Arial';
                ctx.fillText('Game completed!', canvas.width / 2 - 140, canvas.height / 2);
                */
                gameOverFlag = true;
            }
        }
        healingPoints.forEach((healingPoint, index) => {
            let dx = healingPoint.x - player.x;
            let dy = healingPoint.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.width / 2 + healingPoint.width / 2) {
                // Heal the player
                network.sendCollectHealingPoint(healingPoint.id);
                healingRecharge.play(); // Play the attack sound effect
            }
        });

        // Check shield point collection
        shieldPoints.forEach((shieldPoint) => {
            let dx = shieldPoint.x - player.x;
            let dy = shieldPoint.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.width / 2 + shieldPoint.width / 2) {
                shieldInventory++;
                network.sendCollectShield(shieldPoint.id);
                healingRecharge.play();
                console.log('Shield of Faith collected! Inventory:', shieldInventory);
            }
        });

        // Update shield timer
        if (shieldActive && Date.now() >= shieldEndTime) {
            shieldActive = false;
            console.log('Shield of Faith expired');
        }

        /*
        // Draw the game objects
 
        // Draw walls first (background layer)
        drawWalls();
 
        // Draw all players
        Object.keys(gameState.players).forEach(code => {
            const playerData = gameState.players[code];
            //console.log("Code", code,"playerCode",playerCode);
 
            if (playerData && playerImg && otherPlayerImg && playerImg.complete && playerData.width && playerData.height) {
                drawPlayer(playerData, code === playerCode);  // 2nd parameter true if it is the current player
            } else {
                console.log("Player not drawn. Player:", playerData, "PlayerImg:", playerImg,
                    "PlayerImg complete:", playerImg ? playerImg.complete : false,
                    "Player width:", player ? player.width : undefined,
                    "Player height:", player ? player.height : undefined);
            }
        });
 
 
        explosionTimer += EXPLOSION_INTERVAL;
 
        //console.log(`Attempting to draw ${monsters.length} monsters`);
        //debugger;
        monsters.forEach(monster => {
            drawMonster(monster, explosionTimer);
        });
 
 
        healingPoints.forEach(healingPoint => {
            drawHealingPoint(healingPoint);
        });
 
        // Display the Bible verse and request the next animation frame
        displayBibleVerse(gappedVerse, organizedVerses[vQuality][currentVerseIndex].Reference);
        */
    } //end gameMode = 'game'

    //start gameMode = 'review'
    else {
        //console.log("About to enter displayReviewVerseScreen");
        ReviewMode.displayReviewVerseScreen();
    }

    if (elapsedTime >= UPDATE_INTERVAL) {
        const playerData = {
            x: player.x,
            y: player.y,
            health: player.health,
            maxHealth: player.maxHealth,
            xp: player.xp,
            level: player.level,
            healthBar: player.healthBar
            // Add other player properties as needed
        };

        network.sendPlayerData(playerCode, playerData);
        lastUpdateTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
} //end gameLoop


function updateGameState(newGameState) {
    //console.log('Updating game state. Current playerCode:', playerCode);

    // Safeguard against overwriting playerCode
    const tempPlayerCode = playerCode;

    gameState = { ...gameState, ...newGameState };

    // Restore playerCode if it was overwritten
    if (playerCode !== tempPlayerCode) {
        console.warn('playerCode was overwritten. Restoring original value.');
        playerCode = tempPlayerCode;
    }

    if (gameState.monsters && gameState.monsters.length > 0) {
        //console.log('Updated game state. Monsters:', gameState.monsters.length);
    }

    if (!isGameLoaded) {
        isGameLoaded = true;
        console.log("Game loaded");
    }

    // Update spawnsLeft
    if (gameState.spawnsLeft !== undefined) {
        spawnsLeft = gameState.spawnsLeft;
    }

    if (gameState.players && playerCode) {
        Object.keys(gameState.players).forEach(code => {
            if (code === playerCode) {
                // Update our player, but preserve local dimensions which come from the loaded image
                const { width, height, x, y } = player;
                const serverPlayer = gameState.players[code];

                // Update stats (health, xp, etc) but handle position carefully
                player = { ...player, ...serverPlayer };

                // Reconciliation: Only snap to server position if discrepancy is too large (20px)
                // Otherwise, trust local prediction to avoid jitter
                const dist = Math.sqrt(Math.pow(serverPlayer.x - x, 2) + Math.pow(serverPlayer.y - y, 2));
                if (dist < 20) {
                    player.x = x;
                    player.y = y;
                } else {
                    // console.log("Reconciling position - too far from server");
                }

                if (width && height) {
                    player.width = width;
                    player.height = height;
                }
            } else {
                // Update other players
                gameState.players[code] = { ...gameState.players[code], ...newGameState.players[code] };
            }
        });
    } else if (!playerCode) {
        console.log("playerCode not set yet, waiting for server assignment");
    }

    if (!playerCode) console.log("playerCode in updateGameState is empty: " + playerCode);

    const currentTime = Date.now();

    // Update monsters from server state
    if (newGameState.monsters && Array.isArray(newGameState.monsters)) {
        gameState.monsters = newGameState.monsters;
        monsters = gameState.monsters.map((monsterState) => {
            return {
                ...monsterState,
                healthBar: {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 7,
                    color: 'green'
                }
            };
        });
        if (!player) {
            // Player not created yet, wait for initialization
        } else {
            const serverPlayer = newGameState.players[playerCode];
            if (serverPlayer) {
                player.health = serverPlayer.health;
                player.xp = serverPlayer.xp;
                player.level = serverPlayer.level;
                // Sync Ammo
                if (serverPlayer.ammo !== undefined) {
                    player.ammo = serverPlayer.ammo;
                }
            }
        }

        //console.log('Mapped monsters:', monsters.length);
    } else {
        console.log('No monsters in game state or invalid monsters data');
        monsters = [];
    }

    // Update healing points
    if (newGameState.healingPoints && Array.isArray(newGameState.healingPoints)) {
        healingPoints = newGameState.healingPoints;
    } else {
        healingPoints = [];
    }

    // Update shield points
    if (newGameState.shieldPoints && Array.isArray(newGameState.shieldPoints)) {
        shieldPoints = newGameState.shieldPoints;
    } else {
        shieldPoints = [];
    }

    // Update bullets
    if (newGameState.bullets && Array.isArray(newGameState.bullets)) {
        gameState.bullets = newGameState.bullets;
    } else {
        gameState.bullets = [];
    }
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Update the handlePlayerAttack function to only send the attack data to the server
function handlePlayerAttack(monster) {
    const attackData = {
        monsterId: monster.id,
        damage: 2 // Or whatever damage calculation you're using
    };
    network.sendAttack(attackData);
}


function updatePlayerLevel(xp) {
    console.log('Checking if we should update level');
    for (let i = player.level; i < levelXPRequirements.length; i++) {
        if (xp >= levelXPRequirements[i]) {
            player.level = i + 1;
            player.maxHealth = 50 + player.level * 50;
            player.health = player.maxHealth; // Set player's health to the new max health
            console.log(`Player reached level ${player.level}!`);
        } else {
            break;
        }
    }
}




// Check if a position collides with any wall (uses spatial grid for O(1) lookup)
function checkWallCollision(x, y, width, height) {
    if (clientWallGrid) {
        return clientWallGrid.collides(x, y, width, height);
    }
    return false;
}


