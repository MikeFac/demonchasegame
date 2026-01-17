// Game variables

let PRD = false;

let canvas, ctx, player, monsters, healingPoints, chaseTrigger, lastAttackedMonster;
let playerImg, monsterImg, healingPointImg, demonImages, explosionImg;
let PLAYER_SPEED = 5;
let MONSTER_SPEED = 1; // Slower monster speed
let MONSTER_SPAWN_RATE = 5000; // milliseconds (2 seconds)
const ATTACK_RATE = 700; // milliseconds (0.5 seconds)
let MAX_MONSTERS = 6; // Maximum number of monsters on the screen
const MIN_WALK_DISTANCE = 40; // Minimum distance for random walk
const MAX_WALK_DISTANCE = 300; // Maximum distance for random walk
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
let mouseX, mouseY; // Variables to store the last known mouse position
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

function setLevelData() {
    const numLevels = Object.keys(levelData).length;
    console.log("Number of levels:", numLevels);
    if (numLevels >= gameState.gameLevel) {
        const levelConfig = levelData[gameState.gameLevel];
        QUALITIES = levelConfig.qualities;
        if (QUALITIES == []){
            QUALITIES = ALL_QUALITIES;
        }
        MAX_MONSTERS = levelConfig.maxMonsters;
        PLAYER_SPEED = levelConfig.playerSpeed;
        MONSTER_SPEED = levelConfig.monsterSpeed;
        MONSTER_SPAWN_RATE = levelConfig.spawnRate;
    } else {
        QUALITIES = ALL_QUALITIES;
        const levelConfig = levelData[numLevels]; //use the last one
        MAX_MONSTERS = levelConfig.maxMonsters;
        PLAYER_SPEED = levelConfig.playerSpeed;
        MONSTER_SPEED = levelConfig.monsterSpeed;
        MONSTER_SPAWN_RATE = levelConfig.spawnRate;
      }
}

async function init() {
//multiplayer
    const socket = io('http://localhost:3000');

    // Create a new player on the server
    socket.emit('createPlayer');

      // Listen for game state updates from the server
    socket.on('gameStateUpdate', (gameState) => {
      updateGameState(gameState);
    });


    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        document.body.appendChild(canvas);
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
        verses = loadSelectedVerses();
        organizedVerses = organizeByCategory(verses);
    }


    setLevelData();

    vQuality = QUALITIES[Math.floor(Math.random() * QUALITIES.length)]; // Initial random quality

    qualityIndex = {};
    for (const quality of ALL_QUALITIES) {
        qualityIndex[quality] = 0;
    }
    
    qualityTotal = {};
    for (const quality of ALL_QUALITIES) {
       qualityTotal[quality] = 0;
    }
    // Remove existing event listeners
    canvas.removeEventListener('click', handleMouseClick);

    // Add new event listeners
    canvas.addEventListener('click', handleMouseClick);
 
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
    monsters = [];
    healingPoints = [];
    chaseTrigger = true; // Trigger to create a chasing monster initially
    lastAttackedMonster = null; // Initialize last attacked monster


    explosionTimer = 0;

    //pickRandomVerse();

    pickQualityVerse();

    // Set up the timer to display a new verse every 10 seconds
    verseTimer = setInterval(pickQualityVerse, VERSECHANGETIME);
    //verseTimer = setInterval(pickRandomVerse, 10000);

    // Create quality buttons
    createQualityButtons();

    // Set up the timer to update quality buttons every 22 seconds
    updateButtonsTimer = setInterval(createQualityButtons, 22000);
    setInterval(spawnMonster, MONSTER_SPAWN_RATE);
    // Load game assets
    playerImg = new Image();
    playerImg.src = `${scriptDirectory}/player.png`;
    playerImg.onload = function() {
        console.log('Player image loaded');
        // Initialize player with the correct dimensions
        player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            health: 60,
            maxHealth: 100,
            xp: 0,
            level: 1,
            healthBar: {
                x: 0,
                y: 0,
                width: 0,
                height: 7,
                color: 'green'
            },
            width: playerImg.width,
            height: playerImg.height
        };

        explosionImg = new Image();
        explosionImg.src = `${scriptDirectory}/explosion2.png`;
        explosionImg.onload = function() {
            console.log('Explosion image loaded');
        };
        explosionImg.onerror = function() {
            console.error('Error loading explosion image');
        };

        gameLoop();
    };
    playerImg.onerror = function() {
        console.error('Error loading player image');
    };

    monsterImg = new Image();
    monsterImg.src = `${scriptDirectory}/monster.png`;
    monsterImg.onload = function() {
        console.log('Monster image loaded');
    };
    monsterImg.onerror = function() {
        console.error('Error loading monster image');
    };



    healingPointImg = new Image();
    healingPointImg.src = `${scriptDirectory}/healing_point.png`;
    healingPointImg.onload = function() {
        console.log('Healing point image loaded');
        // Spawn initial healing points
        for (let i = 0; i < MAX_HEALING_POINTS; i++) {
            spawnHealingPoint(healingPointImg);
        }
    };
    healingPointImg.onerror = function() {
        console.error('Error loading healing point image');
    };

    // Load demon images
    demonImages = {};
    Object.keys(DEMON_TYPES).forEach((demonType) => {
        demonImages[demonType] = new Image();
        demonImages[demonType].src = DEMON_TYPES[demonType];

        // Add onload event handler for each demon image
        demonImages[demonType].onload = function() {
            console.log(`${demonType} demon image loaded`);
        };
        demonImages[demonType].onerror = function() {
            console.error(`Error loading ${demonType} demon image`);
        };
    });

    console.log('Game initialized');
}

