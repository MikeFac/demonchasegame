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

// Movement freeze during level transitions (prevents spawning into walls)
let movementFrozen = false;
let levelTransitionStartTime = 0;
const MAX_TRANSITION_FREEZE_MS = 10000; // Safety timeout: 10 seconds max freeze

let isGameLoaded = false;

// [WallSpawn] Periodic wall-collision diagnostic (check every ~1s, not every frame)
let _wallSpawnCheckTimer = 0;

// Solo game difficulty selection
let soloDifficulty = 'normal';

function setSoloDifficulty(preset) {
    window.soloDifficulty = preset;
    document.querySelectorAll('.solo-difficulty-btn').forEach(btn => {
        if (btn.dataset.preset === preset) {
            btn.classList.add('active');
            btn.style.background = 'rgba(100,150,255,0.3)';
            btn.style.borderColor = 'rgba(100,150,255,0.5)';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }
    });
}

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

        // Track mouse position for tooltips and hover effects
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });

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
    healthBar: {},
    // Animation properties
    isMoving: false,           // Movement state flag
    currentFrame: 0,           // Current animation frame (0 or 1)
    frameTimer: 0,             // Time accumulator for frame changes (ms)
    facingDirection: 'right'   // 'left' or 'right' (based on movement dx)
};

// Game variables
let ctx, monsters, healingPoints, chaseTrigger, lastAttackedMonster;
let playerImg, otherPlayerImg, healingPointImg, demonImages, explosionImg;
let buildingTilesImg, terrainTilesImg; // Tile sprite sheets (8x8 grids, 32x32 tiles)

// Tint colors per player number (player 1 keeps original blue)
const PLAYER_TINTS = {
    1: null,              // Original (blue) — no tint
    2: '#ff4444',         // Red
    3: '#44ff44',         // Green
    4: '#ffdd44'          // Gold
};
const OTHER_PLAYER_TINT = '#999999'; // Grey

/**
 * Create a tinted copy of a sprite sheet on an offscreen canvas.
 * Uses source-atop to color only non-transparent pixels.
 */
function createTintedSprite(baseImage, tintColor) {
    const offscreen = document.createElement('canvas');
    offscreen.width = baseImage.width;
    offscreen.height = baseImage.height;
    const offCtx = offscreen.getContext('2d');

    // Draw original sprite
    offCtx.drawImage(baseImage, 0, 0);

    // Overlay tint color onto existing pixels only
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.globalAlpha = 0.5;
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    return offscreen;
}
let PLAYER_SPEED = 5;
let MONSTER_SPEED = 1; // Slower monster speed
let gameSpeedMultiplier = 1.0; // Controlled by server (0.5 = slow, 1.0 = normal, 1.3 = fast)


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

// Armor of God inventory & buffs
let inventory = { sword: 0, belt: 0, helmet: 0, breastplate: 0, sandals: 0, shield: 0 };
let activeBuffs = {
    sword: { active: false, endTime: 0 },
    shield: { active: false, endTime: 0 },
    breastplate: { active: false, endTime: 0 },
    sandals: { active: false, endTime: 0 }
};
let collectibles = [];
let inventoryOpen = false;
let shieldImg = null;

// Collectible display names and colors
const COLLECTIBLE_NAMES = {
    sword: 'Sword of the Spirit', belt: 'Belt of Truth', helmet: 'Helmet of Salvation',
    breastplate: 'Breastplate of Righteousness', sandals: 'Sandals of Peace', shield: 'Shield of Faith'
};
const COLLECTIBLE_COLORS = {
    sword: '#FFD700', belt: '#DAA520', helmet: '#C0C0C0',
    breastplate: '#CD7F32', sandals: '#87CEEB', shield: '#FFD700'
};

// Menu state
let menuOpen = false;

// Multiplayer state
let isSoloGame = true; // Updated from server gameConfig

// Verse Test shield setting (Option A/B)
let verseTestShielded = localStorage.getItem('verseTestShielded') === 'true';
let verseTestShieldActive = false;

// Goals overlay state
let goalsOverlayVisible = false;

// Flash messages for achievements
let flashMessages = [];  // Array of { text, color, startTime, duration }

// Particle effects
let particleBurstImg = null;
let deathParticles = []; // Array of active death particle animations

// for monster explosion
let explosionTimer = 0;
const EXPLOSION_INTERVAL = 100; // Adjust the interval as needed

// Visual effects - screen shake and damage numbers
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let damageNumbers = [];  // Array of {x, y, damage, startTime, duration: 1000}

const DEMON_TYPES = {
    Fear: `${scriptDirectory}/images/monsters/fear_demon.png`,
    Condemnation: `${scriptDirectory}/images/monsters/condemnation_demon.png`,
    Unbelief: `${scriptDirectory}/images/monsters/unbelief_demon.png`,
    Ignorance: `${scriptDirectory}/images/monsters/ignorance_spirit.png`,
    Depression: `${scriptDirectory}/images/monsters/depression_spirit.png`,
    Strife: `${scriptDirectory}/images/monsters/strife_spirit.png`,
    Confusion: `${scriptDirectory}/images/monsters/confusion_spirit.png`,
    Infirmity: `${scriptDirectory}/images/monsters/infirmity_spirit.png`,
    Doubt: `${scriptDirectory}/images/monsters/doubt_spirit.png`,
    Deception: `${scriptDirectory}/images/monsters/DECEPTION_SPIRIT1.png`,
    Despair: `${scriptDirectory}/images/monsters/DISCOURAGEMENT.png`,
    Pride: `${scriptDirectory}/images/monsters/PRIDE.png`,
    Temptation: `${scriptDirectory}/images/monsters/JEZEBEL.png`,
    Poverty: `${scriptDirectory}/images/monsters/DEMON-OF-POVERTY.png`,
    Shame: `${scriptDirectory}/images/monsters/SHAME-ACCUSATION.png`,
    Blindness: `${scriptDirectory}/images/monsters/SPIRITUALBLINDNESS.png`,
    Swarm: `${scriptDirectory}/images/monsters/DEMON-SWARM.png`
};

