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
    walls: [],
    connectedPlayers: 0,
    gameLevel: 1,
    maxSpawns: 0,
    spawnsLeft: 0
};

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
const QUALITY_LINE_HEIGHT = 45; // Height of the quality line (2.5x higher)
const BUTTON_WIDTH = 84; // Width of the quality buttons
const BUTTON_HEIGHT = 21; // Height of the quality buttons
const BUTTON_PADDING = 4; // Padding around the button text
const ANSWER_SECTION_HEIGHT = 17; // Distance from bottom where nothing should move or spawn
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

// If qualities is set to [] then all qualities will be used
const levelData = {
    1: {
        qualities: ['Faith', 'Courage', 'Knowledge'],
        monsters: ['Fear', 'Ignorance'],
        monsterDamageFactor: 1,
        playerSpeed: 5,
        monsterSpeed: 1,
        spawnRate: 10000,
        maxMonsters: 3
    },
    2: {
        qualities: ['Love', 'Wisdom', 'Healing'],
        monsters: ['Strife', 'Confusion', 'Infirmity'],
        monsterDamageFactor: 1.5,
        playerSpeed: 6,
        spawnRate: 8000,
        monsterSpeed: 1.5,
        maxMonsters: 5
    },
    3: {
        qualities: ['Forgiveness', 'Good News', 'Focus'],
        monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt'],
        monsterDamageFactor: 1.5,
        playerSpeed: 6,
        spawnRate: 5000,
        monsterSpeed: 1.5,
        maxMonsters: 5
    }
    // Add more level configurations as needed
};

let QUALITIES;
let ALL_QUALITIES;
// gameCategory variable is taken from index.php?category=Whatever

let gappedVerse = '';
let firstLetters = '';
let mcOptions = [];
let isAnswerCorrect = null; // Global variable to store the answer status
let answerResultTimeout = null; // Timeout reference for displaying the answer result
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

const levelXPRequirements = [
    0, // Level 1 requirement (0 XP)
    30, // Level 2 requirement
    100, // Level 3 requirement
    200, // Level 4 requirement
    // Add more XP requirements for higher levels if needed
];

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

function organizeByCategory2(verses) {
    const categorizedVerses = {};

    verses.forEach((verse) => {
        const category = verse.category;  // Use the correct property name
        if (!categorizedVerses[category]) {
            categorizedVerses[category] = [];
        }
        categorizedVerses[category].push(verse);
    });

    return categorizedVerses;
}

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
        organizedVerses = organizeByCategory2(data); // Assign the retrieved verses to organizedVerses
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