// Function to display the Bible verse
function displayBibleVerse(verseText, verseReference) {
    if (currentVerseIndex !== null && answerResultTimeout === null) {
        const maxCharsPerLine = 60;
        const maxLines = 5;
        const lineHeight = 21;

        let lines = [];
        let currentLine = '';

        // Split the verse text into multiple lines
        for (let i = 0; i < verseText.length; i++) {
            const char = verseText[i];

            if (char === ' ' && currentLine.length >= maxCharsPerLine) {
                lines.push(currentLine.trim());
                currentLine = '';
            } else {
                currentLine += char;
            }

            if (i === verseText.length - 1 && currentLine.trim().length > 0) {
                lines.push(currentLine.trim());
            }
        }

        // Limit the number of lines to the maximum allowed
        lines = lines.slice(0, maxLines);

        // Draw the verse text line by line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const y = canvas.height - 112 + i * lineHeight; // Adjust the y-coordinate to make space for the reference and options
            ctx.fillStyle = 'black'; // Set text color to black
            ctx.font = '14px Arial'; // Set the font size
            ctx.fillText(line, 7, y);
        }

        // Draw the verse reference
        ctx.fillStyle = 'black'; // Set text color to black
        ctx.font = '14px Arial'; // Set the font size
        ctx.fillText(verseReference, 7, canvas.height - 112 + lines.length * lineHeight); // Adjust the y-coordinate to position the reference under the verse

        // Display the multiple-choice options
        displayMultipleChoiceOptions(firstLetters, mcOptions);
    }
}
/*
// Function to display the multiple-choice options
function displayMultipleChoiceOptions(firstLetters, options) {
  const buttonWidth = 35;
  const buttonHeight = 21;
  const buttonSpacing = 7;
  const optionStartX = 7;
  const optionStartY = canvas.height - 7; // Adjust the y-coordinate to position the options under the reference

  // Draw the "First letter of missing word is:" text
  ctx.fillStyle = 'black';
  ctx.font = '11px Arial'; // Set the font size
  ctx.fillText('First letter of missing word is:', optionStartX, optionStartY);

  // Draw the multiple-choice buttons
  for (let i = 0; i < options.length; i++) {
    const buttonX = optionStartX + 154 + i * (buttonWidth + buttonSpacing);
    const buttonY = optionStartY - 16;

    ctx.fillStyle = 'lightgray';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = 'black';
    ctx.font = '11px Arial'; // Set the font size
    ctx.fillText(options[i].toUpperCase(), buttonX + 10, buttonY + 15); // Adjust the text position within the button
  }
}
*/
function displayMultipleChoiceOptions(firstLetters, options) {
    const buttonWidth = 49; // Adjust the button width to accommodate 2 letters
    const buttonHeight = 21;
    const buttonSpacing = 7;
    const optionStartX = 7;
    const optionStartY = canvas.height - 7; // Adjust the y-coordinate to position the options under the reference

    // Draw the "First letters of missing words are:" text
    ctx.fillStyle = 'black';
    ctx.font = '11px Arial'; // Set the font size
    ctx.fillText('First letters of missing words are:', optionStartX, optionStartY);

    // Draw the multiple-choice buttons
    const textWidth = ctx.measureText('First letters of missing words are:').width;
    for (let i = 0; i < options.length; i++) {
        const buttonX = optionStartX + textWidth + 14 + i * (buttonWidth + buttonSpacing); // Adjust the x-coordinate to position the buttons
        const buttonY = optionStartY - 16;

        ctx.fillStyle = 'lightgray';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = 'black';
        ctx.font = '11px Arial'; // Set the font size
        ctx.fillText(options[i], buttonX + 14, buttonY + 15); // Adjust the text position within the button
    }
}
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