const levelXPRequirements = LevelConfig.levelXPRequirements;

// Audio assets - New sound effects
const bulletImpact = new Audio(`${scriptDirectory}/sounds/bullet_impact.mp3`);
const monsterExplosion = new Audio(`${scriptDirectory}/sounds/monster_explosion.mp3`);
const levelUpSound = new Audio(`${scriptDirectory}/sounds/level_up.mp3`);
const playerHit = new Audio(`${scriptDirectory}/sounds/player_attacked.mp3`);
const attackSound = new Audio(`${scriptDirectory}/sounds/monster_attacked.mp3`);

// Legacy sounds (keeping preferred old ones)
const healingRecharge = new Audio(`${scriptDirectory}/sounds/healing_recharge.mp3`);
const demonDies = monsterExplosion; // Using new explosion sound
const gameOver = new Audio(`${scriptDirectory}/sounds/game_over.mp3`);

let currentVerseIndex = null; // Index of the currently displayed verse
let verseTimer = null; // Timer for displaying the next verse
let incorrectAnswerReferences = [];
let currentReviewMode = 'quality'; // Possible values: 'incorrect', 'quality'

// Daily Challenge State
let dailyChallengeGoal = 5;  // Answer 5 first-letter quizzes correctly
let dailyChallengeProgress = 0;
let dailyChallengeCompleted = false;

// Verse Learning Tracker (only first_letter mode)
let versesLearned = 0;  // Total verses learned via 2-letter challenge
const TOTAL_VERSES = 1618;  // Total verses in bible-verses.js

// Game-Over Modal State
let gameOverModalVisible = false;
let sessionStartTime = null;  // Set when game starts
let finalStats = {
    level: 1,
    monstersKilled: 0,
    versesLearned: 0,
    timePlayed: 0  // seconds
};
let restartButtonRect = { x: 0, y: 0, width: 0, height: 0 };

// Onboarding tips tracking - shown only once per game session
let firstGameTips = {
    demonAppeared: false,
    healingCollected: false,
    ammoEarned: false,
    monsterKilled: false,
    firstCorrectAnswer: false,
    firstKill: false
};
let modalPaused = false;
let modalPauseStartTime = 0;
const MODAL_DISPLAY_TIME = 3500; // 3.5 seconds
const ONBOARDING_DURATION = 5 * 60 * 1000; // 5 minutes in ms

// Helper function to load an image (if you don't already have this)
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

// ===== ONBOARDING TIPS SYSTEM =====

/**
 * Show onboarding modal (pauses game)
 * @param {string} title - Modal title
 * @param {string} text - Modal text
 */
function showOnboardingModal(title, text) {
    const modal = document.getElementById('onboardingModal');
    const titleEl = document.getElementById('onboardingModalTitle');
    const textEl = document.getElementById('onboardingModalText');

    if (modal && titleEl && textEl) {
        titleEl.textContent = title;
        textEl.textContent = text;
        modal.classList.add('visible');
        modalPaused = true;
        modalPauseStartTime = Date.now();
    }
}

/**
 * Hide onboarding modal (resumes game)
 */
function hideOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.classList.remove('visible');
        modalPaused = false;
        modalPauseStartTime = 0;
    }
}

/**
 * Show toast notification at bottom of screen
 * @param {string} message - Toast message (supports emoji)
 * @param {number} duration - Duration in ms (default 3500)
 */
function showToast(message, duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Check if player is in onboarding window (level 1, within 5 min)
 */
function isInOnboardingWindow() {
    if (player.level > 1) return false;
    if (!sessionStartTime) return true; // If session time not set, assume we're in onboarding
    const elapsed = Date.now() - sessionStartTime;
    return elapsed < ONBOARDING_DURATION;
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
            // Get solo game settings (difficulty + quiz balance + speed)
            const soloDifficulty = window.soloDifficulty || 'normal';
            const gameSpeed = window.selectedGameSpeed || 'normal';
            const mapStyle = document.getElementById('mapStyleSelect') ? document.getElementById('mapStyleSelect').value : 'classic';
            const quizSettings = getQuizSettingsFromSliders();
            network.sendStartSoloGame(soloDifficulty, quizSettings, gameSpeed, mapStyle);
        } else if (mode === 'join' && roomId) {
            network.sendJoinGame(roomId);
        }
        gameLoop();
    }).catch((error) => {
        console.error('Error initializing game:', error);
    });
}

// Get quiz settings from sliders (for solo game)
function getQuizSettingsFromSliders() {
    const settings = {};
    const sliders = document.querySelectorAll('#quizSliders input[type="range"]');
    sliders.forEach(slider => {
        settings[slider.dataset.mode] = parseInt(slider.value, 10);
    });
    return settings;
}