// Wait for the DOM content to load
document.addEventListener('DOMContentLoaded', function () {
    // Get the canvas element by its ID
    canvas = document.getElementById('gameCanvas');

    // Check if the canvas element exists
    if (canvas) {
        // Get the 2D rendering context
        ctx = canvas.getContext('2d');

        // Start the game initialization
        init().then(() => {
            gameLoop();
        }).catch((error) => {
            console.error('Error initializing game:', error);
        });
    } else {
        console.error('Canvas element not found');
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
                        width: 47,
                        height: 52,
                        width: 47,
                        height: 52,
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
        canvas.width = 400; // Set the canvas width to 412 pixels (for Samsung Galaxy A53 in portrait mode)
        canvas.height = Math.min(700, window.innerHeight - 30); // Set the canvas height to 732 pixels (for Samsung Galaxy A53 in portrait mode)
        ctx = canvas.getContext('2d');
        console.log('Canvas width:', canvas.width);
        console.log('Canvas height:', canvas.height);
        mouseX = canvas.width / 2;
        mouseY = canvas.height / 2;

        explosionTimer = 0;

        // Pick the initial quality verse
        pickQualityVerse();
        console.log('Initialised currentVerseIndex: ' + currentVerseIndex);

        // Set up the timer to display a new verse every 10 seconds
        verseTimer = setInterval(pickQualityVerse, VERSECHANGETIME);

        // Create quality buttons
        createQualityButtons();

        // Set up the timer to update quality buttons every 22 seconds
        updateButtonsTimer = setInterval(createQualityButtons, 22000);

        healingPointImg = new Image();
        healingPointImg.src = `${scriptDirectory}/healing_point.png`;
        healingPointImg.onload = function () {
            console.log('Healing point image loaded');
        };
        healingPointImg.onerror = function () {
            console.error('Error loading healing point image');
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
                pickQualityVerse();
            },
            onQuizOptionClick: (selectedOption, index) => {
                handleQuizAnswer(selectedOption);
            },
            onReviewButtonClick: () => {
                saveGameState();
                startReviewMode();
            },
            onReviewModeClick: (event) => {
                handleReviewClick(event);
            },
            onGameClick: (x, y) => {
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

// Handle quiz answer selection (called by InputHandler)
function handleQuizAnswer(selectedOption) {
    if (selectedOption === firstLetters) {
        isAnswerCorrect = true;
        qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
        qualityTotal[vQuality] = qualityTotal[vQuality] + 1;
        console.log(vQuality + " total correct is: " + qualityTotal[vQuality]);

        // Award Ammo
        player.ammo = (player.ammo || 0) + Constants.AMMO_REWARD;
        network.sendQuizCorrect();

        setAnswerResultTimeout(5000);
    } else {
        isAnswerCorrect = false;
        qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
        setAnswerResultTimeout(10000);

        const currentReference = organizedVerses[vQuality][currentVerseIndex].Reference;
        if (!incorrectAnswerReferences.includes(currentReference)) {
            incorrectAnswerReferences.push(currentReference);
        }
    }
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
            lastAttackedMonster,
            explosionTimer,
            currentVerse: {
                text: gappedVerse,
                reference: organizedVerses[vQuality][currentVerseIndex].Reference
            },
            quiz: {
                firstLetters,
                mcOptions
            }
        };

        const assets = {
            playerImg,
            otherPlayerImg,
            demonImages,
            explosionImg,
            healingPointImg
        };

        // Instantiate renderer if not already (hack for now, should be in init)
        if (!window.renderer) {
            window.renderer = new Renderer(canvas, ctx, assets);
        }
        window.renderer.assets = assets; // Update assets in case they loaded late

        window.renderer.drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState);

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

            // Prevent monster from getting too close to the player - old code which let monsters be pushed off screen
            if (distance < MINIMUM_DISTANCE) {
                let angle = Math.atan2(dy, dx);
                monster.x = player.x + Math.cos(angle) * MINIMUM_DISTANCE;
                monster.y = player.y + Math.sin(angle) * MINIMUM_DISTANCE;

                // Check if the monster is off the screen
                if (
                    monster.x < 0 ||
                    monster.x > canvas.width - monster.width ||
                    monster.y < QUALITY_LINE_HEIGHT + BUTTON_HEIGHT ||
                    monster.y > canvas.height - monster.height - ANSWER_SECTION_HEIGHT
                ) {
                    // Teleport the monster to a random location on the screen
                    monster.x = Math.random() * (canvas.width - monster.width);
                    monster.y = Math.random() * (canvas.height - monster.height - ANSWER_SECTION_HEIGHT - QUALITY_LINE_HEIGHT - BUTTON_HEIGHT) + QUALITY_LINE_HEIGHT + BUTTON_HEIGHT;
                }
            }



        });
        /*
        // Display level completed message if true
        if (levelCompleted) {
            ctx.fillStyle = 'green';
            ctx.font = '29px Arial'; // Set the font size
            ctx.fillText('Level completed.', canvas.width / 2 - 140, canvas.height / 2);
        }
        */


        // Check if the level is completed
        // Require 60% of monsters to be killed (allows some to be stuck/missed)
        const killed = gameState.monstersKilled || 0;
        const total = gameState.maxSpawns;

        if (killed >= total * 0.6 && !levelCompleted) {
            console.log("Checking level completion. Killed:", killed, "Total:", total);
            if (gameState.gameLevel < Object.keys(levelData).length) {
                console.log("Level completed");
                /*
                ctx.fillStyle = 'green';
                ctx.font = '29px Arial';
                ctx.fillText('Level completed!', canvas.width / 2 - 140, canvas.height / 2);
                */
                levelCompleted = true;

                // Emit the levelCompleted event to the server
                network.sendLevelCompleted();

                setTimeout(() => {
                    levelCompleted = false; // Reset the flag for the next level
                    setLevelData(gameState);
                }, 5000);
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
        displayReviewVerseScreen();
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


// Function to display the Bible verse

// Pick a random verse and display it
function pickRandomVerse() {
    currentVerseIndex = Math.floor(Math.random() * organizedVerses[vQuality].length);
    const verseText = organizedVerses[vQuality][currentVerseIndex].Text;
    [gappedVerse, firstLetters, mcOptions] = generateQuiz(verseText);
    clearAnswerResultTimeout(); // Clear any previous answer result timeout
}

function pickQualityVerse() {
    console.log("Quality:" + vQuality + ", Index: " + qualityIndex[vQuality] + "out of" + organizedVerses[vQuality].length);
    currentVerseIndex = qualityIndex[vQuality];
    const verseText = organizedVerses[vQuality][currentVerseIndex].Text;
    [gappedVerse, firstLetters, mcOptions] = generateQuiz(verseText);
    clearAnswerResultTimeout();
}


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
                const { width, height } = player;
                player = { ...player, ...gameState.players[code] };
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




// Note: Second handleMouseClick was also removed - replaced by InputHandler module


function setAnswerResultTimeout(duration) {
    clearAnswerResultTimeout();

    answerResultTimeout = setTimeout(() => {
        clearAnswerResultTimeout();
        pickQualityVerse();
    }, duration);
}

// Clear the answer result timeout and reset the variables
function clearAnswerResultTimeout() {
    if (answerResultTimeout) {
        clearTimeout(answerResultTimeout);
        answerResultTimeout = null;
        isAnswerCorrect = null;
    }
}


// Check if a position collides with any wall
function checkWallCollision(x, y, width, height) {
    if (!gameState.walls) return false;

    for (const wall of gameState.walls) {
        if (x + width / 2 > wall.x &&
            x - width / 2 < wall.x + wall.width &&
            y + height / 2 > wall.y &&
            y - height / 2 < wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

// Create quality buttons
function createQualityButtons() {
    qualityButtons = [];
    const buttonColors = ['green', 'blue', 'purple'];

    // Get random qualities for buttons
    const buttonQualities = Array.from(new Set(QUALITIES.sort(() => Math.random() - 0.5).slice(0, 3)));

    const buttonStartX = canvas.width - (buttonQualities.length * (BUTTON_WIDTH + 7)) - 7;
    for (let i = 0; i < buttonQualities.length; i++) {
        const buttonX = buttonStartX + i * (BUTTON_WIDTH + 7);
        const buttonY = 5;
        qualityButtons.push({
            x: buttonX,
            y: buttonY,
            width: BUTTON_WIDTH,
            height: BUTTON_HEIGHT,
            text: buttonQualities[i],
            color: buttonColors[i]
        });
    }
}

function processVerse(originalVerse, iCount) {
    const words = originalVerse.split(' ');
    if (words.length < iCount) {
        iCount = words.length; // Adjust COUNT if it exceeds the number of words in the verse
    }
    if (words.length >= iCount) {
        // Create a copy of the indices and shuffle it
        const shuffledIndices = Array.from(Array(words.length).keys());
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }

        let testVerse = '';
        let firstLettersOfMissingWords = '';
        let selectedCount = 0;

        // Loop through the original indices
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (word.length >= 5 && selectedCount < iCount && shuffledIndices.includes(i)) {
                // Replace with dashes for words with length >= 5
                testVerse += '-'.repeat(word.length) + ' ';
                firstLettersOfMissingWords += word[0].toUpperCase(); //change to toLowerCase() for debugging
                selectedCount++;
            } else {
                // Add the original word for others
                testVerse += word + ' ';
            }
        }

        return [testVerse.trim(), firstLettersOfMissingWords];
    }
    return ['', ''];
}
/*
function generateQuiz(verse) {
 const [testVerse, firstLetter] = processVerse(verse, 1);
 const distractors = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y'];
 const index = distractors.indexOf(firstLetter.toLowerCase());
 if (index > -1) {
   distractors.splice(index, 1);
 }
 const options = [firstLetter, ...Array(3).fill().map(() => distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0])];
 const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
 return [testVerse, firstLetter, shuffledOptions];
}
*/

function generateQuiz(verse) {
    const [testVerse, firstLetters] = processVerse(verse, 2);
    const distractors = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y'];
    const options = [firstLetters];

    // Generate two totally random distractors
    for (let i = 0; i < 2; i++) {
        const letter1 = distractors[Math.floor(Math.random() * distractors.length)];
        const letter2 = distractors[Math.floor(Math.random() * distractors.length)];
        options.push(letter1.toUpperCase() + letter2.toUpperCase());
    }

    // Generate the last distractor
    if (Math.random() < 0.5) {
        // 50% chance of generating a totally random distractor
        const letter1 = distractors[Math.floor(Math.random() * distractors.length)];
        const letter2 = distractors[Math.floor(Math.random() * distractors.length)];
        options.push(letter1.toUpperCase() + letter2.toUpperCase());
    } else {
        // 50% chance of using the correct first letter and a random letter
        const correctLetter = firstLetters[0];
        let randomLetter;
        do {
            randomLetter = distractors[Math.floor(Math.random() * distractors.length)];
        } while (randomLetter === firstLetters[1].toLowerCase());
        options.push(correctLetter.toUpperCase() + randomLetter.toUpperCase());
    }

    const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
    return [testVerse, firstLetters, shuffledOptions];
}

//hopefully all these Review related parts of the code could be moved to another file
function drawReviewButton() {
    const buttonWidth = 60;
    const buttonHeight = 13;
    const buttonX = canvas.width - buttonWidth - 20;
    const buttonY = 29;

    ctx.fillStyle = 'orange';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = 'black';
    ctx.font = '11px Arial';
    ctx.fillText('Review', buttonX + 12, buttonY + 10);
}


function saveGameState() {
    // Save the current game state (player position, monsters, health, etc.)
    // You can use variables or objects to store the state
    // Example:

    console.log("Got to save game state - button clicked");
    let savedGameState = {
        player: {
            ...player
        },
        monsters: [...monsters],
        // Save other relevant game state variables
    };
}

function startReviewMode() {
    // Clear the canvas
    gameMode = 'review';
    //console.log("Got to startReviewMode");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Initialize the review mode variables
    currentReviewVerseIndex = 0;
    repeatEnabled = false; // Ensure repeat mode is off when entering review mode

}

function restoreGameState() {
    gameMode = 'game';
    // ... (existing game state restoration code)
}

function getVerseDetails(reference) {
    for (let category in organizedVerses) {
        for (let i = 0; i < organizedVerses[category].length; i++) {
            const verse = organizedVerses[category][i];
            if (verse.Reference === reference) {
                return {
                    text: verse.Text,
                    category: category
                };
            }
        }
    }
    return null;
}


function displayReviewVerseScreen() {
    if (gameMode === 'review') {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the black bar at the top
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, 60);

        // Draw the review mode buttons
        drawReviewModeButtons();

        // Draw the navigation buttons
        drawNavigationButtons();



        let verseReference;
        let verseDetails;

        if (incorrectAnswerReferences.length == 0) {
            currentReviewMode = 'quality';
        }
        if (currentReviewMode === 'incorrect') {
            verseReference = incorrectAnswerReferences[currentReviewVerseIndex];
            verseDetails = getVerseDetails(verseReference);
        } else if (currentReviewMode === 'quality') {
            const qualityVerses = organizedVerses[vQuality];
            verseReference = qualityVerses[currentReviewVerseIndex].Reference;
            verseDetails = {
                text: qualityVerses[currentReviewVerseIndex].Text,
                category: vQuality
            };
        }

        if (verseDetails) {
            displayReviewVerse(verseDetails.text);

            // Display the verse reference and category/quality
            ctx.font = '20px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(`Quality: ${verseDetails.category}`, 10, canvas.height - 90);

            // Display the verse reference under the verse
            ctx.font = '20px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(`Reference: ${verseReference}`, 10, canvas.height - 120);

            // Start the audio playback if not already playing and repeat is not enabled
            if (!isAudioPlaying && !repeatEnabled) {
                startVerseAudio(verseReference);
            }
        }
    }
}




function displayReviewVerse(text) {
    const fontSize = 22;
    const lineHeight = fontSize * 1.2;
    const maxWidth = canvas.width - 20;

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'black';

    const words = text.split(' ');
    let line = '';
    let y = 100;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, 10, y);
            line = words[i] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }

    ctx.fillText(line, 10, y);
}


function drawReturnButton() {
    const buttonWidth = 100;
    const buttonHeight = 30;
    const buttonX = 20;
    const buttonY = 60;

    ctx.fillStyle = 'lightgray';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Play Game', buttonX + 15, buttonY + 20);
}

function drawNavigationButtons() {
    const buttonWidth = 100;
    const buttonHeight = 40;
    const buttonY = canvas.height - 60;
    const prevButtonX = 20;
    const repeatButtonX = prevButtonX + buttonWidth + 20;
    const nextButtonX = repeatButtonX + buttonWidth + 20;

    ctx.fillStyle = 'lightgray';
    ctx.fillRect(prevButtonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = repeatEnabled ? 'lightblue' : 'lightgray';
    ctx.fillRect(repeatButtonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(nextButtonX, buttonY, buttonWidth, buttonHeight);



    ctx.font = '20px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Previous', prevButtonX + 10, buttonY + 25);
    ctx.fillText('Repeat', repeatButtonX + 20, buttonY + 25);
    ctx.fillText('Next', nextButtonX + 25, buttonY + 25);
}

function handleReviewClick(event) {
    const rect = canvas.getBoundingClientRect();
    const clickedX = event.clientX - rect.left;
    const clickedY = event.clientY - rect.top;

    // Check if the click was on the "Game" button
    if (clickedX >= canvas.width - 100 && clickedX <= canvas.width - 20 && clickedY >= 15 && clickedY <= 45) {
        stopAudio();
        repeatEnabled = false;
        hasPlayed = false;
        restoreGameState();
    }

    // Check if the click was on the "Incorrect" button
    if (clickedX >= 20 && clickedX <= 100 && clickedY >= 15 && clickedY <= 45) {
        currentReviewMode = 'incorrect';
        currentReviewVerseIndex = 0;
        stopAudio();
        repeatEnabled = false;
        hasPlayed = false;
        displayReviewVerseScreen();
    }

    // Check if the click was on the quality button
    if (clickedX >= 110 && clickedX <= 190 && clickedY >= 15 && clickedY <= 45) {
        currentReviewMode = 'quality';
        currentReviewVerseIndex = 0;
        stopAudio();
        repeatEnabled = false;
        hasPlayed = false;
        displayReviewVerseScreen();
    }

    // Check if the click was on the "Previous" button
    if (clickedX >= 20 && clickedX <= 120 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
        if (currentReviewMode === 'incorrect') {
            currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
        } else if (currentReviewMode === 'quality') {
            currentReviewVerseIndex = Math.max(currentReviewVerseIndex - 1, 0);
        }
        stopAudio();
        repeatEnabled = false;
        hasPlayed = false; // Reset hasPlayed when moving to the previous verse
        displayReviewVerseScreen();
    }

    // Check if the click was on the "Next" button
    if (clickedX >= canvas.width - 120 && clickedX <= canvas.width - 20 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
        if (currentReviewMode === 'incorrect') {
            currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, incorrectAnswerReferences.length - 1);
        } else if (currentReviewMode === 'quality') {
            const qualityVerses = organizedVerses[vQuality];
            currentReviewVerseIndex = Math.min(currentReviewVerseIndex + 1, qualityVerses.length - 1);
        }
        stopAudio();
        repeatEnabled = false;
        hasPlayed = false; // Reset hasPlayed when moving to the next verse
        displayReviewVerseScreen();
    }

    // Check if the click was on the "Repeat" button
    if (clickedX >= 140 && clickedX <= 240 && clickedY >= canvas.height - 60 && clickedY <= canvas.height - 20) {
        repeatEnabled = !repeatEnabled; // Toggle the repeat state
        if (!repeatEnabled) {
            stopAudio();
        } else {
            hasPlayed = false;
            startVerseAudio(getCurrentVerseReference());
        }
        displayReviewVerseScreen();
    }
}

let isAudioPlaying = false;
let currentAudio = null;

async function playAudio(verseRef) {
    var base = 'https://spiritualwar.games/otd/mv/www/audio/se/';
    var audio = new Audio(base + verseRef);
    audio.type = 'audio/ogg';
    audio.volume = 1;
    currentAudio = audio;

    return new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play();
    });
}