// Game loop
function gameLoop() {
//for multiplayer
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastUpdateTime;

    if (gameMode === 'game') {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the quality line
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, QUALITY_LINE_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial'; // Set the font size
        ctx.fillText(`Quality: ${vQuality}`, 7, 22);

        drawReviewButton();

        // Draw quality buttons
        const buttonStartX = canvas.width - (qualityButtons.length * (BUTTON_WIDTH + 7)) - 7;
        qualityButtons.forEach((button, index) => {
            const buttonX = buttonStartX + index * (BUTTON_WIDTH + 7);
            ctx.fillStyle = button.color;
            ctx.fillRect(buttonX, 5, BUTTON_WIDTH, BUTTON_HEIGHT);
            ctx.fillStyle = 'black';
            ctx.font = '11px Arial'; // Set the font size
            ctx.fillText(button.text, buttonX + BUTTON_PADDING, 5 + BUTTON_HEIGHT - BUTTON_PADDING);
        });

        // In the gameLoop function
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial'; // Set the font size
        ctx.fillText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`, 7, QUALITY_LINE_HEIGHT - 7);

        if (lastAttackedMonster && lastAttackedMonster.health > 0) {
            const enemyText = `Enemy: ${lastAttackedMonster.demonType} ${lastAttackedMonster.health}`;
            ctx.fillText(enemyText, ctx.measureText(`Health: ${player.health}  XP: ${player.xp}  Level: ${player.level}`).width + 14, QUALITY_LINE_HEIGHT - 7);
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

        // Move the player
        let targetX = mouseX - canvas.offsetLeft;
        let targetY = mouseY - canvas.offsetTop;
        let dx = targetX - player.x;
        let dy = targetY - player.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        const THRESHOLD_DISTANCE = 5; // Adjust this value as needed

        if (mouseY > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && player.y < canvas.height - ANSWER_SECTION_HEIGHT) {
            if (distance > THRESHOLD_DISTANCE) {
                player.x += (dx / distance) * PLAYER_SPEED;
                player.y += (dy / distance) * PLAYER_SPEED;
            }
        }


        // Move the monsters
    // Move the monsters
    monsters.forEach(monster => {
        if (monster.chaser) {
            // Check if the chasing duration has exceeded 30 seconds
            if (monster.chasingStartTime && Date.now() - monster.chasingStartTime > 30000) {
                monster.chaser = false;
                monster.chasingStartTime = null;
                monster.behaviorStartTime = Date.now(); // Reset the behavior start time
            } else {
                monster.move(player.x, player.y);
            }
        } else {
            // Check if the behavior duration has exceeded 30 seconds
            if (Date.now() - monster.behaviorStartTime > 30000) {
                if (gameState.gameLevel === 2 && Math.random() < 0.5) {
                    // Half the time, 3 monsters chase the player (if they exist)
                    const chasers = monsters.filter(m => !m.chaser).slice(0, 3);
                    chasers.forEach(chaser => {
                        chaser.chaser = true;
                        chaser.chasingStartTime = Date.now(); // Set the chasing start time
                        chaser.move(player.x, player.y);
                    });
                } else {
                    // The other half of the time, only 1 monster chases the player
                    const chaser = monsters.find(m => !m.chaser);
                    if (chaser) {
                        chaser.chaser = true;
                        chaser.chasingStartTime = Date.now(); // Set the chasing start time
                        chaser.move(player.x, player.y);
                    }
                }
                // Update the behavior start time for all monsters
                monsters.forEach(m => {
                    m.behaviorStartTime = Date.now();
                });
            } else {
                monster.randomWalk();
            }
        }
    });

        // Handle collisions and attacks
        const currentTime = Date.now();
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
                       const attackData = {
                          playerId: socket.id,
                          monsterId: monster.id,
                          damage: 2
                        };
                        socket.emit('playerAttack', attackData);
                    }
                    if (monster.health <= 0) {
                        // Remove the monster from the game
                        const monsterIndex = monsters.indexOf(monster);
                        monsters.splice(monsterIndex, 1);
                        player.xp += 10; // Add 10 XP to the player

                        updatePlayerLevel(player.xp); // Call the updatePlayerLevel function
                        if (monster.chaser) {
                            chaseTrigger = true;
                            // Trigger to create a new chasing monster
                        }
                        //sound effect
                        demonDies.play();
                        // Clear the monster's health display timeout
                        clearTimeout(monster.showHealthTimeout);

                        if (monsters.length === spawnsLeft) {
                            monsters.forEach(demon => {
                                demon.chaser = true;
                            });
                        }



                    } else {
                        // Store the last attacked monster
                        lastAttackedMonster = monster;
                    }
                    // Calculate random damage between 0 and the monster's maximum damage
                    const damage = Math.floor(Math.random() * (monster.maxDamage + 1) * gameState.gameLevel);
                    player.health -= damage; // Monster attacks the player

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
        //Display level completed message if true
        if (levelCompleted) {
            ctx.fillStyle = 'green';
            ctx.font = '29px Arial'; // Set the font size
            ctx.fillText('Level completed.', canvas.width / 2 - 140, canvas.height / 2);
        }
        // Check if the level is completed
        if (monsters.length === 0 && spawnsLeft === 0 && !levelCompleted) {
            console.log("Finished level");
            ctx.fillStyle = 'green';
            ctx.font = '29px Arial'; // Set the font size
            ctx.fillText('Level completed.', canvas.width / 2 - 140, canvas.height / 2);
            levelCompleted = true; // Set the flag to indicate that the level is completed
            // Emit the levelCompleted event to the server
            socket.emit('levelCompleted');
            setTimeout(() => {
                levelCompleted = false; // Reset the flag for the next level
                setLevelData();
            }, 10000);
        }

        healingPoints.forEach((healingPoint, index) => {
            let dx = healingPoint.x - player.x;
            let dy = healingPoint.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.width / 2 + healingPoint.width / 2 && player.y > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && player.y < canvas.height - ANSWER_SECTION_HEIGHT) {
                // Heal the player
                player.health = Math.min(player.health + 10, player.maxHealth);
                healingRecharge.play(); // Play the attack sound effect
                // Remove the healing point from the game
                healingPoints.splice(index, 1);
                // Spawn a new healing point
                spawnHealingPoint(healingPointImg);
            }
        });

        // Draw the game objects
        if (player && playerImg && player.width && player.height && player.y > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && player.y < canvas.height - ANSWER_SECTION_HEIGHT) {
            drawPlayer();
        }

        explosionTimer += EXPLOSION_INTERVAL;


        monsters.forEach(monster => {
            if (monster.y > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && monster.y < canvas.height - ANSWER_SECTION_HEIGHT) {
                drawMonster(monster, explosionTimer);
            }
        });


        healingPoints.forEach(healingPoint => {
            if (healingPoint.y > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && healingPoint.y < canvas.height - ANSWER_SECTION_HEIGHT) {
                drawHealingPoint(healingPoint);
            }
        });

        // Display the Bible verse and request the next animation frame
        displayBibleVerse(gappedVerse, organizedVerses[vQuality][currentVerseIndex].Reference);
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

        socket.emit('updatePlayerData', playerData);
        lastUpdateTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
} //end gameLoop

function updateGameState(gameState) {
    const playerState = gameState.players[socket.id];
    const currentTime = Date.now();
  
    // Update player
    const playerElapsedTime = currentTime - playerState.lastUpdateTime;
    const playerLerpFactor = playerElapsedTime / UPDATE_INTERVAL;
  
    player.x = lerp(player.x, playerState.x, playerLerpFactor);
    player.y = lerp(player.y, playerState.y, playerLerpFactor);
    player.health = playerState.health;
    // Update other player properties as needed
  
    // Update monsters
    monsters = gameState.monsters.map((monsterState) => {
      const monsterElapsedTime = currentTime - monsterState.lastUpdateTime;
      const monsterLerpFactor = monsterElapsedTime / UPDATE_INTERVAL;
  
      return {
        x: lerp(monsterState.x, monsterState.x, monsterLerpFactor),
        y: lerp(monsterState.y, monsterState.y, monsterLerpFactor),
        health: monsterState.health,
        width: monsterState.width,
        height: monsterState.height,
        demonType: monsterState.demonType,
        maxDamage: monsterState.maxDamage,
        chaser: monsterState.chaser,
        chasingStartTime: monsterState.chasingStartTime,
        behaviorStartTime: monsterState.behaviorStartTime,
        showHealth: monsterState.showHealth,
        showHealthTimeout: monsterState.showHealthTimeout,
        isAttacked: monsterState.isAttacked,
        healthBar: {
          x: 0,
          y: 0,
          width: 0,
          height: 7,
          color: 'green'
        },
        move: function(playerX, playerY) {
          // Move towards the player
          let dx = playerX - this.x;
          let dy = playerY - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          this.x += (dx / distance) * MONSTER_SPEED;
          this.y += (dy / distance) * MONSTER_SPEED;
        },
        randomWalk: function() {
            // Move in a random direction for a random distance
            // ... (existing randomWalk logic)
          }
        }
    });
  
    // Update healing points
    healingPoints = gameState.healingPoints.map((healingPointState) => {
      const healingPointElapsedTime = currentTime - healingPointState.lastUpdateTime;
      const healingPointLerpFactor = healingPointElapsedTime / UPDATE_INTERVAL;
  
      return {
        x: lerp(healingPointState.x, healingPointState.x, healingPointLerpFactor),
        y: lerp(healingPointState.y, healingPointState.y, healingPointLerpFactor)
        // Update other healing point properties as needed
      };
    });
  
    // Update other game data as needed
}
  
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Handle other game events (e.g., player attacks)
function handlePlayerAttack() {
    const attackData = {
      playerId: socket.id,
      targetMonsterId: lastAttackedMonster.id,
      damage: 10 // Example damage value
    };
  
    socket.emit('playerAttack', attackData);
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



// Spawn a healing point
function spawnHealingPoint(healingPointImg) {
    if (healingPoints.length < MAX_HEALING_POINTS) {
        let x, y;
        do {
            x = Math.random() * (canvas.width - healingPointImg.width);
            y = Math.random() * (canvas.height - healingPointImg.height - ANSWER_SECTION_HEIGHT - QUALITY_LINE_HEIGHT - BUTTON_HEIGHT - 14) + QUALITY_LINE_HEIGHT + BUTTON_HEIGHT;
        } while (isOverlapping(x, y, healingPointImg.width, healingPointImg.height));

        healingPoints.push({
            x: x,
            y: y,
            width: healingPointImg.width,
            height: healingPointImg.height
        });
        console.log("Healing point spawned");
    }
}

// Spawn healing points randomly
function spawnHealingPoints() {
    // Spawn healing points at random positions
    if (Math.random() < 0.01 && healingPoints.length < MAX_HEALING_POINTS) { // 1% chance of spawning a healing point
        spawnHealingPoint(healingPointImg);
    }
}

// Check if a new object overlaps with existing objects
function isOverlapping(x, y, width, height) {
    // Check overlap with player
    if (!player) return false;
    if (
        x + width / 2 > player.x - player.width / 2 &&
        x - width / 2 < player.x + player.width / 2 &&
        y + height / 2 > player.y - player.height / 2 &&
        y - height / 2 < player.y + player.height / 2
    ) {
        return true;
    }

    // Check overlap with monsters
    for (let monster of monsters) {
        if (
            x + width / 2 > monster.x - monster.width / 2 &&
            x - width / 2 < monster.x + monster.width / 2 &&
            y + height / 2 > monster.y - monster.height / 2 &&
            y - height / 2 < monster.y + monster.height / 2
        ) {
            return true;
        }
    }

    // Check overlap with healing points
    for (let healingPoint of healingPoints) {
        if (
            x + width / 2 > healingPoint.x - healingPoint.width / 2 &&
            x - width / 2 < healingPoint.x + healingPoint.width / 2 &&
            y + height / 2 > healingPoint.y - healingPoint.height / 2 &&
            y - height / 2 < healingPoint.y + healingPoint.height / 2
        ) {
            return true;
        }
    }

    return false;
}

// Handle mouse click
function handleMouseClick(event) {
    //const clickedX = event.clientX;
    //const clickedY = event.clientY;
    if (gameMode == 'game') {
        const rect = canvas.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        const clickedY = event.clientY - rect.top;

        // Check if the click was on a quality button
        qualityButtons.forEach(button => {
            if (
                clickedX >= button.x &&
                clickedX <= button.x + BUTTON_WIDTH &&
                clickedY >= button.y &&
                clickedY <= button.y + BUTTON_HEIGHT
            ) {
                vQuality = button.text;
                //pickRandomVerse();
                //qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
                pickQualityVerse();
            } else {
                // Update mouseX and mouseY only if the click was not on a button and the click was below the quality line, buttons, and above the bottom 17 pixels - 14 (half player height)
                if (clickedY > QUALITY_LINE_HEIGHT + BUTTON_HEIGHT && clickedY < canvas.height - ANSWER_SECTION_HEIGHT - 14) {
                    mouseX = clickedX;
                    mouseY = clickedY;
                }
            }
        });
        /*
        // Check if the click was on a multiple-choice button
        const optionStartX = 7;
        const optionStartY = canvas.height - ANSWER_SECTION_HEIGHT;
        const buttonWidth = 35;
        const buttonHeight = 21;
        const buttonSpacing = 7;
        for (let i = 0; i < mcOptions.length; i++) {
        const buttonX = optionStartX + 154 + i * (buttonWidth + buttonSpacing);
        const buttonY = optionStartY;

        if (
        clickedX >= buttonX &&
        clickedX <= buttonX + buttonWidth &&
        clickedY >= buttonY &&
        clickedY <= buttonY + buttonHeight
        ) {
        const selectedOption = mcOptions[i];
        if (selectedOption.toLowerCase() === firstLetters.toLowerCase()) {
        isAnswerCorrect = true;
        setAnswerResultTimeout(5000); // Show the correct answer for 5 seconds
        } else {
        isAnswerCorrect = false;
        setAnswerResultTimeout(10000); // Show the incorrect answer for 10 seconds

        // Add the reference to the incorrectAnswerReferences array if it's not already present
        const currentReference = organizedVerses[vQuality][currentVerseIndex].Reference;
        if (!incorrectAnswerReferences.includes(currentReference)) {
        incorrectAnswerReferences.push(currentReference);
        }
        }
        }
        }
        }
        */
        // Check if the click was on a multiple-choice button
        const optionStartX = 7;
        const optionStartY = canvas.height - ANSWER_SECTION_HEIGHT - 10;
        const buttonWidth = 49; // Adjust the button width to accommodate 2 letters
        const buttonHeight = 21;
        const buttonSpacing = 7;

        const textWidth = ctx.measureText('First letters of missing words are:').width;
        for (let i = 0; i < mcOptions.length; i++) {
            const buttonX = optionStartX + textWidth + 14 + i * (buttonWidth + buttonSpacing);
            const buttonY = optionStartY;

            if (
                clickedX >= buttonX &&
                clickedX <= buttonX + buttonWidth &&
                clickedY >= buttonY &&
                clickedY <= buttonY + buttonHeight
            ) {
                const selectedOption = mcOptions[i];
                if (selectedOption === firstLetters) {
                    isAnswerCorrect = true;
                    // go to the next one in the list
                    qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
                    qualityTotal[vQuality] = qualityTotal[vQuality] + 1; // add 1 to the verses correct for that quality
                    console.log(vQuality + " total correct is: " + qualityTotal[vQuality] );
                    setAnswerResultTimeout(5000); // Show the correct answer for 5 seconds
                } else {
                    isAnswerCorrect = false;
                    qualityIndex[vQuality] = (qualityIndex[vQuality] + 1) % organizedVerses[vQuality].length;
                    setAnswerResultTimeout(10000); // Show the incorrect answer for 10 seconds

                    // Add the reference to the incorrectAnswerReferences array if it's not already present
                    const currentReference = organizedVerses[vQuality][currentVerseIndex].Reference;
                    if (!incorrectAnswerReferences.includes(currentReference)) {
                        incorrectAnswerReferences.push(currentReference);
                    }
                }
            }
        }

        // Check if the click was on the review button
        //console.log("Checking review button" + clickedX + ' ' + clickedY);

        // Check if the click was on the review button
        const reviewButtonWidth = 60;
        const reviewButtonHeight = 13;
        const reviewButtonX = canvas.width - reviewButtonWidth - 20;
        const reviewButtonY = 29;


        if (
            clickedX >= reviewButtonX &&
            clickedX <= reviewButtonX + reviewButtonWidth &&
            clickedY >= reviewButtonY &&
            clickedY <= reviewButtonY + reviewButtonHeight
        ) {
            //console.log("Review Button Clicked");
            saveGameState();
            startReviewMode();
        }
    } else if (gameMode === 'review') {
        handleReviewClick(event);
    }

}



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

function drawPlayer() {
    if (!player || !playerImg) return;

    ctx.drawImage(playerImg, player.x - player.width / 2, player.y - player.height / 2);

    // Draw the player's health bar
    const healthBarWidth = (player.health / player.maxHealth) * 40;
    player.healthBar.x = player.x - 15;
    player.healthBar.y = player.y - player.height / 2 - 14;
    player.healthBar.width = healthBarWidth;

    // Change the health bar color to red if health is less than 20% of max health
    if (player.health < player.maxHealth * 0.2) {
        player.healthBar.color = 'red';
    } else {
        player.healthBar.color = 'green';
    }

    ctx.fillStyle = player.healthBar.color;
    ctx.fillRect(player.healthBar.x, player.healthBar.y, player.healthBar.width, player.healthBar.height);
}

function drawMonster(monster, explosionTimer) {
    const demonType = monster.demonType;
    const demonImage = demonImages[demonType];

    if (demonImage) {
        ctx.drawImage(demonImage, monster.x - monster.width / 2, monster.y - monster.height / 2);
    } else {
        console.warn(`Demon image for type '${demonType}' not loaded or not found.`);
    }

    if (monster.isAttacked && Math.floor(explosionTimer / EXPLOSION_INTERVAL) % 2 === 0) {
        // Draw the explosion asset over the top of the demon when isAttacked is true and the timer is in the "on" state
        ctx.drawImage(explosionImg, monster.x - explosionImg.width / 2, monster.y - explosionImg.height / 2);
    }

    // Draw the health bar
    const healthBarWidth = (monster.health / 10) * monster.width; // Adjust the health bar width based on the monster's health
    monster.healthBar.x = monster.x - monster.width / 2; // Position the health bar above the monster sprite
    monster.healthBar.y = monster.y - monster.height / 2 - 10; // Adjust the vertical position of the health bar
    monster.healthBar.width = healthBarWidth;

    ctx.fillStyle = monster.healthBar.color;
    ctx.fillRect(monster.healthBar.x, monster.healthBar.y, monster.healthBar.width, monster.healthBar.height);

    if (monster.showHealth) {
        ctx.font = '11px Arial'; // Set the font size
        ctx.fillStyle = 'black';
        ctx.fillText(`${monster.health}`, monster.x, monster.y - 14);
    }


}

function drawHealingPoint(healingPoint) {
    if (healingPointImg) {
        ctx.drawImage(healingPointImg, healingPoint.x - healingPoint.width / 2, healingPoint.y - healingPoint.height / 2);
    }
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

var convertRef = function(Reference) {
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




// Start the game

init();