// Launch verse test with rewards on completion
function launchVerseTest(text, ref, difficulty) {
    if (VerseTestScreen.isActive()) return;

    // Activate test shield if setting is ON
    if (verseTestShielded) {
        verseTestShieldActive = true;
    }

    VerseTestScreen.startTest(text, ref, difficulty, function (passed) {
        // Always deactivate test shield
        verseTestShieldActive = false;

        if (passed) {
            // Enable shooting (same as answering a quiz correctly)
            isAnswerCorrect = true;

            // Award ammo
            player.ammo = (player.ammo || 0) + Constants.VERSE_TEST_AMMO_REWARD;

            // Award health (capped at max)
            player.health = Math.min(player.health + Constants.VERSE_TEST_HEALTH_REWARD, player.maxHealth);

            // Award XP via server
            network.sendQuizCorrect();

            // Flash message
            flashMessages.push({
                text: `Verse Test Passed! +${Constants.VERSE_TEST_AMMO_REWARD} Spirit +${Constants.VERSE_TEST_HEALTH_REWARD} HP`,
                color: '#44ff44',
                startTime: Date.now(),
                duration: 2500
            });
        } else {
            console.log('Verse test failed — no penalty');
        }
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


// Initialize Daily Challenge (resets daily at midnight)
function initializeDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];  // "2026-02-10"
    const lastPlayed = localStorage.getItem('dailyChallengeDate');

    if (lastPlayed !== today) {
        // New day - reset challenge
        localStorage.setItem('dailyChallengeDate', today);
        localStorage.setItem('dailyChallengeProgress', '0');
        localStorage.setItem('dailyChallengeCompleted', 'false');
    }

    // Load today's progress
    dailyChallengeProgress = parseInt(localStorage.getItem('dailyChallengeProgress') || '0');
    dailyChallengeCompleted = localStorage.getItem('dailyChallengeCompleted') === 'true';
    console.log(`Daily Challenge: ${dailyChallengeProgress}/${dailyChallengeGoal} (Completed: ${dailyChallengeCompleted})`);
}

// Initialize Verse Counter (persists forever)
function initializeVerseCounter() {
    versesLearned = parseInt(localStorage.getItem('versesLearned') || '0');
    console.log(`Verses Learned: ${versesLearned}/${TOTAL_VERSES}`);
}

// Callback for QuizManager to notify of correct answers
window.onQuizCorrectAnswer = function (quizMode, verseReference) {
    // ===== SOUND: Play ding on correct answer =====
    if (window.SoundEffects) {
        SoundEffects.playDing();
    }

    // ===== FIRST 60 SECONDS: Show "POWERED UP!" on first correct answer =====
    if (!firstGameTips.firstCorrectAnswer && isInOnboardingWindow()) {
        firstGameTips.firstCorrectAnswer = true;
        // Show big centered message
        flashMessages.push({
            text: '⚡ POWERED UP! ⚡',
            color: '#FFD700',
            x: canvas.width / 2,
            y: canvas.height / 2 - 50,
            startTime: Date.now(),
            duration: 2000,
            fontSize: 32,
            centered: true
        });
    }

    // ===== ONBOARDING: Detect first ammo earned =====
    if (!firstGameTips.ammoEarned && isInOnboardingWindow()) {
        firstGameTips.ammoEarned = true;
        showToast('💡 Earn ammo by answering quizzes correctly');
    }

    // Track daily challenge progress (only first_letter mode)
    if (quizMode === 'first_letter') {
        if (!dailyChallengeCompleted && dailyChallengeProgress < dailyChallengeGoal) {
            dailyChallengeProgress++;
            localStorage.setItem('dailyChallengeProgress', dailyChallengeProgress.toString());

            // Flash: daily progress
            flashMessages.push({
                text: `Daily: ${dailyChallengeProgress}/${dailyChallengeGoal}`,
                color: '#ffffff',
                startTime: Date.now(),
                duration: 1500
            });

            if (dailyChallengeProgress >= dailyChallengeGoal) {
                dailyChallengeCompleted = true;
                localStorage.setItem('dailyChallengeCompleted', 'true');

                // Bonus reward: +20 XP
                if (player) {
                    player.xp += 20;
                }

                // Flash: daily completed
                flashMessages.push({
                    text: 'Daily Challenge Complete! +20 XP',
                    color: '#00ff00',
                    startTime: Date.now(),
                    duration: 3000
                });

                // Fanfare sound
                levelUpSound.play();
                console.log("Daily challenge completed! Bonus +20 XP");
            }
        }

        // Track unique verses learned (only first_letter mode counts)
        const verseKey = `learned_${verseReference.replace(/\s+/g, '_')}`;
        if (!localStorage.getItem(verseKey)) {
            localStorage.setItem(verseKey, 'true');
            versesLearned++;
            localStorage.setItem('versesLearned', versesLearned.toString());

            // Flash: new verse learned
            flashMessages.push({
                text: `New verse learned! (${versesLearned}/${TOTAL_VERSES})`,
                color: '#ffcc00',
                startTime: Date.now(),
                duration: 2000
            });
            console.log(`Verse learned! Total: ${versesLearned}/${TOTAL_VERSES}`);
        }
    }
};

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
                        ammo: 0 // Must earn ammo by answering quizzes correctly
                    };
                    gameState.players[playerCode] = player;
                } else {
                    console.log('New player joined with code:', code);
                }
            },
            onPlayerNumber: (playerNumber) => {
                console.log(`Received player number: ${playerNumber}`);
                // Always load player1 sprite sheet, then tint for other players
                const baseImg = new Image();
                baseImg.src = `${scriptDirectory}/player1-sprite96.png`;
                baseImg.onload = function () {
                    const spriteNumber = ((playerNumber - 1) % 4) + 1;
                    const tint = PLAYER_TINTS[spriteNumber];
                    playerImg = tint ? createTintedSprite(baseImg, tint) : baseImg;
                    player.width = 48;
                    player.height = 48;
                    console.log(`Player ${playerNumber} sprite ready (tint: ${tint || 'none'})`);
                };
                baseImg.onerror = function () {
                    console.error('Failed to load player sprite sheet');
                };
            },
            onMonsterKilled: ({ monsterId, x, y }) => {
                // ===== FIRST 60 SECONDS: Show "FIRST BLOOD!" on first kill =====
                if (!firstGameTips.firstKill && isInOnboardingWindow()) {
                    firstGameTips.firstKill = true;
                    // Epic first kill sound
                    if (window.SoundEffects) {
                        SoundEffects.playFirstKill();
                    }
                    // Epic first kill message
                    flashMessages.push({
                        text: '🔥 FIRST BLOOD! 🔥',
                        color: '#FF4444',
                        x: canvas.width / 2,
                        y: canvas.height / 2 - 50,
                        startTime: Date.now(),
                        duration: 2500,
                        fontSize: 36,
                        centered: true
                    });
                    // Extra screen shake for first kill
                    screenShake = { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 };
                    setTimeout(() => { screenShake = { x: 0, y: 0 }; }, 300);
                }

                // ===== ONBOARDING: Detect first monster killed =====
                if (!firstGameTips.monsterKilled && isInOnboardingWindow()) {
                    firstGameTips.monsterKilled = true;
                    showToast('💡 Killing demons earns XP and increases your level');
                }

                demonDies.play();
                console.log(`Monster ${monsterId} was killed at (${x}, ${y})`);

                // Spawn death particle animation
                if (particleBurstImg && particleBurstImg.complete) {
                    deathParticles.push({
                        x: x,
                        y: y,
                        frame: 0,
                        frameTimer: 0,
                        startTime: Date.now()
                    });
                    console.log(`✨ Spawned death particle at (${x}, ${y}), total active: ${deathParticles.length}`);
                } else {
                    console.warn('Particle burst image not loaded yet');
                }

                // Clear enemy HUD if this was the monster we were tracking
                if (lastAttackedMonster && lastAttackedMonster.id === monsterId) {
                    lastAttackedMonster = null;
                }
            },
            onBulletHit: ({ x, y }) => {
                // Play bullet impact sound
                bulletImpact.play();
            },
            onArmorAbsorb: ({ monsterId, armorLeft }) => {
                // Find monster and show armor absorb visual
                const monster = monsters.find(m => m.id === monsterId);
                if (monster) {
                    damageNumbers.push({
                        x: monster.x,
                        y: monster.y - 20,
                        damage: 'BLOCKED',
                        color: '#FFD700',
                        startTime: Date.now(),
                        duration: 800
                    });
                }
            },
            onMonsterDrop: (data) => {
                if (data.killer === playerCode) {
                    const name = COLLECTIBLE_NAMES[data.type] || data.type;
                    const color = COLLECTIBLE_COLORS[data.type] || '#ffffff';
                    flashMessages.push({
                        text: `Monster dropped: ${name}!`,
                        color: color,
                        startTime: Date.now(),
                        duration: 2500
                    });
                    console.log(`Monster dropped ${data.type} at (${data.x}, ${data.y})`);
                }
            },
            // Multiplayer lifecycle notifications
            onPlayerDied: (data) => {
                if (data.playerCode === playerCode) {
                    flashMessages.push({ text: 'You died! You are now a ghost.', color: '#ff6666', startTime: Date.now(), duration: 4000 });
                    gameOver.play();
                } else {
                    flashMessages.push({ text: `${data.username} has died!`, color: '#ff4444', startTime: Date.now(), duration: 3000 });
                }
            },
            onPlayerJoinedGame: (data) => {
                if (data.code !== playerCode) {
                    flashMessages.push({ text: `${data.username} joined!`, color: '#44ff44', startTime: Date.now(), duration: 3000 });
                }
            },
            onPlayerLeftGame: (data) => {
                flashMessages.push({ text: `${data.username} left the game`, color: '#888888', startTime: Date.now(), duration: 3000 });
            },
            onPlayerDisconnected: (data) => {
                if (data.code !== playerCode) {
                    flashMessages.push({ text: `${data.username} disconnected`, color: '#ffaa00', startTime: Date.now(), duration: 3000 });
                }
            },
            onPlayerReconnected: (data) => {
                flashMessages.push({ text: `${data.username} reconnected!`, color: '#44ff44', startTime: Date.now(), duration: 3000 });
            },
            onGameEnded: (data) => {
                gameOverFlag = true;
                gameOverModalVisible = true;
                const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
                finalStats = {
                    result: data.result,
                    level: data.level,
                    monstersKilled: data.monstersKilled,
                    playerStats: data.playerStats,
                    versesLearned: versesLearned,
                    timePlayed: sessionDuration
                };
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
                    const oldX = player.x, oldY = player.y;
                    player.x = data.spawnX;
                    player.y = data.spawnY;
                    const spawnCollides = clientWallGrid.collides(player.x, player.y, player.width, player.height);
                    console.log(`[WallSpawn] onWalls: moved player from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to spawn (${player.x}, ${player.y}) wallCollides=${spawnCollides} w=${player.width} h=${player.height}`);
                    if (spawnCollides) {
                        console.error(`[WallSpawn] BUG: Server sent spawn point that collides with walls!`);
                    }
                }

                // Unfreeze movement now that we have the new maze data
                if (movementFrozen) {
                    movementFrozen = false;
                    console.log('[WallSpawn] Movement unfrozen - walls received');
                }

                console.log('Received walls:', clientWalls.length, 'tiles');
            },
            onLevelAdvancing: (data) => {
                console.log('Level advancing! Countdown:', data.countdown);
                levelCompleted = true;
                levelAdvanceCountdown = data.countdown;

                // ===== SHARE BUTTON: Show after completing level 1 =====
                if (gameState.gameLevel === 1 && !localStorage.getItem('hasShared')) {
                    setTimeout(() => {
                        const kills = gameState.monstersKilled || 0;
                        const shareText = `I just defeated ${kills} demons while learning Bible verses! Play Demon Chase: ${window.location.origin}`;

                        if (navigator.share) {
                            // Mobile share API
                            navigator.share({
                                title: 'Demon Chase Game',
                                text: shareText,
                                url: window.location.origin
                            }).then(() => {
                                localStorage.setItem('hasShared', 'true');
                                showToast('✅ Thanks for sharing!', 2000);
                            }).catch(() => {
                                // User cancelled, no action needed
                            });
                        } else {
                            // Desktop: Copy to clipboard
                            navigator.clipboard.writeText(shareText).then(() => {
                                localStorage.setItem('hasShared', 'true');
                                showToast('📋 Share text copied to clipboard!', 3000);
                            });
                        }
                    }, 2000); // Show share prompt 2s after level complete
                }

                // Freeze movement during level transition to prevent spawning into walls
                // Will be unfrozen when 'walls' event is received
                movementFrozen = true;
                levelTransitionStartTime = Date.now();
                console.log('Movement frozen during level transition');

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
            },
            onGameConfig: (config) => {
                console.log('Received game config from server:', config);
                // Track solo vs multiplayer
                if (config.isSoloGame !== undefined) {
                    isSoloGame = config.isSoloGame;
                }
                // Override local quiz settings with server-authoritative values
                if (config.quizSettings) {
                    quizSettings = config.quizSettings;
                    // Update in-game slider display to match server settings
                    const sliders = document.querySelectorAll('#quizSliders input[type="range"]');
                    sliders.forEach(function (slider) {
                        const mode = slider.dataset.mode;
                        if (config.quizSettings[mode] !== undefined) {
                            slider.value = config.quizSettings[mode];
                            slider.parentElement.querySelector('.pct').textContent = config.quizSettings[mode] + '%';
                        }
                        // Disable sliders in multiplayer (server is source of truth)
                        if (!config.isSoloGame) {
                            slider.disabled = true;
                        }
                    });
                }
            },
            onGameSpeedUpdate: (speed) => {
                const multipliers = { slow: 0.3, normal: 0.5, fast: 1.0 };
                gameSpeedMultiplier = multipliers[speed] || 0.5;
                console.log(`Game speed set to ${speed} (${gameSpeedMultiplier}x)`);
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
            // Load other player sprite (tinted grey from player1 base)
            const otherBase = await loadImage(`${scriptDirectory}/player1-sprite96.png`);
            otherPlayerImg = createTintedSprite(otherBase, OTHER_PLAYER_TINT);
            console.log('Other player sprite ready (grey tint)');

            // Load healing point image
            healingPointImg = await loadImage(`${scriptDirectory}/healing_point.png`);
            console.log('Healing point image loaded successfully');

            // Load particle burst sprite sheet
            const particlePath = `${scriptDirectory}/images/effects/red-particle-burst__1_-removebg-preview.png`;
            console.log('Loading particle sprite from:', particlePath);
            particleBurstImg = await loadImage(particlePath);
            console.log('✅ Particle burst sprite sheet loaded successfully', particleBurstImg.width, 'x', particleBurstImg.height);

            // Load terrain tile sprite sheets
            // Buildings: 4x4 grid, 100x100 per tile (400x400 total)
            buildingTilesImg = await loadImage(`${scriptDirectory}/images/terrains/houses-and-buildings400.png`);
            console.log('✅ Building tiles loaded (4x4 sheet, 16 tiles)', buildingTilesImg.width, 'x', buildingTilesImg.height);

            terrainTilesImg = await loadImage(`${scriptDirectory}/images/terrains/terrain256.png`);
            console.log('✅ Terrain tiles loaded (8x8 sheet, 64 tiles)', terrainTilesImg.width, 'x', terrainTilesImg.height);

            console.log('otherPLayer and healingPointImg loaded successfully');
        } catch (error) {
            console.error('Error loading otherPLayer and healingPoint:', error);
        }




        // this might get replaced in PRD on the server - check
        ALL_QUALITIES = ['Faith', 'Courage', 'Knowledge', 'Love', 'Wisdom', 'Healing', 'Joy', 'Focus', 'Prosperity', 'Purity', 'Humility', 'Forgiveness', 'Hope', 'Praise', 'Prayer', 'Endurance', 'Good News', 'Identity', 'Deliverance', 'Power', 'Prophecy'];

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
        verseTimer = setInterval(function () {
            QuizManager.pickQualityVerse();
        }, VERSECHANGETIME);

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
                } else if (itemId === 'goals') {
                    goalsOverlayVisible = true;
                } else if (itemId === 'verseTest') {
                    // Launch verse test with current verse (with rewards)
                    const verse = organizedVerses[vQuality][currentVerseIndex];
                    if (verse) {
                        const testDifficulty = Math.min(5 + player.level, 15);
                        launchVerseTest(verse.Text, verse.Reference, testDifficulty);
                    }
                } else if (itemId === 'toggleTestShield') {
                    verseTestShielded = !verseTestShielded;
                    localStorage.setItem('verseTestShielded', verseTestShielded.toString());
                    flashMessages.push({
                        text: verseTestShielded ? 'Test Shield: ON' : 'Test Shield: OFF',
                        color: '#ffffff',
                        startTime: Date.now(),
                        duration: 1500
                    });
                } else if (itemId === 'leave') {
                    if (confirm('Leave this game? You must rejoin to play again.')) {
                        network.sendLeaveGame();
                        window.location.href = isSoloGame ? '/' : '/lobby';
                    }
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
                    const panelH = ip.expandedHeight || 200;

                    // Check Use button clicks for activatable items
                    const activatableItems = ['sword', 'breastplate', 'sandals', 'shield'];
                    const rowHeight = 28;
                    let rowIndex = 0;

                    // Build visible items list (same order as renderer)
                    const allTypes = ['sword', 'belt', 'helmet', 'breastplate', 'sandals', 'shield'];
                    const visibleItems = allTypes.filter(t => inventory[t] > 0);

                    for (const itemType of visibleItems) {
                        const rowY = panelY + 24 + rowIndex * rowHeight;
                        // Use button at right side of panel
                        const useBtnX = panelX + panelW - 50;
                        const useBtnY = rowY;
                        const useBtnW = 40;
                        const useBtnH = 22;

                        if (activatableItems.includes(itemType) &&
                            x >= useBtnX && x <= useBtnX + useBtnW &&
                            y >= useBtnY && y <= useBtnY + useBtnH &&
                            inventory[itemType] > 0 && !activeBuffs[itemType].active) {

                            // Activate the item
                            inventory[itemType]--;
                            const durations = {
                                sword: Constants.SWORD_DURATION,
                                shield: Constants.SHIELD_DURATION,
                                breastplate: Constants.BREASTPLATE_DURATION,
                                sandals: Constants.SANDALS_DURATION
                            };
                            activeBuffs[itemType] = {
                                active: true,
                                endTime: Date.now() + durations[itemType]
                            };
                            network.sendActivateItem(itemType);
                            inventoryOpen = false;

                            const name = COLLECTIBLE_NAMES[itemType] || itemType;
                            flashMessages.push({
                                text: `${name} activated!`,
                                color: COLLECTIBLE_COLORS[itemType] || '#ffffff',
                                startTime: Date.now(),
                                duration: 2000
                            });
                            console.log(`${name} activated!`);
                            return true;
                        }
                        rowIndex++;
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
                        // Only shoot if outside melee range — melee handles close combat
                        const distToMonster = Math.sqrt(
                            Math.pow(m.x - player.x, 2) + Math.pow(m.y - player.y, 2)
                        );
                        if (distToMonster >= COMBAT_DISTANCE) {
                            network.sendShoot({ x: worldX, y: worldY });
                        }
                        return true; // Handled (prevent movement)
                    }
                }

                return false; // Not handled (allow movement)
            }
        });

        // Initialize daily challenge and verse counter
        initializeDailyChallenge();
        initializeVerseCounter();

        // Reset session start time when game starts
        sessionStartTime = Date.now();

        // ===== FIRST 60 SECONDS: Show pre-game tip =====
        setTimeout(() => {
            if (isInOnboardingWindow()) {
                showToast('💡 TIP: Answer quizzes correctly to deal damage!', 4000);
            }
        }, 1000); // Show 1 second after game starts

        // Set up onboarding modal dismiss handler
        const onboardingModal = document.getElementById('onboardingModal');
        if (onboardingModal) {
            onboardingModal.addEventListener('click', function(e) {
                // Close modal on click
                if (e.target === onboardingModal || e.target === document.getElementById('onboardingModalPanel')) {
                    hideOnboardingModal();
                }
            });
        }

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

    // [WallSpawn] Periodic check: is the player currently inside a wall? (every ~1s)
    if (player && clientWallGrid && player.width && player.height && currentTime - _wallSpawnCheckTimer > 1000) {
        _wallSpawnCheckTimer = currentTime;
        if (clientWallGrid.collides(player.x, player.y, player.width, player.height)) {
            console.error(`[WallSpawn] STUCK: Player is inside a wall at (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) w=${player.width} h=${player.height} frozen=${movementFrozen} level=${gameState.gameLevel}`);
        }
    }

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
                reference: (organizedVerses[vQuality] && organizedVerses[vQuality][currentVerseIndex]) ? organizedVerses[vQuality][currentVerseIndex].Reference : ''
            },
            quiz: answerFullVerse ? null : currentQuiz,
            menuState: {
                menuOpen,
                musicState: MusicManager.getState(),
                reviewActive: gameMode === 'review',
                verseTestShielded
            },
            dailyChallengeProgress,
            dailyChallengeGoal,
            dailyChallengeCompleted,
            versesLearned,
            totalVerses: TOTAL_VERSES,
            gameOverModalVisible,
            finalStats,
            restartButtonRect,
            goalsOverlayVisible,
            movementFrozen,
            flashMessages
        };

        const assets = {
            playerImg,
            otherPlayerImg,
            demonImages,
            explosionImg,
            healingPointImg,
            shieldImg,
            particleBurstImg,
            buildingTilesImg,
            terrainTilesImg
        };

        // Instantiate renderer if not already (hack for now, should be in init)
        if (!window.renderer) {
            window.renderer = new Renderer(canvas, ctx, assets);
        }
        window.renderer.assets = assets; // Update assets in case they loaded late

        // Update player animation frame
        if (player.isMoving) {
            player.frameTimer += 16;  // Assume ~60fps ≈ 16ms per frame

            if (player.frameTimer >= 150) {  // Change frame every 150ms (6-7 frames)
                player.currentFrame = (player.currentFrame === 0) ? 1 : 0;  // Toggle between 0 and 1
                player.frameTimer = 0;
            }
        } else {
            // Player idle - always show frame 0
            player.currentFrame = 0;
            player.frameTimer = 0;
        }

        // Update death particle animations
        deathParticles = deathParticles.filter(particle => {
            particle.frameTimer += 16; // ~16ms per frame at 60fps

            // Advance frame every 100ms (10 fps for slower, more visible animation)
            if (particle.frameTimer >= 100) {
                particle.frame++;
                particle.frameTimer = 0;
            }

            // Remove after 24 frames (using first 4 rows of 6x6 grid)
            // At 100ms per frame, this is 2.4 seconds total
            return particle.frame < 24;
        });

        // Update screen shake
        if (screenShake.duration > 0) {
            screenShake.duration -= 16;  // Assume ~60fps = ~16ms per frame
            if (screenShake.duration <= 0) {
                screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
            }
        }

        // Update damage numbers (remove expired ones)
        damageNumbers = damageNumbers.filter(dn => {
            return (Date.now() - dn.startTime) < dn.duration;
        });

        // Update flash messages (remove expired ones)
        flashMessages = flashMessages.filter(fm => {
            return (Date.now() - fm.startTime) < fm.duration;
        });

        // Update VerseTestScreen timer
        if (VerseTestScreen.isActive()) {
            VerseTestScreen.update(16);
        }

        // Build inventory state for renderer
        const inventoryState = {
            inventory: inventory,
            activeBuffs: activeBuffs,
            inventoryOpen: inventoryOpen
        };

        window.renderer.drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, clientWalls, screenShake, damageNumbers, deathParticles, mouseX, mouseY);

        // ===== ONBOARDING: Auto-dismiss modal after timeout =====
        if (modalPaused && modalPauseStartTime > 0) {
            const elapsed = Date.now() - modalPauseStartTime;
            if (elapsed >= MODAL_DISPLAY_TIME) {
                hideOnboardingModal();
            }
        }

        // Draw VerseTestScreen overlay on top of everything
        if (VerseTestScreen.isActive()) {
            VerseTestScreen.render(ctx, canvas.width, canvas.height);
        }

        // If game over, stop processing movement/combat but keep rendering
        if (gameOverFlag) {
            // Sync modal state so InputHandler can detect restart button clicks
            if (inputHandler) {
                inputHandler.gameOverModalVisible = gameOverModalVisible;
                inputHandler.restartButtonRect = restartButtonRect;
            }
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
        this.ctx.fillText(`Learn: ${vQuality}`, 7, 22);

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

        // Safety timeout: auto-unfreeze if walls never arrive
        if (movementFrozen && Date.now() - levelTransitionStartTime > MAX_TRANSITION_FREEZE_MS) {
            movementFrozen = false;
            console.warn('Movement auto-unfrozen after safety timeout - walls may not have arrived');
        }

        // Skip movement if frozen during level transition
        if (movementFrozen) {
            // Clear any pending movement target so player doesn't auto-move when unfrozen
            if (inputHandler) {
                inputHandler.clearTarget();
            }
            // Reset moving state
            player.isMoving = false;
            player.currentFrame = 0;
            player.frameTimer = 0;
        } else if (worldTarget) {
            let dx = worldTarget.x - player.x;
            let dy = worldTarget.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            const THRESHOLD_DISTANCE = 5; // Adjust this value as needed

            // Track animation state
            const wasMoving = player.isMoving;
            player.isMoving = (distance > THRESHOLD_DISTANCE);

            // Determine facing direction based on horizontal movement
            if (Math.abs(dx) > 2) {  // Only change direction if significant horizontal movement
                player.facingDirection = dx > 0 ? 'right' : 'left';
            }

            // If player stopped moving, reset to idle frame
            if (wasMoving && !player.isMoving) {
                player.currentFrame = 0;
                player.frameTimer = 0;
            }

            if (distance > THRESHOLD_DISTANCE) {
                // Apply game speed multiplier to all speeds
                const baseSpeed = activeBuffs.sandals.active ? PLAYER_SPEED * Constants.SANDALS_SPEED_BOOST : PLAYER_SPEED;
                let moveSpeed = baseSpeed * gameSpeedMultiplier;

                // Freezing Aura: check if any paralyzer demon is nearby
                for (const monster of monsters) {
                    if (monster.freezeAura) {
                        const mdx = monster.x - player.x;
                        const mdy = monster.y - player.y;
                        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                        if (mdist < Constants.FREEZE_AURA_RADIUS) {
                            moveSpeed *= Constants.FREEZE_AURA_SLOW;
                            break; // Only apply one slow
                        }
                    }
                }

                // Calculate new position
                const newX = player.x + (dx / distance) * moveSpeed;
                const newY = player.y + (dy / distance) * moveSpeed;

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
            // Update InputHandler with modal state for click detection
            inputHandler.gameOverModalVisible = gameOverModalVisible;
            inputHandler.restartButtonRect = restartButtonRect;
        }



        // Handle collisions and attacks
        currentTime = Date.now();
        monsters.forEach(monster => {
            let dx = monster.x - player.x;
            let dy = monster.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < COMBAT_DISTANCE && (!player.state || player.state === 'alive')) {
                // Handle combat (ghosts cannot fight)
                if (currentTime - lastAttackTime > ATTACK_RATE) {
                    lastAttackTime = currentTime;
                    if (isAnswerCorrect === true) {
                        attackSound.play(); // Play the attack sound effect
                        monster.isAttacked = true; // Set isAttacked to true when the monster is attacked
                        setTimeout(() => {
                            monster.isAttacked = false; // Set isAttacked back to false after a short duration
                        }, 200); // Adjust the duration as needed

                        // Screen shake effect
                        screenShake = {
                            x: (Math.random() - 0.5) * 10,  // -5 to +5 pixels
                            y: (Math.random() - 0.5) * 10,
                            intensity: 10,
                            duration: 200  // ms
                        };

                        // Add floating damage number
                        damageNumbers.push({
                            x: monster.x,
                            y: monster.y - 20,  // Start above monster
                            damage: 1,
                            startTime: Date.now(),
                            duration: 1000  // 1 second
                        });

                        // Create the attackData structure
                        handlePlayerAttack(monster);
                    }

                    // Store the last attacked monster
                    lastAttackedMonster = monster;

                    // Shield blocks monster damage (inventory shield OR verse test shield)
                    if (!activeBuffs.shield.active && !verseTestShieldActive) {
                        // Calculate random damage between 0 and the monster's maximum damage
                        let damage = Math.floor(Math.random() * (monster.maxDamage + 1) * gameState.gameLevel);

                        // Breastplate of Righteousness: 50% damage reduction
                        if (activeBuffs.breastplate.active) {
                            damage = Math.floor(damage * Constants.BREASTPLATE_REDUCTION);
                        }

                        player.health -= damage;
                        network.sendPlayerHit(damage);

                        // ===== ONBOARDING: Show modal on first damage taken =====
                        if (!firstGameTips.demonAppeared && isInOnboardingWindow() && damage > 0) {
                            firstGameTips.demonAppeared = true;
                            showOnboardingModal(
                                'A demon is attacking!',
                                'Tap the quiz answer below to fight back.'
                            );
                        }

                        // Spirit Drain: Poverty drains XP, Temptation drains Ammo
                        if (damage > 0 && Math.random() < Constants.DRAIN_CHANCE) {
                            if (monster.demonType === 'Poverty') {
                                const drained = Math.min(player.xp || 0, Constants.POVERTY_XP_DRAIN);
                                if (drained > 0) {
                                    player.xp -= drained;
                                    flashMessages.push({
                                        text: `Poverty drained ${drained} XP!`,
                                        color: '#FF4444',
                                        startTime: Date.now(),
                                        duration: 2000
                                    });
                                }
                            } else if (monster.demonType === 'Temptation') {
                                const drained = Math.min(player.ammo || 0, Constants.TEMPTATION_AMMO_DRAIN);
                                if (drained > 0) {
                                    player.ammo -= drained;
                                    flashMessages.push({
                                        text: `Temptation drained ${drained} Ammo!`,
                                        color: '#FF4444',
                                        startTime: Date.now(),
                                        duration: 2000
                                    });
                                }
                            }
                        }

                        playerHit.play();

                        // Helmet of Salvation: auto-revive on death
                        if (player.health <= 0 && inventory.helmet > 0) {
                            inventory.helmet--;
                            player.health = Math.floor(player.maxHealth * Constants.HELMET_REVIVE_HP_PERCENT);
                            network.sendConsumeItem('helmet');
                            flashMessages.push({
                                text: 'Auto-revived! (Helmet of Salvation)',
                                color: '#C0C0C0',
                                startTime: Date.now(),
                                duration: 3000
                            });
                            console.log('Helmet of Salvation auto-revive! HP:', player.health);
                        } else if (player.health <= 0 && !gameOverModalVisible) {
                            if (isSoloGame) {
                                // Solo: show game over modal (existing behavior)
                                gameOver.play();
                                gameOverFlag = true;
                                gameOverModalVisible = true;

                                // Calculate final stats
                                const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
                                finalStats = {
                                    level: gameState.gameLevel || 1,
                                    monstersKilled: gameState.monstersKilled || 0,
                                    versesLearned: versesLearned,
                                    timePlayed: sessionDuration
                                };
                                console.log("Game Over - Final Stats:", finalStats);
                            }
                            // Multiplayer: server handles ghost state via playerDied event
                            // Player continues as ghost — no modal shown on death
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

                // ===== VICTORY SCREEN: Show level complete message =====
                if (window.SoundEffects) {
                    SoundEffects.playLevelComplete();
                }
                flashMessages.push({
                    text: `🏆 LEVEL ${gameState.gameLevel} COMPLETE! 🏆`,
                    color: '#FFD700',
                    x: canvas.width / 2,
                    y: canvas.height / 2 - 80,
                    startTime: Date.now(),
                    duration: 3000,
                    fontSize: 28,
                    centered: true
                });
                flashMessages.push({
                    text: `${killed} Demons Defeated!`,
                    color: '#FFFFFF',
                    x: canvas.width / 2,
                    y: canvas.height / 2 - 40,
                    startTime: Date.now(),
                    duration: 3000,
                    fontSize: 20,
                    centered: true
                });

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
                // Prevent duplicate collection while waiting for server response
                if (!window._collectedHealingPoints) window._collectedHealingPoints = new Set();
                if (window._collectedHealingPoints.has(healingPoint.id)) {
                    return; // Already collected this healing point, skip
                }
                window._collectedHealingPoints.add(healingPoint.id);

                // ===== ONBOARDING: Detect healing point collection =====
                if (!firstGameTips.healingCollected && isInOnboardingWindow()) {
                    firstGameTips.healingCollected = true;
                    showToast('💡 Walk over green crosses to restore health');
                }

                // Heal the player
                network.sendCollectHealingPoint(healingPoint.id);
                healingRecharge.play(); // Play the attack sound effect
            }
        });

        //Check collectible collection (unified for all item types)
        collectibles.forEach((item) => {
            let dx = item.x - player.x;
            let dy = item.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.width / 2 + item.width / 2) {
                // NEW: Track collected IDs to prevent duplicate messages
                if (!window._collectedItems) window._collectedItems = new Set();
                if (window._collectedItems.has(item.id)) {
                    return; // Already collected this item, skip
                }
                window._collectedItems.add(item.id);

                inventory[item.type]++;
                network.sendCollectCollectible(item.id);
                healingRecharge.play();
                const name = COLLECTIBLE_NAMES[item.type] || item.type;
                flashMessages.push({
                    text: `Collected: ${name}`,
                    color: COLLECTIBLE_COLORS[item.type] || '#ffffff',
                    startTime: Date.now(),
                    duration: 1500
                });
                console.log(`${name} collected! Inventory:`, inventory);
            }
        });

        // Update active buff timers (expire past endTime)
        const now = Date.now();
        for (const buffType in activeBuffs) {
            if (activeBuffs[buffType].active && now >= activeBuffs[buffType].endTime) {
                activeBuffs[buffType].active = false;
                console.log(`${buffType} buff expired`);
            }
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

                // Reconciliation: trust local prediction, only blend toward server if very far off
                const dist = Math.sqrt(Math.pow(serverPlayer.x - x, 2) + Math.pow(serverPlayer.y - y, 2));
                if (dist < 60) {
                    player.x = x;
                    player.y = y;
                } else {
                    // Smooth blend toward server position instead of hard snap
                    player.x = x + (serverPlayer.x - x) * 0.3;
                    player.y = y + (serverPlayer.y - y) * 0.3;
                    // Log large reconciliation — this blend could land player in a wall
                    if (clientWallGrid && player.width && player.height) {
                        const blendCollides = clientWallGrid.collides(player.x, player.y, player.width, player.height);
                        if (blendCollides) {
                            console.error(`[WallSpawn] BUG: Position blend put player in wall! local=(${x.toFixed(1)},${y.toFixed(1)}) server=(${serverPlayer.x.toFixed(1)},${serverPlayer.y.toFixed(1)}) result=(${player.x.toFixed(1)},${player.y.toFixed(1)}) dist=${dist.toFixed(1)}`);
                        }
                    }
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

    // Update collectibles
    if (newGameState.collectibles && Array.isArray(newGameState.collectibles)) {
        collectibles = newGameState.collectibles;
    } else {
        collectibles = [];
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
    const previousLevel = player.level;

    // ONLY check next level threshold to prevent multi-level jumps
    const nextLevelIndex = player.level; // next level is current+1, which is at index player.level
    if (nextLevelIndex < levelXPRequirements.length && xp >= levelXPRequirements[nextLevelIndex]) {
        player.level = nextLevelIndex + 1;
        player.maxHealth = 50 + player.level * 50;
        player.health = player.maxHealth; // Set player's health to the new max health
        console.log(`Player reached level ${player.level}!`);
    }

    // Play level up sound if level increased
    if (player.level > previousLevel) {
        levelUpSound.play();
    }
}




// Check if a position collides with any wall (uses spatial grid for O(1) lookup)
function checkWallCollision(x, y, width, height) {
    if (clientWallGrid) {
        return clientWallGrid.collides(x, y, width, height);
    }
    return false;
}