var convertRef = function (Reference) {
    //Convert things like "1 Corinthians 4:12" to "1CO/4/12"
    //console.log("Entering convertRef function");
    console.log("Reference to convert: " + Reference);
    // special case for John - letters JN, book JHN, watch out for Psalms/Psalm
    $lookup = {
        Chronicles: 'CH',
        Corinthians: 'CO',
        John: 'JHN',
        Peter: 'PE',
        Thessalonians: 'TH',
        Kings: 'KI',
        Samuel: 'SA',
        Timothy: 'TI',
        Genesis: 'GEN',
        Exodus: 'EXO',
        Leviticus: 'LEV',
        Numbers: 'NUM',
        Deuteronomy: 'DEU',
        Joshua: 'JOS',
        Judges: 'JDG',
        Ruth: 'RUT',
        Ezra: 'EZR',
        Nehemiah: 'NEH',
        Esther: 'EST',
        Job: 'JOB',
        Psalm: 'PSA',
        Psalms: 'PSA',
        Proverbs: 'PRO',
        Ecclesiastes: 'ECC',
        'Song of Solomon': 'SNG',
        'Song of Songs': 'SNG',
        Isaiah: 'ISA',
        Jeremiah: 'JER',
        Ezekiel: 'EZK',
        Daniel: 'DAN',
        Hosea: 'HOS',
        Joel: 'JOL',
        Amos: 'AMO',
        Obadiah: 'OBA',
        Jonah: 'JON',
        Micah: 'MIC',
        Nahum: 'NAM',
        Habbakuk: 'HAB',
        Zephaniah: 'ZEP',
        Haggai: 'HAG',
        Zechariah: 'ZEC',
        Malachi: 'MAL',
        Matthew: 'MAT',
        Mark: 'MRK',
        Luke: 'LUK',
        Acts: 'ACT',
        Romans: 'ROM',
        Galatians: 'GAL',
        Ephesians: 'EPH',
        Philippians: 'PHP',
        Colossians: 'COL',
        Titus: 'TIT',
        Philemon: 'PHM',
        Hebrews: 'HEB',
        James: 'JAS',
        Jude: 'JUD',
        Revelation: 'REV'
    };

    let arr = Reference.split(' ');
    if (arr[0] in ['1', '2', '3']) {
        bookPrefix = arr[0];
        bookNameMain = arr[1];
        chapterVerse = arr[2];
        if (bookNameMain === 'John') {
            bookCode = bookPrefix + 'JN';
        } else {
            bookCode = bookPrefix + $lookup[bookNameMain];
        }
        console.log("Arr[0] = " + arr[0]);
        console.log(bookCode);
    } else // no number before the book
    {
        bookPrefix = '';
        bookNameMain = arr[0];

        chapterVerse = arr[1];
        bookCode = $lookup[arr[0]];
        if (typeof bookCode === undefined) {
            console.error(arr[0] + "is not a valid book");
            return "";
        }
    }
    // Now construct the code
    let $arr2 = chapterVerse.split(':');
    let $arr3 = $arr2[1].split('-');
    // for now this only returns one verse - not a list if it is a range of verses
    return (bookCode + '-' + $arr2[0] + '-' + $arr3[0]);
}
/*     
function playVerse(reference) 
     {
       console.log("Running playVerse - Reference to convert: " + reference);
       $vdir = convertRef(reference);
       console.log("Verse directory and file:" + $vdir);
         console.log("Playing from the web");
         playAudio($vdir +".ogg");
     }      
*/


function startVerseAudio(verseReference) {
    if (isAudioPlaying || (hasPlayed && !repeatEnabled)) {
        return;
    }

    $vdir = convertRef(verseReference);
    console.log("Verse directory and file:" + $vdir);
    isAudioPlaying = true;
    playAudio($vdir + ".ogg")
        .then(() => {
            isAudioPlaying = false;
            hasPlayed = true; // Set hasPlayed to true after the audio finishes playing
            if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                setTimeout(() => {
                    if (repeatEnabled && gameMode === 'review' && verseReference === getCurrentVerseReference()) {
                        startVerseAudio(verseReference);
                    }
                }, 5000); // Repeat after 5 seconds if still on the same verse and repeat is enabled
            }
        })
        .catch((error) => {
            isAudioPlaying = false;
            console.error('Error playing audio:', error);
        });
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        isAudioPlaying = false;
        currentAudio = null;
    }
    isAudioPlaying = false;
}


function drawReviewModeButtons() {
    const buttonWidth = 80;
    const buttonHeight = 30;
    const buttonY = 15;
    const incorrectButtonX = 20;
    const qualityButtonX = incorrectButtonX + buttonWidth + 10;
    const gameButtonX = canvas.width - buttonWidth - 20;

    ctx.fillStyle = currentReviewMode === 'incorrect' ? 'lightblue' : 'lightgray';
    ctx.fillRect(incorrectButtonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = currentReviewMode === 'quality' ? 'lightblue' : 'lightgray';
    ctx.fillRect(qualityButtonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = 'lightgray';
    ctx.fillRect(gameButtonX, buttonY, buttonWidth, buttonHeight);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Incorrect', incorrectButtonX + 10, buttonY + 20);
    ctx.fillText(vQuality, qualityButtonX + 10, buttonY + 20);
    ctx.fillText('Game', gameButtonX + 20, buttonY + 20);
}


function getCurrentVerseReference() {
    if (currentReviewMode === 'incorrect') {
        return incorrectAnswerReferences[currentReviewVerseIndex];
    } else if (currentReviewMode === 'quality') {
        const qualityVerses = organizedVerses[vQuality];
        return qualityVerses[currentReviewVerseIndex].Reference;
    }
}




