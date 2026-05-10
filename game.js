let PRD = false;
let DEBUG_MOVEMENT = true; // Toggle position/movement debug logging
const _dbgLog = []; // Ring buffer of recent debug events
function dbg(tag, msg, data) {
    if (!DEBUG_MOVEMENT) return;
    const t = (performance.now() / 1000).toFixed(3);
    const entry = `[${t}][${tag}] ${msg}` + (data ? ' ' + JSON.stringify(data) : '');
    _dbgLog.push(entry);
    if (_dbgLog.length > 200) _dbgLog.shift();
    console.log(entry);
}
// Expose for console access: type dumpDbg() in browser console
window.dumpDbg = () => _dbgLog.forEach(e => console.log(e));

// Debug: Instant victory (for testing victory flow without playing)
window.debugWin = () => {
    if (network && network.engine) {
        console.log('[DEBUG] Triggering instant victory');
        network.engine._endGame('victory');
    } else {
        console.error('[DEBUG] No engine running');
    }
};

let currentTime = Date.now();
let socket;
let playerCode = null;  // code to access player information for the current player
let viewMode = '2d';

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

// Network position send throttle (~20Hz = 50ms interval)
let _lastPositionSendTime = 0;
let _lastSentX = 0;
let _lastSentY = 0;
const POSITION_SEND_INTERVAL = 50; // ms between position sends

// Offline mode flag
let offlineMode = false;

// Pause offline game when tab is hidden (prevents timers running in background)
document.addEventListener('visibilitychange', function () {
    if (!offlineMode || !network || !network.engine) return;
    if (document.hidden) {
        network.engine.stop();
        console.log('Offline game paused (tab hidden)');
    } else {
        network.engine.start();
        console.log('Offline game resumed (tab visible)');
    }
});

// Warn before closing tab during offline game (no save/resume yet)
window.addEventListener('beforeunload', function (e) {
    if (offlineMode && network && network.engine && network.engine.shouldRun) {
        e.preventDefault();
    }
});

// Handle window resize and orientation change for mobile browsers
function getOptimalCanvasWidth() {
    const minWidth = 320;
    const maxMobileWidth = 420;
    const maxDesktopWidth = 600;
    const idealWidth = 400;
    const viewportWidth = window.innerWidth || 400;
    const isMobile = viewportWidth < 768;
    
    if (viewportWidth < minWidth) return minWidth;
    
    if (isMobile) {
        // Mobile: cap at 420, prefer slightly less than viewport
        return Math.min(viewportWidth - 10, maxMobileWidth, idealWidth);
    } else {
        // Desktop: allow wider canvas up to 600px
        return Math.min(Math.max(viewportWidth * 0.4, idealWidth), maxDesktopWidth);
    }
}

// Global function to ensure canvas is properly sized for any mode
function ensureCanvasSize() {
    const newWidth = getOptimalCanvasWidth();
    const newHeight = Math.min(600, window.innerHeight - 80);
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx = canvas.getContext('2d');
        console.log('Canvas resized to:', canvas.width, canvas.height);
    }
}

function handleResize() {
    if (!canvas) return;
    const newWidth = getOptimalCanvasWidth();
    const newHeight = Math.min(600, window.innerHeight - 80);
    canvas.width = newWidth;
    canvas.height = newHeight;
    if (window.ModeManager && typeof window.ModeManager.handleResize === 'function') {
        window.ModeManager.handleResize({ width: newWidth, height: newHeight });
    }
}
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

window.addEventListener('keydown', function (e) {
    if (typeof gameMode === 'undefined' || gameMode !== 'game') return;
    if (e.key === '1') { applyGameSpeed('verySlow'); e.preventDefault(); }
    else if (e.key === '2') { applyGameSpeed('slow'); e.preventDefault(); }
    else if (e.key === '3') { applyGameSpeed('normal'); e.preventDefault(); }
    else if (e.key === '4') { applyGameSpeed('fast'); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { cycleGameSpeed(-1); e.preventDefault(); }
    else if (e.key === '=' || e.key === '+') { cycleGameSpeed(1); e.preventDefault(); }
});

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

function normalizeAngleDelta(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

function find3DTargetMonster(monsters, player) {
    let bestMonster = null;
    let bestDistance = Infinity;
    const facing = typeof player.viewAngle === 'number' ? player.viewAngle : 0;
    const facingX = Math.cos(facing);
    const facingY = Math.sin(facing);

    for (const monster of monsters) {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > THREE_D_FIRE_RANGE) continue;

        const normDx = dx / Math.max(distance, 1);
        const normDy = dy / Math.max(distance, 1);
        const forwardDot = normDx * facingX + normDy * facingY;
        if (forwardDot < 0.9) continue;

        const angleToMonster = Math.atan2(dy, dx);
        const angleDelta = Math.abs(normalizeAngleDelta(angleToMonster - facing));
        if (angleDelta > THREE_D_FIRE_CONE) continue;

        if (distance < bestDistance) {
            bestMonster = monster;
            bestDistance = distance;
        }
    }

    return bestMonster;
}

function tryHandle3DFire(monsters, now) {
    if (now - lastAttackTime <= ATTACK_RATE) return false;
    const monster = find3DTargetMonster(monsters, player);
    if (!monster) return false;

    lastAttackTime = now;
    lastAttackedMonster = monster;

    attackSound.play();
    monster.isAttacked = true;
    setTimeout(() => {
        monster.isAttacked = false;
    }, 200);

    screenShake = {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        intensity: 8,
        duration: 150
    };

    damageNumbers.push({
        x: monster.x,
        y: monster.y - 20,
        damage: 1,
        startTime: Date.now(),
        duration: 1000
    });

    handlePlayerAttack(monster);
    return true;
}

function clearCombatHint() {
    combatHint = null;
}

function resetCombatStruggleState() {
    combatStruggleState.monsterId = null;
    combatStruggleState.hitsWithoutDamage = 0;
    combatStruggleState.lastHitAt = 0;
}

function noteSuccessfulDamage() {
    resetCombatStruggleState();
    clearCombatHint();
}

function maybeShowCombatHint(monster) {
    if (!monster || !monster.demonType) return;

    const now = Date.now();
    if (now - combatStruggleState.lastHintAt < COMBAT_HINT_COOLDOWN) {
        return;
    }

    const suggestedCategory = LevelConfig.getBestCategoryForMonster(monster.demonType);
    if (!suggestedCategory) return;

    combatStruggleState.lastHintAt = now;
    combatHint = {
        line1: typeof t === 'function' ? t('game.combatHintFleeAndLearn') : 'Flee and Learn',
        line2: typeof window !== 'undefined' && typeof window.tCategory === 'function'
            ? window.tCategory(suggestedCategory)
            : suggestedCategory,
        color: '#ffd166',
        startTime: now,
        duration: COMBAT_HINT_DURATION
    };
}

function noteMonsterPressure(monster, damage) {
    if (!monster || !damage || damage <= 0) return;

    const now = Date.now();
    if (
        combatStruggleState.monsterId !== monster.id ||
        (combatStruggleState.lastHitAt && now - combatStruggleState.lastHitAt > COMBAT_HINT_ENCOUNTER_RESET_MS)
    ) {
        combatStruggleState.monsterId = monster.id;
        combatStruggleState.hitsWithoutDamage = 0;
    }

    combatStruggleState.lastHitAt = now;
    combatStruggleState.hitsWithoutDamage += 1;

    if (combatStruggleState.hitsWithoutDamage >= COMBAT_HINT_TRIGGER_HITS) {
        maybeShowCombatHint(monster);
    }
}

function installCombatHintDebugHooks() {
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    if (!isLocalDev) return;

    window.__combatHintDebug = {
        simulateHits(monsterType = 'Fear', count = COMBAT_HINT_TRIGGER_HITS) {
            const debugMonster = {
                id: `debug-${monsterType}`,
                demonType: monsterType
            };
            for (let i = 0; i < count; i++) {
                noteMonsterPressure(debugMonster, 1);
            }
            return this.snapshot();
        },
        clear() {
            clearCombatHint();
            resetCombatStruggleState();
            return this.snapshot();
        },
        snapshot() {
            return {
                combatHint: combatHint ? {
                    line1: combatHint.line1,
                    line2: combatHint.line2,
                    duration: combatHint.duration,
                    remainingMs: Math.max(0, combatHint.duration - (Date.now() - combatHint.startTime))
                } : null,
                struggleState: {
                    monsterId: combatStruggleState.monsterId,
                    hitsWithoutDamage: combatStruggleState.hitsWithoutDamage,
                    lastHitAt: combatStruggleState.lastHitAt,
                    lastHintAt: combatStruggleState.lastHintAt
                }
            };
        }
    };
}

// Wait for the DOM content to load
document.addEventListener('DOMContentLoaded', function () {
    // Get the canvas element by its ID
    canvas = document.getElementById('gameCanvas');

    // Check if the canvas element exists
    if (canvas) {
        // Get the 2D rendering context
        ctx = canvas.getContext('2d');
        canvas.style.touchAction = 'none';

        // Initialize canvas size for mobile browsers
        handleResize();

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

function normalizeViewMode(value) {
    return value === '3d' ? '3d' : '2d';
}

function resolveInitialViewMode(urlParams) {
    const urlMode = normalizeViewMode(urlParams.get('viewMode'));
    if (urlMode === '3d') return urlMode;

    const persistedMode = normalizeViewMode(localStorage.getItem('preferredViewMode'));
    return persistedMode;
}

function persistViewMode(nextMode) {
    viewMode = normalizeViewMode(nextMode);
    window.viewMode = viewMode;
    localStorage.setItem('preferredViewMode', viewMode);
}

function updateViewModeControls(selectedMode) {
    const normalized = normalizeViewMode(selectedMode);
    const mainMenuSelect = document.getElementById('mainMenuViewModeSelect');
    const settingsSelect = document.getElementById('viewModeSelect');
    if (mainMenuSelect) mainMenuSelect.value = normalized;
    if (settingsSelect) settingsSelect.value = normalized;
}

function reloadWithViewMode(nextMode) {
    const normalized = normalizeViewMode(nextMode);
    persistViewMode(normalized);

    const nextUrl = new URL(window.location.href);
    if (normalized === '3d') {
        nextUrl.searchParams.set('viewMode', '3d');
    } else {
        nextUrl.searchParams.delete('viewMode');
    }
    window.location.href = nextUrl.toString();
}

function getRendererClassForViewMode(mode) {
    if (mode === '3d' && typeof Renderer3D === 'function') {
        return Renderer3D;
    }
    return Renderer;
}

function getInputHandlerClassForViewMode(mode) {
    if (mode === '3d' && typeof InputHandler3D === 'function') {
        return InputHandler3D;
    }
    return InputHandler;
}
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
let currentGameSpeed = 'normal';
const GAME_SPEED_ORDER = ['verySlow', 'slow', 'normal', 'fast'];
const GAME_SPEED_CLIENT_MULTIPLIERS = { verySlow: 0.15, slow: 0.3, normal: 0.5, fast: 1.0 };
const GAME_SPEED_ENGINE_MULTIPLIERS = { verySlow: 0.25, slow: 0.45, normal: 0.75, fast: 1.5 };
const GAME_SPEED_DISPLAY = { verySlow: '0.25\u00d7', slow: 'Slow', normal: '1\u00d7', fast: 'Fast' };
let speedOnboardingDismissed = localStorage.getItem('dcgame_speedTooltipShown') === 'true';
let speedPromptVisible = false;

function cycleGameSpeed(direction) {
    const idx = GAME_SPEED_ORDER.indexOf(currentGameSpeed);
    const newIdx = (idx + direction + GAME_SPEED_ORDER.length) % GAME_SPEED_ORDER.length;
    const newSpeed = GAME_SPEED_ORDER[newIdx];
    applyGameSpeed(newSpeed);
}

function applyGameSpeed(speed) {
    currentGameSpeed = speed;
    gameSpeedMultiplier = GAME_SPEED_CLIENT_MULTIPLIERS[speed] || 0.5;
    if (network && network.engine && network.engine.gameState) {
        network.engine.gameState.speedMultiplier = GAME_SPEED_ENGINE_MULTIPLIERS[speed] || 0.75;
    }
    if (speedOnboardingDismissed) return;
    speedOnboardingDismissed = true;
    localStorage.setItem('dcgame_speedTooltipShown', 'true');
    console.log(`Game speed set to ${speed} (${gameSpeedMultiplier}x client, ${GAME_SPEED_ENGINE_MULTIPLIERS[speed]}x engine)`);
}


const ATTACK_RATE = 700; // milliseconds (0.5 seconds)
const THREE_D_FIRE_RANGE = 520;
const THREE_D_FIRE_CONE = Math.PI / 10;
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

let categoryPickerOpen = false;
let levelCompleted = false;
let levelAdvanceCountdown = 0;
let levelAdvanceTimer = null;

// If qualities is set to [] then all qualities will be used
// Level config shared between client and server (loaded via script tag)
const levelData = LevelConfig.levelData;

// Custom config from URL or localStorage (for solo/offline games only)
let urlConfig = null;
let customLevelData = null;
let customMonsterHealthMultiplier = 1.0;
const LOCAL_STORAGE_CONFIG_KEY = 'versebattles_custom_config';

let QUALITIES;
let ALL_QUALITIES;
let organizedVerses = {};
// gameCategory variable is taken from index.php?category=Whatever

let currentQuiz = null; // Unified quiz object from QuizManager
let answerFullVerse = null;
let isAnswerCorrect = null; // Global variable to store the answer status
let lastAnsweredReference = null; // Stores verse reference for display after correct answer
let gameOverFlag = false;
let _gameLoopRunning = false;
let _gameGeneration = 0; // Incremented on each new game to stop old game loops
let _dbgHeartbeat = 0;
let maxSpawns = 0;  //should be updated by server
let spawnsLeft = 10; //should be updated by server
// Get the current script path
const currentScriptPath = document.currentScript.src;
const scriptDirectory = currentScriptPath.substring(0, currentScriptPath.lastIndexOf('/'));
const assetBaseUrl = (function () {
    try {
        return new URL('./', currentScriptPath).href;
    } catch (error) {
        return window.location.origin + '/';
    }
})();

function resolveAssetUrl(relativePath) {
    const cleanPath = String(relativePath || '').replace(/^\/+/, '');
    try {
        return new URL(cleanPath, assetBaseUrl).href;
    } catch (error) {
        return '/' + cleanPath;
    }
}

window.gameMode = 'game'; // Possible values: 'game', 'review', 'overland', 'votd', 'menu'
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
let meleeHitProbabilityNoAnswer = 0.0; // Default normal-mode behavior: no free melee hits without a correct answer

// Mission system state
let overlandRenderer = null;
let currentMission = null;
let currentMissionConfig = null;
let pendingMissionContentOverride = null;
let baseOrganizedVerses = null;
let baseAllQualities = null;
window.missionWorlds = [];
let missionsInitialized = false;

window.currentMission = null;
const START_HERE_WORLD_ID = 'chapter0';
const START_HERE_MISSION_ID = 'intro-01';
const START_HERE_SEEN_KEY = 'hasSeenStartHereMission';
const START_HERE_AUTO_LAUNCH_ENABLED = true;
const START_HERE_MOVE_DISTANCE = 70;
const START_HERE_HEALTH_GUIDE_MS = 3200;
const START_HERE_STEP_MOVE = 'move_intro';
const START_HERE_STEP_ANSWER = 'answer_intro';
const START_HERE_STEP_KILL = 'first_kill';
const START_HERE_STEP_LEARN = 'learn_gate';
const START_HERE_STEP_FINISH = 'finish';
let onboardingGuideState = null;

// Verse Test shield setting (Option A/B)
let verseTestShielded = localStorage.getItem('verseTestShielded') === 'true';
let verseTestShieldActive = false;

// Goals overlay state
let goalsOverlayVisible = false;

// VOTD (Verse of the Day) state
let votdMode = null; // 'learning' | 'test' | null
let votdAutoLaunchHandled = false; // Track if we've already handled votdAutoLaunch

// Flash messages for achievements
let flashMessages = [];  // Array of { text, color, startTime, duration }

// Particle effects
let particleBurstImg = null;
let deathParticles = []; // Array of active death particle animations
let heavenlyKillCelebrationShown = false;

// for monster explosion
let explosionTimer = 0;
const EXPLOSION_INTERVAL = 100; // Adjust the interval as needed

// Visual effects - screen shake and damage numbers
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let damageNumbers = [];  // Array of {x, y, damage, startTime, duration: 1000}
let combatHint = null;
let combatStruggleState = {
    monsterId: null,
    hitsWithoutDamage: 0,
    lastHitAt: 0,
    lastHintAt: 0
};

const COMBAT_HINT_TRIGGER_HITS = 2;
const COMBAT_HINT_DURATION = 2200;
const COMBAT_HINT_COOLDOWN = 25000;
const COMBAT_HINT_ENCOUNTER_RESET_MS = 12000;

function getCombatDistanceForMonster(monster) {
    const monsterWidth = monster && typeof monster.width === 'number' ? monster.width : Constants.MONSTER_WIDTH;
    const paddedBodyRange = (player.width / 2) + (monsterWidth / 2) + 6;
    return Math.max(COMBAT_DISTANCE, paddedBodyRange);
}

const DEMON_TYPES = {
    Fear: resolveAssetUrl('images/monsters/fear_demon.png'),
    Condemnation: resolveAssetUrl('images/monsters/condemnation_demon.png'),
    Unbelief: resolveAssetUrl('images/monsters/unbelief_demon.png'),
    Ignorance: resolveAssetUrl('images/monsters/ignorance_spirit.png'),
    Depression: resolveAssetUrl('images/monsters/depression_spirit.png'),
    Strife: resolveAssetUrl('images/monsters/strife_spirit.png'),
    Confusion: resolveAssetUrl('images/monsters/confusion_spirit.png'),
    Infirmity: resolveAssetUrl('images/monsters/infirmity_spirit.png'),
    Doubt: resolveAssetUrl('images/monsters/doubt_spirit.png'),
    Deception: resolveAssetUrl('images/monsters/DECEPTION_SPIRIT1.png'),
    Despair: resolveAssetUrl('images/monsters/DISCOURAGEMENT.png'),
    Pride: resolveAssetUrl('images/monsters/PRIDE.png'),
    Temptation: resolveAssetUrl('images/monsters/JEZEBEL.png'),
    Poverty: resolveAssetUrl('images/monsters/DEMON-OF-POVERTY.png'),
    Shame: resolveAssetUrl('images/monsters/SHAME-ACCUSATION.png'),
    Blindness: resolveAssetUrl('images/monsters/SPIRITUALBLINDNESS.png'),
    Swarm: resolveAssetUrl('images/monsters/DEMON-SWARM.png')
};

async function ensureDemonImagesLoaded() {
    const demonTypes = Object.keys(DEMON_TYPES);
    const hasAllLoadedSprites = demonImages
        && demonTypes.every((demonType) => {
            const img = demonImages[demonType];
            return img && img.complete && img.naturalWidth > 0;
        });

    if (hasAllLoadedSprites) {
        return demonImages;
    }

    demonImages = demonImages || {};

    const demonImagePromises = demonTypes.map((demonType) => {
        return new Promise((resolve, reject) => {
            const expectedSrc = DEMON_TYPES[demonType];
            let img = demonImages[demonType];

            if (img && img.complete && img.naturalWidth > 0 && img.src === expectedSrc) {
                resolve(img);
                return;
            }

            img = new Image();
            demonImages[demonType] = img;

            img.onload = function () {
                img.onload = null;
                img.onerror = null;
                console.log(`${demonType} demon image loaded`);
                resolve(img);
            };
            img.onerror = function (error) {
                img.onload = null;
                img.onerror = null;
                console.error(`Error loading ${demonType} demon image`);
                reject(error || new Error(`Failed to load ${demonType} demon image`));
            };
            img.src = expectedSrc;
        });
    });

    await Promise.all(demonImagePromises);
    console.log('All demon images loaded');
    return demonImages;
}

const levelXPRequirements = LevelConfig.levelXPRequirements;

// Audio assets - Enhanced sound effects with variety
const bulletImpact = new Audio(`${scriptDirectory}/sounds/bullet_impact.mp3`);
const monsterExplosion = new Audio(`${scriptDirectory}/sounds/monster_explosion.mp3`);
const levelUpSound = new Audio(`${scriptDirectory}/sounds/level_up.mp3`);
const playerHit = new Audio(`${scriptDirectory}/sounds/player_attacked.mp3`);
const attackSound = new Audio(`${scriptDirectory}/sounds/monster_attacked.mp3`);

const swordStrike = new Audio(`${scriptDirectory}/sounds/sword-strikes-armor-2765.mp3`);
const punchSound = new Audio(`${scriptDirectory}/sounds/punch-through-air-2141.mp3`);
const arrowSound = new Audio(`${scriptDirectory}/sounds/arrow-shot-through-air-2771.mp3`);
const healPickup = new Audio(`${scriptDirectory}/sounds/heal_pickup.mp3`);

// Legacy sounds (keeping preferred old ones)
const healingRecharge = new Audio(`${scriptDirectory}/sounds/healing_recharge.mp3`);
const demonDies = monsterExplosion;
const gameOver = new Audio(`${scriptDirectory}/sounds/game_over.mp3`);

// Sound pools for variety
const attackSounds = [attackSound, swordStrike, punchSound, arrowSound];
const damageSounds = [playerHit, bulletImpact];
let attackSoundIndex = 0;
let damageSoundIndex = 0;

function playAttackSound() {
    if (Math.random() < 0.4) {
        SoundEffects.playAttack();
    } else {
        const sound = attackSounds[attackSoundIndex];
        attackSoundIndex = (attackSoundIndex + 1) % attackSounds.length;
        sound.currentTime = 0;
        sound.volume = 0.5;
        sound.play().catch(() => {});
    }
}

function playDamageSound() {
    if (Math.random() < 0.3) {
        SoundEffects.playDamage();
    } else {
        const sound = damageSounds[damageSoundIndex];
        damageSoundIndex = (damageSoundIndex + 1) % damageSounds.length;
        sound.currentTime = 0;
        sound.volume = 0.6;
        sound.play().catch(() => {});
    }
}

function playBulletSound() {
    if (Math.random() < 0.5) {
        SoundEffects.playBullet();
    } else {
        bulletImpact.currentTime = 0;
        bulletImpact.volume = 0.4;
        bulletImpact.play().catch(() => {});
    }
}

function playMonsterDeathSound() {
    if (Math.random() < 0.4) {
        SoundEffects.playMonsterDeath();
    } else {
        monsterExplosion.currentTime = 0;
        monsterExplosion.volume = 0.7;
        monsterExplosion.play().catch(() => {});
    }
}

let currentVerseIndex = null; // Index of the currently displayed verse
let verseTimer = null; // Timer for displaying the next verse
let incorrectAnswerReferences = [];
let currentReviewMode = 'quality'; // Possible values: 'incorrect', 'quality'
let lastStrongHitAt = 0;

// Daily Challenge State
let dailyChallengeGoal = 5;  // Answer 5 first-letter quizzes correctly
let dailyChallengeProgress = 0;
let dailyChallengeCompleted = false;

// Verse Learning Tracker (only first_letter mode)
let versesLearned = 0;  // Total verses learned via 2-letter challenge
const TOTAL_VERSES = 1618;  // Total verses in bible-verses.js

// Game-Over Modal State
let gameOverModalVisible = false;
let startHereSummaryState = null;
let sessionStartTime = null;  // Set when game starts
let finalStats = {
    level: 1,
    monstersKilled: 0,
    versesLearned: 0,
    timePlayed: 0  // seconds
};
let restartButtonRect = { x: 0, y: 0, width: 0, height: 0 };
window.startHereSummaryState = null;

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

function clearToasts() {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    container.innerHTML = '';
}

/**
 * Show quick-start overlay for FTUE (auto-dismisses after 4 seconds)
 * @returns {Promise} Resolves when overlay is dismissed
 */
function showQuickStartOverlay() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('quickStartOverlay');
        const countdownEl = document.getElementById('quickStartCountdown');
        const dismissBtn = document.getElementById('quickStartDismiss');
        
        if (!overlay) {
            resolve();
            return;
        }
        
        overlay.style.display = 'flex';
        let seconds = 4;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                overlay.style.display = 'none';
                resolve();
            }
        }, 1000);
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                clearInterval(countdownInterval);
                overlay.style.display = 'none';
                resolve();
            }, { once: true });
        }
        
        // Allow click on overlay background to dismiss
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                clearInterval(countdownInterval);
                overlay.style.display = 'none';
                resolve();
            }
        }, { once: true });
    });
}

/**
 * Update UI elements for offline mode
 * Hides multiplayer button, checks offline toggle, shows toast
 */
function updateUIForOfflineMode() {
    const offlineToggle = document.getElementById('offlineModeToggle');
    if (offlineToggle) {
        offlineToggle.checked = true;
    }
    
    showToast(t('toasts.offlineMode'), 3000);
}

/**
 * Set offline mode and persist preference
 * @param {boolean} enabled 
 */
function setOfflineMode(enabled) {
    offlineMode = enabled;
    localStorage.setItem('offlinePreferred', enabled.toString());
    
    if (window.Analytics) Analytics.trackOfflineToggle(enabled);
    
    const offlineToggle = document.getElementById('offlineModeToggle');
    if (offlineToggle) {
        offlineToggle.checked = enabled;
    }
    
    if (enabled) {
        showToast(t('toasts.offlineMode'), 3000);
    }
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

async function loadVerses() {
    console.log("gameCategory: " + gameCategory);
    loadVersesFromBundle();
}

function loadVersesFromBundle() {
    let verses;
    const lang = typeof I18n !== 'undefined' ? I18n.getLang() : 'en';
    
    // Use Spanish verses if language is Spanish and function exists
    if (lang === 'es' && typeof loadSelectedVersesES === 'function') {
        console.log('Loading Spanish verses from bundle');
        verses = loadSelectedVersesES();
    } else if (lang === 'lg' && typeof loadSelectedVersesLG === 'function') {
        console.log('Loading Luganda verses from bundle');
        verses = loadSelectedVersesLG();
    } else if (lang === 'hi' && typeof loadSelectedVersesHI === 'function') {
        console.log('Loading Hindi verses from bundle');
        verses = loadSelectedVersesHI();
    } else if (lang === 'hi-rom' && typeof loadSelectedVersesHIRom === 'function') {
        console.log('Loading Romanized Hindi verses from bundle');
        verses = loadSelectedVersesHIRom();
    } else if (lang === 'zw' && typeof loadSelectedVersesZW === 'function') {
        console.log('Loading Swahili verses from bundle');
        verses = loadSelectedVersesZW();
    } else if (lang === 'kr' && typeof loadSelectedVersesKR === 'function') {
        console.log('Loading Korean verses from bundle');
        verses = loadSelectedVersesKR();
    } else if (typeof loadSelectedVerses === 'function') {
        console.log('Loading English verses from bundle');
        verses = loadSelectedVerses();
    } else {
        console.error('No verse bundle available');
        organizedVerses = {};
        return;
    }
    
    // Filter by category if specified
    let filteredVerses = verses;
    if (gameCategory && gameCategory !== 'All') {
        filteredVerses = verses.filter(function(v) {
            return v.Category === gameCategory;
        });
        console.log('Filtered to', filteredVerses.length, 'verses for category:', gameCategory);
    }
    
    organizedVerses = QuizManager.organizeByCategory2(filteredVerses);
    if (typeof window !== 'undefined') {
        window.organizedVerses = organizedVerses;
    }
}

function getFreezeAuraMoveFactor(player, monsters, now) {
    if (!player || !monsters || !monsters.length) return 1.0;

    let hasNearbyParalyzer = false;
    for (const monster of monsters) {
        if (!monster.freezeAura) continue;
        const mdx = monster.x - player.x;
        const mdy = monster.y - player.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < Constants.FREEZE_AURA_RADIUS) {
            hasNearbyParalyzer = true;
            break;
        }
    }

    if (!hasNearbyParalyzer) {
        player.freezeAuraActiveSince = 0;
        player.freezeAuraRecoveryUntil = 0;
        return 1.0;
    }

    if ((player.freezeAuraRecoveryUntil || 0) > now) {
        return 1.0;
    }

    if (!player.freezeAuraActiveSince) {
        player.freezeAuraActiveSince = now;
    }

    if (now - player.freezeAuraActiveSince >= Constants.FREEZE_AURA_MAX_DURATION) {
        player.freezeAuraActiveSince = 0;
        player.freezeAuraRecoveryUntil = now + Constants.FREEZE_AURA_RECOVERY;
        return 1.0;
    }

    return Math.max(Constants.FREEZE_AURA_SLOW, Constants.FREEZE_AURA_MIN_SPEED_FACTOR);
}

function isStartHereMission(mission) {
    return !!(mission && mission.worldId === START_HERE_WORLD_ID && mission.id === START_HERE_MISSION_ID);
}

function shouldShowIntroMissionPitch() {
    return isStartHereMission(currentMission);
}

function resetOnboardingGuideState() {
    onboardingGuideState = null;
}

function clearStartHereSummaryState() {
    startHereSummaryState = null;
    window.startHereSummaryState = null;
}

function showStartHereSummary() {
    const learnedCategory = window.vQuality || 'Faith';
    startHereSummaryState = {
        title: 'First Victory Complete',
        lines: [
            'You moved into range before fighting.',
            'Correct verse answers power your attacks.',
            'Learning verses prepared you to defeat the Fear Guard.'
        ],
        ctaLabel: 'Choose what to do next',
        buttons: [
            { id: 'missions', label: 'Play Missions' },
            { id: 'solo', label: 'Play Solo' },
            { id: 'learn', label: 'Learn Verses', vQuality: learnedCategory }
        ],
        buttonRects: []
    };
    window.startHereSummaryState = startHereSummaryState;
}

function handleStartHereSummaryAction(actionId) {
    if (!startHereSummaryState || !currentMission) return;

    const selectedButton = (startHereSummaryState.buttons || []).find((button) => button.id === actionId);
    const reviewQuality = selectedButton && selectedButton.vQuality ? selectedButton.vQuality : window.vQuality;

    completeMission(3);
    gameOverFlag = false;
    gameOverModalVisible = false;
    clearStartHereSummaryState();

    if (actionId === 'missions') {
        returnToOverland();
        return;
    }

    if (actionId === 'learn') {
        startReviewModeManaged({ returnTo: 'overland', vQuality: reviewQuality });
        return;
    }

    startGame('solo');
}

window.handleStartHereSummaryClick = handleStartHereSummaryAction;

function ensureOnboardingGuideState(player) {
    if (!isStartHereMission(currentMission) || !player) {
        onboardingGuideState = null;
        return null;
    }
    if (!onboardingGuideState || onboardingGuideState.missionId !== currentMission.id) {
        const introMonsters = ((currentMission && currentMission.fixedMonsters) || []).filter((monster) => monster && typeof monster.x === 'number' && typeof monster.y === 'number');
        const introTarget = introMonsters
            .filter((monster) => !monster.isBoss)
            .sort((a, b) => {
                const healthA = (a.stats && a.stats.healthMultiplier) || 1;
                const healthB = (b.stats && b.stats.healthMultiplier) || 1;
                if (healthA !== healthB) return healthA - healthB;
                const distA = Math.hypot((player.x || 0) - a.x, (player.y || 0) - a.y);
                const distB = Math.hypot((player.x || 0) - b.x, (player.y || 0) - b.y);
                return distA - distB;
            })[0];
        const bossTarget = introMonsters.find((monster) => monster && monster.isBoss);
        const buildMoveTarget = (targetMonster) => {
            if (!targetMonster) {
                return {
                    x: (player.x || 0) + 120,
                    y: player.y || 0
                };
            }
            const dx = (player.x || 0) - targetMonster.x;
            const dy = (player.y || 0) - targetMonster.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            return {
                x: targetMonster.x + (dx / distance) * 180,
                y: targetMonster.y + (dy / distance) * 180
            };
        };
        onboardingGuideState = {
            missionId: currentMission.id,
            createdAt: Date.now(),
            startX: player.x,
            startY: player.y,
            step: START_HERE_STEP_MOVE,
            hasMoved: false,
            moveTracked: false,
            firstCorrectTracked: false,
            learnOpened: false,
            learnTracked: false,
            learnReturned: false,
            learnReturnedTracked: false,
            firstKillTracked: false,
            moveTarget: buildMoveTarget(introTarget),
            moveTargetReached: false,
            bossMoveTarget: buildMoveTarget(bossTarget),
            bossMoveTargetReached: false,
            finishReady: false
        };
    }
    return onboardingGuideState;
}

function advanceStartHereStep(nextStep) {
    if (!onboardingGuideState || !nextStep) return;
    onboardingGuideState.step = nextStep;
}

function markStartHereLearnReturned() {
    if (!isStartHereMission(currentMission)) return;
    const state = ensureOnboardingGuideState(player);
    if (!state) return;
    state.learnReturned = true;
    if (!state.learnReturnedTracked && window.Analytics) {
        state.learnReturnedTracked = true;
        Analytics.trackOnboardingMissionStep('learn_returned', {
            mission_id: currentMission.id
        });
    }
    if (state.step === START_HERE_STEP_LEARN) {
        advanceStartHereStep(START_HERE_STEP_FINISH);
    }
}

function buildStartHereGuide(player, monsters) {
    const state = ensureOnboardingGuideState(player);
    if (!state || window.gameMode !== 'game') return null;

    const movedDistance = Math.hypot((player.x || 0) - state.startX, (player.y || 0) - state.startY);
    if (movedDistance >= START_HERE_MOVE_DISTANCE) {
        state.hasMoved = true;
        state.moveTargetReached = true;
    }
    if (state.hasMoved && !state.moveTracked && window.Analytics) {
        state.moveTracked = true;
        Analytics.trackOnboardingMissionStep('move_completed', {
            mission_id: currentMission.id
        });
    }
    if (state.moveTarget) {
        const moveTargetDistance = Math.hypot((player.x || 0) - state.moveTarget.x, (player.y || 0) - state.moveTarget.y);
        if (moveTargetDistance <= START_HERE_MOVE_DISTANCE) {
            state.moveTargetReached = true;
        }
    }
    if (state.bossMoveTarget) {
        const bossMoveTargetDistance = Math.hypot((player.x || 0) - state.bossMoveTarget.x, (player.y || 0) - state.bossMoveTarget.y);
        if (bossMoveTargetDistance <= START_HERE_MOVE_DISTANCE) {
            state.bossMoveTargetReached = true;
        }
    }
    if (state.learnOpened && !state.learnTracked && window.Analytics) {
        state.learnTracked = true;
        Analytics.trackOnboardingMissionStep('learn_opened', {
            mission_id: currentMission.id
        });
    }
    const guardBossAlive = (monsters || []).some((monster) => monster && monster.isBoss && monster.health > 0);
    const kills = gameState.monstersKilled || 0;

    if (state.step === START_HERE_STEP_MOVE) {
        if (Date.now() - state.createdAt < START_HERE_HEALTH_GUIDE_MS) {
            return {
                target: 'hud',
                title: 'This is your health',
                text: 'Keep this high while you learn the basics.'
            };
        }
        if (state.moveTargetReached) {
            advanceStartHereStep(START_HERE_STEP_ANSWER);
        } else {
            return {
                target: 'move',
                title: 'Move here',
                text: 'Step close enough to fight the demon.',
                worldX: state.moveTarget.x,
                worldY: state.moveTarget.y
            };
        }
    }

    if (state.step === START_HERE_STEP_ANSWER) {
        if (state.firstCorrectTracked) {
            advanceStartHereStep(START_HERE_STEP_KILL);
        } else {
            return {
                target: 'answers',
                title: 'Tap the right answer',
                text: 'A correct cloze verse answer powers your attack.'
            };
        }
    }

    if (state.step === START_HERE_STEP_KILL) {
        if (kills >= 1) {
            advanceStartHereStep(START_HERE_STEP_LEARN);
        } else {
            return {
                target: 'answers',
                title: 'Good. Now finish it',
                text: 'Keep answering Scripture to defeat the demon.'
            };
        }
    }

    if (state.step === START_HERE_STEP_LEARN) {
        if (guardBossAlive && !state.bossMoveTargetReached && state.bossMoveTarget) {
            return {
                target: 'move',
                title: 'Move to the Fear Guard',
                text: 'Step closer so you can face the stronger demon.',
                worldX: state.bossMoveTarget.x,
                worldY: state.bossMoveTarget.y
            };
        }
        if (state.learnReturned) {
            advanceStartHereStep(START_HERE_STEP_FINISH);
        } else {
            return {
                target: 'learn',
                title: 'Learn verses here',
                text: 'This guard is tougher. Learn first, then come back.'
            };
        }
    }

    if (state.step === START_HERE_STEP_FINISH) {
        state.finishReady = true;
        if (guardBossAlive) {
            return {
                target: 'answers',
                title: 'Use what you learned',
                text: 'Answer the cloze verse and defeat the Fear Guard.'
            };
        }
    }

    return null;
}

function captureBaseContentState() {
    if (!baseOrganizedVerses && organizedVerses) {
        baseOrganizedVerses = organizedVerses;
    }
    if (!baseAllQualities && Array.isArray(ALL_QUALITIES)) {
        baseAllQualities = ALL_QUALITIES.slice();
    }
}

function applyMissionContentOverride(override) {
    if (!override || !override.organizedVerses) return false;
    captureBaseContentState();
    organizedVerses = override.organizedVerses;
    ALL_QUALITIES = override.allQualities.slice();
    QUALITIES = override.allQualities.slice();
    window._discipleshipMissionContent = override;
    window.organizedVerses = organizedVerses;
    return true;
}

function clearMissionContentOverride() {
    pendingMissionContentOverride = null;
    window._discipleshipMissionContent = null;
    if (baseOrganizedVerses) {
        organizedVerses = baseOrganizedVerses;
    }
    if (baseAllQualities) {
        ALL_QUALITIES = baseAllQualities.slice();
        QUALITIES = baseAllQualities.slice();
    }
    window.organizedVerses = organizedVerses;
}

// === Custom Config Loading (from URL or localStorage) ===

function loadUrlConfig() {
    if (typeof ConfigEncoder === 'undefined') {
        console.log('ConfigEncoder not available');
        return null;
    }
    
    const config = ConfigEncoder.getFromURL();
    if (!config) {
        console.log('No URL config found');
        return null;
    }
    
    console.log('Found URL config:', config);
    return config;
}

function loadSavedConfig() {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
        if (saved) {
            const config = JSON.parse(saved);
            console.log('Loaded saved config from localStorage:', config);
            return config;
        }
    } catch (e) {
        console.warn('Failed to load saved config:', e);
    }
    return null;
}

function saveConfig(config) {
    if (!config) return;
    try {
        localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
        console.log('Config saved to localStorage');
    } catch (e) {
        console.warn('Failed to save config:', e);
    }
}

function applyConfig(config) {
    if (!config || !config.balance) {
        console.log('No valid config to apply');
        return false;
    }
    
    if (typeof GameConfig !== 'undefined' && GameConfig.createFromCustomBalance) {
        const gameConfig = GameConfig.createFromCustomBalance(config.balance, config.quizSettings || null, config.levels || null);
        customLevelData = gameConfig.levelData;
        customMonsterHealthMultiplier = gameConfig.monsterHealthMultiplier;

        urlConfig = config;
        console.log('Custom config applied:', gameConfig);
        return true;
    }
    
    console.warn('GameConfig.createFromCustomBalance not available');
    return false;
}

function setLevelData(gameState) {
    const activeLevelData = customLevelData || levelData;
    const numLevels = Object.keys(activeLevelData).length;
    console.log("Number of levels:", numLevels, customLevelData ? "(custom)" : "(default)");
    if (numLevels >= gameState.gameLevel) {
        const levelConfig = activeLevelData[gameState.gameLevel];
        // Filter qualities to only include categories that exist in the content
        QUALITIES = levelConfig.qualities.filter(function (q) { return ALL_QUALITIES.includes(q); });
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

/**
 * Reset all game-scoped state between games.
 * Called at the start of every new game to prevent stale state leaks.
 */
function resetGameState() {
    // Network & identity
    if (network) {
        network.disconnect();
        network = null;
    }
    playerCode = null;
    player = { x: 0, y: 0, health: 100, maxHealth: 100, width: 48, height: 48, xp: 0, level: 1, ammo: 0, viewAngle: 0 };

    // Game flags
    gameOverFlag = false;
    gameOverModalVisible = false;
    isGameLoaded = false;
    _gameLoopRunning = false;
    _gameGeneration++; // Stop any old game loop chain

    // Level transition state
    if (levelAdvanceTimer) clearInterval(levelAdvanceTimer);
    levelAdvanceTimer = null;
    levelCompleted = false;
    levelAdvanceCountdown = 0;
    movementFrozen = false;
    levelTransitionStartTime = 0;

    // Game state — fresh object so no stale references
    gameState = {
        players: {},
        monsters: [],
        healingPoints: [],
        collectibles: [],
        connectedPlayers: 0,
        gameLevel: 1,
        terrainTheme: 'stone',
        maxSpawns: 0,
        spawnsLeft: 0,
        monstersKilled: 0,
        monstersToKill: 10,
        bullets: []
    };
    monsters = [];
    healingPoints = [];

    // Custom config — reset so solo games don't inherit mission config
    customLevelData = null;
    customMonsterHealthMultiplier = 1.0;
    urlConfig = null;
    meleeHitProbabilityNoAnswer = 0.0;
    window.funModeNoQuizPenalty = false;
    window.funModeBonusHealth = 0;
    window.funModeBonusAmmo = 0;

    // Camera
    camera = { x: 0, y: 0 };

    // Visual effects
    flashMessages = [];
    damageNumbers = [];
    deathParticles = [];
    screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    clearCombatHint();
    resetCombatStruggleState();
    resetOnboardingGuideState();

    // Inventory & buffs
    inventory = { sword: 0, belt: 0, helmet: 0, breastplate: 0, sandals: 0, shield: 0 };
    activeBuffs = {
        sword: { active: false, endTime: 0 },
        shield: { active: false, endTime: 0 },
        breastplate: { active: false, endTime: 0 },
        sandals: { active: false, endTime: 0 }
    };
    inventoryOpen = false;

    // Input
    if (inputHandler) {
        inputHandler.clearTarget();
        if (inputHandler.viewMode === '3d' && typeof inputHandler.stopForwardMovement === 'function') {
            inputHandler.stopForwardMovement();
        }
        inputHandler.setCamera(camera);
    }
    _lastPositionSendTime = 0;
    _lastSentX = 0;
    _lastSentY = 0;

    // Quiz state
    currentQuiz = null;
    answerFullVerse = null;
    isAnswerCorrect = null;

    // Combat
    lastAttackTime = 0;
    lastAttackedMonster = null;
    explosionTimer = 0;

    // Misc game state
    finalStats = { level: 1, monstersKilled: 0, versesLearned: 0, timePlayed: 0 };
    sessionStartTime = Date.now();
    goalsOverlayVisible = false;
    menuOpen = false;
    categoryPickerOpen = false;
    clearStartHereSummaryState();
    modalPaused = false;
    modalPauseStartTime = 0;
    verseTestShieldActive = false;
    votdAutoLaunchHandled = false;

    // Mission state
    currentMission = null;
    currentMissionConfig = null;

    // Walls
    clientWalls = [];
    clientWallGrid = null;
}

function detachActiveGameplayForLearnMode() {
    const preservedEnterReview = window._enterReviewAfterInit;
    resetGameState();
    window._enterReviewAfterInit = preservedEnterReview;
    window.gameMode = 'review';
    canvas.style.display = 'block';
}

function clearReviewAndLearnDeeplinkState() {
    window._enterReviewAfterInit = false;
    pendingMissionContentOverride = null;
    currentMission = null;
    currentMissionConfig = null;
    window.currentMission = null;
    clearMissionContentOverride();
    if (reviewClickHandler) {
        canvas.removeEventListener('click', reviewClickHandler);
        reviewClickHandler = null;
    }
}

let modeManagerInitialized = false;

function initializeModeManager() {
    if (modeManagerInitialized || !window.ModeManager) return;

    ModeManager.register({
        id: 'menu',
        legacyGameMode: 'menu',
        start: function () {
            showMainMenuInternal();
        }
    });

    ModeManager.register({
        id: 'soloDungeon',
        legacyGameMode: 'game',
        start: function (context) {
            context = context || {};
            _startGameInternal(context.mode, context.roomId, context.missionOpts);
        },
        handleResize: function () {
            ensureCanvasSize();
        }
    });

    ModeManager.register({
        id: 'wave',
        legacyGameMode: 'waveGame',
        canStart: function (context) {
            return !!(context && typeof context.launch === 'function');
        },
        start: function (context) {
            return context.launch();
        },
        stop: function () {
            if (window.WaveGameLauncher && typeof WaveGameLauncher.isRunning === 'function' && WaveGameLauncher.isRunning()) {
                WaveGameLauncher.stop();
            }
        },
        handleResize: function () {
            ensureCanvasSize();
        }
    });

    ModeManager.register({
        id: 'scriptureMaze',
        legacyGameMode: 'scriptureMaze',
        canStart: function (context) {
            return !!(context && typeof context.launch === 'function');
        },
        start: function (context) {
            return context.launch();
        },
        stop: function () {
            if (window.ScriptureMazeLauncher && typeof ScriptureMazeLauncher.isRunning === 'function' && ScriptureMazeLauncher.isRunning()) {
                ScriptureMazeLauncher.stop();
            }
        },
        handleResize: function () {
            ensureCanvasSize();
        }
    });

    ModeManager.register({
        id: 'overland',
        legacyGameMode: 'overland',
        start: function () {
            return showOverlandInternal();
        },
        handleResize: function () {
            ensureCanvasSize();
        }
    });

    ModeManager.register({
        id: 'review',
        legacyGameMode: 'review',
        canStart: function () {
            return !!window.ReviewMode;
        },
        start: function (context) {
            context = context || {};
            return ReviewMode.startReviewMode(context.options || {});
        },
        handleResize: function () {
            ensureCanvasSize();
        }
    });

    modeManagerInitialized = true;
}

function startReviewModeManaged(options) {
    if (window.ModeManager && typeof window.ModeManager.start === 'function') {
        return ModeManager.start('review', { options: options || {} });
    }
    return ReviewMode.startReviewMode(options || {});
}

function showMainMenuInternal() {
    clearReviewAndLearnDeeplinkState();
    resetGameState();
    window.gameMode = 'menu';
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) {
        menuScreen.style.display = '';
        menuScreen.style.pointerEvents = 'auto';
        menuScreen.style.zIndex = '20';
    }
    canvas.style.display = 'none';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
}

function showMainMenu() {
    if (window.ModeManager && typeof window.ModeManager.start === 'function') {
        return ModeManager.start('menu');
    }
    showMainMenuInternal();
}

function _startGameInternal(mode, roomId, missionOpts) {
    // Remove overland click handler so it doesn't fire during gameplay
    if (overlandClickHandler) {
        canvas.removeEventListener('click', overlandClickHandler);
        overlandClickHandler = null;
    }

    // ===== FUN MODE: Fast arcade action =====
    if (mode === 'fun') {
        console.log('Starting FUN mode - arcade action!');
        
        // Reset game state first (prevents undefined variables)
        resetGameState();
        
        // FUN mode uses LocalNetwork for fast local gameplay
        offlineMode = true;
        localStorage.setItem('offlinePreferred', 'true');
        
        if (window.Analytics) {
            Analytics.trackGameStart('fun', true);
            Analytics.startSession(true);
        }
        
        network = new LocalNetwork();
        
        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';
        
        // Show FUN mode indicator (after canvas is displayed)
        setTimeout(() => {
            flashMessages.push({
                text: '🎮 FUN MODE! 🎮',
                color: '#FFD700',
                startTime: Date.now(),
                duration: 3000
            });
        }, 100);
        
        init().then(() => {
            // FUN mode uses the 'fun' preset with balanced quizzes
            const quizSettings = getQuizSettingsFromSliders();
            const mapStyle = document.getElementById('mapStyleSelect') ? document.getElementById('mapStyleSelect').value : 'classic';
            network.sendStartSoloGame('fun', quizSettings, 'normal', mapStyle);
            if (!_gameLoopRunning) gameLoop();
        }).catch((error) => {
            console.error('Error initializing game:', error);
        });
        return;
    }

    // Preserve mission state if starting a mission (resetGameState clears it)
    const preservedMission = currentMission;
    const preservedMissionConfig = currentMissionConfig;

    // Reset all game state to prevent leaks between games
    resetGameState();

    // Restore mission state if this is a mission game
    if (missionOpts && mode === 'solo') {
        currentMission = preservedMission;
        currentMissionConfig = preservedMissionConfig;
        window.currentMission = currentMission;
        console.log('[MISSION] Restored mission state after resetGameState:', currentMission?.name);
    } else {
        currentMission = null;
        currentMissionConfig = null;
        window.currentMission = null;
    }

    // Handle mission config passed directly from startMission()
    if (missionOpts && mode === 'solo') {
        console.log('Starting mission game with config');

        // Force offline mode for missions
        offlineMode = true;
        localStorage.setItem('offlinePreferred', 'true');
    }

    // Check for URL config - only applies to solo/offline mode
    const urlConfigData = (mode === 'solo') ? loadUrlConfig() : null;

    // Use mission config or URL config (mission takes priority)
    const configData = (missionOpts && missionOpts.config) || urlConfigData;

    if (configData) {
        // Custom config present - auto-start with settings
        console.log('Auto-starting with', missionOpts ? 'mission' : 'URL', 'config');

        applyConfig(configData);
        if (!missionOpts && urlConfigData) saveConfig(urlConfigData);
        
        // Force offline mode for URL config games
        offlineMode = true;
        localStorage.setItem('offlinePreferred', 'true');
        
        if (window.Analytics) {
            Analytics.trackGameStart('solo', true);
            Analytics.startSession(true);
        }
        
        network = new LocalNetwork();

        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '1';

        init().then(() => {
            // Use custom config settings - pass full urlConfig for level overrides
            const quizSettings = (configData.quizSettings && typeof configData.quizSettings === 'object')
                ? configData.quizSettings
                : getQuizSettingsFromSliders();
            const mapStyle = (missionOpts && missionOpts.mapStyle)
                || (document.getElementById('mapStyleSelect') ? document.getElementById('mapStyleSelect').value : 'classic');
            network.sendStartSoloGame('custom', quizSettings, 'normal', mapStyle, configData);
            if (!_gameLoopRunning) gameLoop();
        }).catch((error) => {
            console.error('Error initializing game:', error);
        });
        return;
    }
    
    // No URL config - check for saved config to pre-fill sliders
    if (mode === 'solo') {
        const savedConfig = loadSavedConfig();
        const skipSavedConfig = !!(window._enterReviewAfterInit && window._enterReviewAfterInit.deeplinkLearn);
        if (!skipSavedConfig && savedConfig && savedConfig.balance) {
            console.log('Using saved config from localStorage');
            applyConfig(savedConfig);
        }
    }
    
    if (window.Analytics) {
        Analytics.trackGameStart(mode, offlineMode);
        Analytics.startSession(offlineMode);
    }

    const offlineToggle = document.getElementById('offlineModeToggle');
    if (offlineToggle && mode === 'solo') {
        offlineMode = offlineToggle.checked;
        localStorage.setItem('offlinePreferred', offlineMode.toString());
    } else if (mode === 'join' || mode === 'host') {
        // Always disable offline mode for multiplayer
        offlineMode = false;
        if (offlineToggle) offlineToggle.checked = false;
    }

    // Disconnect existing network if needed
    if (network && typeof network.disconnect === 'function') {
        network.disconnect();
    }

    // In offline mode, replace the global network with a LocalNetwork
    if (offlineMode && mode === 'solo') {
        network = new LocalNetwork();
    } else {
        // Create fresh Network instance for multiplayer or online solo
        network = new Network();
    }

    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.style.display = 'none';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '1';

    init().then(() => {
        if (mode === 'solo') {
            // Get solo game settings from sliders
            const difficultySlider = document.getElementById('difficultySlider');
            const speedSlider = document.getElementById('speedSlider');

            const diffValue = difficultySlider ? parseInt(difficultySlider.value, 10) : 50;
            const speedValue = speedSlider ? parseInt(speedSlider.value, 10) : 50;

            const soloDifficulty = diffValue < 25 ? 'easy' : (diffValue > 75 ? 'hard' : 'normal');
            const gameSpeed = speedValue < 25 ? 'slow' : (speedValue > 75 ? 'fast' : 'normal');
            const mapStyle = document.getElementById('mapStyleSelect') ? document.getElementById('mapStyleSelect').value : 'classic';
            const quizSettings = getQuizSettingsFromSliders();

            network.sendStartSoloGame(soloDifficulty, quizSettings, gameSpeed, mapStyle);
        } else if (mode === 'join' && roomId) {
            network.sendJoinGame(roomId);
        }
        if (!_gameLoopRunning) gameLoop();

        // If launched from "Learn Verses" button, immediately enter review mode
        if (window._enterReviewAfterInit) {
            const reviewLaunchOptions = window._enterReviewAfterInit === true
                ? {}
                : { ...window._enterReviewAfterInit };
            window._enterReviewAfterInit = false;
            // Small delay to let the game state fully initialize
            setTimeout(() => {
                if (window.ReviewMode) {
                    if (reviewLaunchOptions && reviewLaunchOptions.requestedQuality) {
                        const resolvedQuality = normalizeRequestedLearnQuality(reviewLaunchOptions.requestedQuality);
                        if (resolvedQuality) {
                            reviewLaunchOptions.vQuality = resolvedQuality;
                        }
                        delete reviewLaunchOptions.requestedQuality;
                    }
                    const shouldDetachGameplay = !!reviewLaunchOptions.deeplinkLearn;
                    delete reviewLaunchOptions.deeplinkLearn;
                    if (shouldDetachGameplay) {
                        detachActiveGameplayForLearnMode();
                        if (!_gameLoopRunning) gameLoop();
                    }
                    ReviewMode.saveGameState();
                    startReviewModeManaged(reviewLaunchOptions);
                }
            }, 500);
        }
    }).catch((error) => {
        console.error('Error initializing game:', error);
    });
}

function startGame(mode, roomId, missionOpts) {
    if (window.ModeManager && typeof window.ModeManager.start === 'function' &&
        (mode === 'solo' || mode === 'join' || mode === 'fun')) {
        return ModeManager.start('soloDungeon', {
            mode: mode,
            roomId: roomId,
            missionOpts: missionOpts
        });
    }
    return _startGameInternal(mode, roomId, missionOpts);
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

let mainMenuButtonsInitialized = false;

function setupMainMenuButtons() {
    if (mainMenuButtonsInitialized) return;
    mainMenuButtonsInitialized = true;

    document.getElementById('btnSolo').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('solo');
        startDefaultSoloExperience();
    });
    document.getElementById('btnMultiplayer').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('multiplayer');
        if (!navigator.onLine) {
            showToast(t('toasts.multiplayerRequiresInternet'), 3000);
            return;
        }
        window.location.href = '/lobby';
    });
    document.getElementById('btnCustomGame').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('custom_game');
        window.location.href = '/config';
    });
    document.getElementById('btnMissions').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('missions');
        const menuScreen = document.getElementById('menuScreen');
        if (menuScreen) menuScreen.style.display = 'none';
        showOverland();
    });
    const discipleshipTrackLink = document.getElementById('discipleshipTrackLink');
    if (discipleshipTrackLink) {
        discipleshipTrackLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (window.Analytics) Analytics.trackMenuClick('discipleship_track');
            openDiscipleshipTrackMenu().catch((error) => {
                console.error('Failed to open discipleship track', error);
            });
        });
    }
    document.getElementById('btnFunMode').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('fun_mode');
        startGame('fun');
    });
    document.getElementById('btnLearnVerses').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('learn_verses');
        window._enterReviewAfterInit = { returnTo: 'game' };
        startGame('solo');
    });
    document.getElementById('btnGroups').addEventListener('click', () => {
        if (window.Analytics) Analytics.trackMenuClick('groups');
        showGroupsPanel();
    });
    const worldsLink = document.getElementById('worldsLink');
    if (worldsLink) {
        worldsLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (window.Analytics) Analytics.trackMenuClick('worlds');
            showWorldBrowserPanel();
        });
    }
}

// Track verses already passed in verse test (reset each game session)
let passedVerseTests = new Set();

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
            // Only award health if this verse hasn't been passed before
            if (!passedVerseTests.has(ref)) {
                passedVerseTests.add(ref);
                network.sendVerseTestPassed();

                flashMessages.push({
                    text: `Verse Test Passed! +${Constants.VERSE_TEST_HEALTH_REWARD} HP`,
                    color: '#44ff44',
                    startTime: Date.now(),
                    duration: 2500
                });
            } else {
                flashMessages.push({
                    text: 'Verse Test Passed! (already completed)',
                    color: '#44ff44',
                    startTime: Date.now(),
                    duration: 2500
                });
            }
        } else {
            console.log('Verse test failed — no penalty');
        }
    });
}

// Wait for the DOM content to load
// Wait for the DOM content to load
document.addEventListener('DOMContentLoaded', function () {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    ctx = canvas.getContext('2d');
    initializeModeManager();
    installCombatHintDebugHooks();
    setupMainMenuButtons();

    // Parse URL params
    const roomId = urlParams.get('room');
    const mode = urlParams.get('mode');
    const requestedLearnQuality = urlParams.get('quality') || urlParams.get('category');
    persistViewMode(resolveInitialViewMode(urlParams));
    console.log('View mode:', viewMode);

    // Check for first-time visit
    const hasVisited = localStorage.getItem('hasVisited');
    
    // Check for persisted offline preference
    const persistedOffline = localStorage.getItem('offlinePreferred') === 'true';
    if (persistedOffline) {
        offlineMode = true;
    }

    const captureMode = urlParams.get('capture');

    if (roomId) {
        // Coming from lobby redirect — skip menu, join game
        startGame('join', roomId);
    } else if (mode === 'learn') {
        if (!hasVisited) {
            localStorage.setItem('hasVisited', 'true');
        }
        if (!navigator.onLine || persistedOffline) {
            offlineMode = true;
            updateUIForOfflineMode();
        }
        if (window.Analytics) Analytics.trackMenuClick('learn_deeplink');
        prepareLearnDeeplinkLaunch(requestedLearnQuality);
        startGame('solo');
    } else if (mode === 'solo') {
        // Lobby "Practice (Solo)" shortcut — skip menu
        startGame('solo');
    } else if (!hasVisited && urlParams.get('play') === '1') {
        // === FIRST TIME USER EXPERIENCE (AD TRAFFIC ONLY) ===
        // Auto-start only when ?play=1 is in URL (for ad campaigns)
        // Regular first-time visitors see the menu instead
        console.log("Ad traffic detected! Starting in offline mode.");
        
        // Mark as visited so next time they see the menu
        localStorage.setItem('hasVisited', 'true');

        // Force offline mode for first-time users
        offlineMode = true;
        localStorage.setItem('offlinePreferred', 'true');

        // Force Easy settings for first run
        const difficultySlider = document.getElementById('difficultySlider');
        if (difficultySlider) difficultySlider.value = 0;
        
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) speedSlider.value = 50;

        // Create LocalNetwork for offline play
        network = new LocalNetwork();

        // Show quick-start overlay, then start game
        showQuickStartOverlay().then(() => {
            startDefaultSoloExperience();
        });
    } else {
        // === RETURNING USER (or first-time without ?play=1) ===
        // Mark as visited so they see menu on future visits
        if (!hasVisited) {
            localStorage.setItem('hasVisited', 'true');
        }
        // Check if offline (no internet) and apply offline mode
        if (!navigator.onLine || persistedOffline) {
            offlineMode = true;
            updateUIForOfflineMode();
        }
        
        if (captureMode === 'worlds') {
            window.setTimeout(() => {
                showWorldBrowserPanel().catch((error) => {
                    console.error('Failed to auto-open worlds capture panel', error);
                });
            }, 250);
        }

        // Settings Toggle
        const btnSettings = document.getElementById('btnSettings');
        const settingsBackButton = document.getElementById('settingsBackButton');
        const settingsContainer = document.getElementById('settingsContainer');
        const menuGrid = document.querySelector('#menuScreen .menu-grid');
        const btnSolo = document.getElementById('btnSolo');
        const btnMultiplayer = document.getElementById('btnMultiplayer');
        const btnInstructions = document.getElementById('btnInstructions');
        const btnLearnVerses = document.getElementById('btnLearnVerses');
        const btnCustomGame = document.getElementById('btnCustomGame');
        const offlineModeLabel = document.getElementById('offlineModeLabel');
        const logoImg = document.querySelector('#menuScreen .logo-container img');
        
        if (btnSettings && settingsContainer) {
            const toggledMenuItems = [
                btnSolo,
                btnMultiplayer,
                btnInstructions,
                btnLearnVerses,
                btnCustomGame,
                offlineModeLabel
            ];
            const setSettingsMenuOpen = (isOpen) => {
                settingsContainer.style.display = isOpen ? 'block' : 'none';
                if (menuGrid) {
                    menuGrid.style.display = isOpen ? 'none' : '';
                }

                toggledMenuItems.forEach((element) => {
                    if (!element) return;
                    element.style.display = isOpen ? 'none' : 'block';
                });

                if (logoImg) {
                    logoImg.classList.toggle('logo-small', isOpen);
                }
            };

            btnSettings.addEventListener('click', () => {
                const isOpen = window.getComputedStyle(settingsContainer).display !== 'none';
                setSettingsMenuOpen(!isOpen);
            });

            if (settingsBackButton) {
                settingsBackButton.addEventListener('click', () => {
                    setSettingsMenuOpen(false);
                });
            }
        }

        const languageSelect = document.getElementById('languageSelect');
        const mainMenuLanguageSelect = document.getElementById('mainMenuLanguageSelect');
        const mainMenuViewModeSelect = document.getElementById('mainMenuViewModeSelect');
        const viewModeSelect = document.getElementById('viewModeSelect');
        const votdMenuToggle = document.getElementById('votdMenuToggle');

        const applyLanguageChange = (newLang) => {
            localStorage.setItem('lang', newLang);
            if (languageSelect) languageSelect.value = newLang;
            if (mainMenuLanguageSelect) mainMenuLanguageSelect.value = newLang;
            window.location.reload();
        };

        const currentLang = I18n.getLang();
        if (languageSelect) {
            languageSelect.value = currentLang;
            languageSelect.addEventListener('change', () => {
                applyLanguageChange(languageSelect.value);
            });
        }
        if (mainMenuLanguageSelect) {
            mainMenuLanguageSelect.value = currentLang;
            mainMenuLanguageSelect.addEventListener('change', () => {
                applyLanguageChange(mainMenuLanguageSelect.value);
            });
        }

        updateViewModeControls(viewMode);
        if (mainMenuViewModeSelect) {
            mainMenuViewModeSelect.addEventListener('change', () => {
                persistViewMode(mainMenuViewModeSelect.value);
                updateViewModeControls(viewMode);
            });
        }
        if (viewModeSelect) {
            viewModeSelect.addEventListener('change', () => {
                persistViewMode(viewModeSelect.value);
                updateViewModeControls(viewMode);
            });
        }

        if (votdMenuToggle && window.VotdMenuOverlay) {
            votdMenuToggle.checked = window.VotdMenuOverlay.isEnabled();
            votdMenuToggle.addEventListener('change', () => {
                window.VotdMenuOverlay.setEnabled(votdMenuToggle.checked);
                if (!votdMenuToggle.checked) {
                    window.VotdMenuOverlay.hide();
                }
            });
        }
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
    if (window.progressManager) {
        versesLearned = progressManager.getVersesLearnedCount();
    } else {
        versesLearned = parseInt(localStorage.getItem('versesLearned') || '0');
    }
    console.log(`Verses Learned: ${versesLearned}/${TOTAL_VERSES}`);
}

// Callback for QuizManager to notify of correct answers
window.onQuizCorrectAnswer = function (quizMode, verseReference, combatCategory) {
    // Store reference for display in UI
    lastAnsweredReference = verseReference;
    const isDiscipleshipMission = currentMission && currentMission.type === 'discipleship';
    const isStartHere = isStartHereMission(currentMission);

    if (player && combatCategory) {
        player.currentCombatCategory = combatCategory;
    }

    noteSuccessfulDamage();

    if (window.Analytics) {
        Analytics.trackQuizCorrect(quizMode, verseReference);
        if (isStartHere && onboardingGuideState && !onboardingGuideState.firstCorrectTracked) {
            onboardingGuideState.firstCorrectTracked = true;
            Analytics.trackOnboardingMissionStep('first_correct_answer', {
                mission_id: currentMission.id,
                quiz_mode: quizMode
            });
        }
    } else if (isStartHere && onboardingGuideState && !onboardingGuideState.firstCorrectTracked) {
        onboardingGuideState.firstCorrectTracked = true;
    }

    if (window.SoundEffects) {
        SoundEffects.playDing();
    }

    // ===== FUN MODE BONUSES (applied client-side + engine for persistence) =====
    if ((window.funModeBonusHealth || window.funModeBonusAmmo) && player) {
        var bonusHealth = window.funModeBonusHealth || 0;
        var bonusAmmo = window.funModeBonusAmmo || 0;
        
        if (bonusHealth > 0) {
            player.health = Math.min(player.health + bonusHealth, player.maxHealth);
            flashMessages.push({
                text: `+${bonusHealth} HP!`,
                color: '#44ff44',
                startTime: Date.now(),
                duration: 1500
            });
        }
        if (bonusAmmo > 0) {
            player.ammo = (player.ammo || 0) + bonusAmmo;
            flashMessages.push({
                text: `+${bonusAmmo} Ammo!`,
                color: '#4488ff',
                startTime: Date.now(),
                duration: 1500
            });
        }
        
        // Update engine state for persistence (sync, no delay)
        if (network && network.sendFunModeBonus) {
            network.sendFunModeBonus(bonusHealth, bonusAmmo);
        }
    }

    // ===== FIRST 60 SECONDS: Show "POWERED UP!" on first correct answer =====
    if (!firstGameTips.firstCorrectAnswer && isInOnboardingWindow()) {
        firstGameTips.firstCorrectAnswer = true;
        if (window.Analytics) Analytics.trackFtueTip('first_correct_answer');
        if (!isStartHere) {
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
    }

    if (isStartHere && onboardingGuideState && onboardingGuideState.step === START_HERE_STEP_ANSWER) {
        flashMessages.push({
            text: 'Correct answers power your attack',
            color: '#ffd666',
            startTime: Date.now(),
            duration: 2200
        });
        screenShake = { x: 0, y: 0, intensity: 5, duration: 180 };
    }

    // ===== ONBOARDING: Detect first ammo earned =====
    if (!firstGameTips.ammoEarned && isInOnboardingWindow()) {
        firstGameTips.ammoEarned = true;
        if (window.Analytics) Analytics.trackFtueTip('ammo_earned');
        if (!isStartHere) {
            showToast(t('toasts.earnAmmo'));
        }
    }

    // Track daily challenge progress (only first_letter mode)
    if (quizMode === 'first_letter' && !isDiscipleshipMission) {
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

        // Track unique verses learned (first_letter and cloze modes count)
        if ((quizMode === 'first_letter' || quizMode === 'cloze') && !isDiscipleshipMission) {
            if (window.progressManager) {
                const isNew = progressManager.addVerseLearned(verseReference);
                if (isNew) {
                    versesLearned = progressManager.getVersesLearnedCount();
                    
                    // Flash: new verse learned
                    if (!isStartHere) {
                        flashMessages.push({
                            text: `New verse learned! (${versesLearned}/${TOTAL_VERSES})`,
                            color: '#ffcc00',
                            startTime: Date.now(),
                            duration: 2000
                        });
                    }
                    console.log(`Verse learned! Total: ${versesLearned}/${TOTAL_VERSES}`);
                }
            } else {
                // Fallback to localStorage if ProgressManager not available
                const verseKey = `learned_${verseReference.replace(/\s+/g, '_')}`;
                if (!localStorage.getItem(verseKey)) {
                    localStorage.setItem(verseKey, 'true');
                    versesLearned++;
                    localStorage.setItem('versesLearned', versesLearned.toString());

                    // Flash: new verse learned
                    if (!isStartHere) {
                        flashMessages.push({
                            text: `New verse learned! (${versesLearned}/${TOTAL_VERSES})`,
                            color: '#ffcc00',
                            startTime: Date.now(),
                            duration: 2000
                        });
                    }
                    console.log(`Verse learned! Total: ${versesLearned}/${TOTAL_VERSES}`);
                }
            }
        }
    }
};

window.onQuizWrongAnswer = function (quizMode, verseReference) {
    if (window.Analytics) {
        Analytics.trackQuizWrong(quizMode, verseReference);
    }
};

window.onReviewModeReturn = function (returnToMode) {
    if (returnToMode === 'game') {
        markStartHereLearnReturned();
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
                    dbg('INIT', `onPlayerCode=${playerCode} canvas=(${canvas.width},${canvas.height})`);
                    // Initialize player - position will be set from spawn point when walls arrive
                    player = {
                        x: canvas.width / 2,
                        y: canvas.height / 2,
                        health: 60,
                        maxHealth: 100,
                        width: 48,
                        height: 48,
                        xp: 0,
                        level: 1,
                        ammo: 0, // Must earn ammo by answering quizzes correctly
                        viewAngle: 0
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
                baseImg.src = `${scriptDirectory}/images/player1-sprite96.png`;
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
            onMonsterKilled: ({ monsterId, x, y, isBoss, bossLabel, bonusXp }) => {
                const projectedKills = (gameState.monstersKilled || 0) + 1;
                const completedIntroMission = isStartHereMission(currentMission) && projectedKills >= (gameState.monstersToKill || 0);
                if (window.Analytics) {
                    Analytics.trackMonsterKilled(gameState.gameLevel);
                    Analytics.updateHeartbeat(gameState.gameLevel, projectedKills);
                    if (isStartHereMission(currentMission) && onboardingGuideState && !onboardingGuideState.firstKillTracked) {
                        onboardingGuideState.firstKillTracked = true;
                        Analytics.trackOnboardingMissionStep('first_kill', {
                            mission_id: currentMission.id,
                            boss_kill: !!isBoss
                        });
                    }
                }

                if (!firstGameTips.firstKill && isInOnboardingWindow()) {
                    firstGameTips.firstKill = true;
                    if (window.Analytics) Analytics.trackFtueTip('first_kill');
                    if (window.SoundEffects) {
                        SoundEffects.playFirstKill();
                    }
                    if (!isStartHereMission(currentMission)) {
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
                    }
                    // Extra screen shake for first kill
                    screenShake = { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 };
                    setTimeout(() => { screenShake = { x: 0, y: 0 }; }, 300);
                }

                // ===== ONBOARDING: Detect first monster killed =====
                if (!firstGameTips.monsterKilled && isInOnboardingWindow()) {
                    firstGameTips.monsterKilled = true;
                    if (window.Analytics) Analytics.trackFtueTip('monster_killed_tip');
                    if (!isStartHereMission(currentMission)) {
                        showToast(t('toasts.xpLevelUp'));
                    }
                }

                demonDies.currentTime = 0;
                demonDies.volume = 0.6;
                demonDies.play().catch(() => {});
                SoundEffects.playHeavenlyKill();
                console.log(`Monster ${monsterId} was killed at (${x}, ${y})`);

                if (isBoss) {
                    flashMessages.push({
                        text: `${bossLabel || 'Boss'} Defeated +${bonusXp || 0} XP`,
                        color: '#ffdc73',
                        x: canvas.width / 2,
                        y: canvas.height / 2 - 90,
                        startTime: Date.now(),
                        duration: 3000,
                        fontSize: 28,
                        centered: true
                    });
                    screenShake = { x: Math.random() * 12 - 6, y: Math.random() * 12 - 6 };
                    setTimeout(() => { screenShake = { x: 0, y: 0 }; }, 400);
                }

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

                const triggerHeavenlyBurst = !heavenlyKillCelebrationShown || Math.random() < 0.2;
                if (triggerHeavenlyBurst) {
                    heavenlyKillCelebrationShown = true;
                    deathParticles.push({
                        x: x,
                        y: y - 18,
                        frame: 0,
                        frameTimer: 0,
                        startTime: Date.now(),
                        type: 'heavenly',
                        maxFrames: 18
                    });
                    if (window.SoundEffects && typeof SoundEffects.playHeavenlyKill === 'function') {
                        SoundEffects.playHeavenlyKill();
                    }
                }

                if (completedIntroMission) {
                    flashMessages.push({
                        text: 'Mission Complete!',
                        color: '#a8ffb0',
                        x: canvas.width / 2,
                        y: canvas.height / 2 - 30,
                        startTime: Date.now(),
                        duration: 2600,
                        fontSize: 34,
                        centered: true
                    });
                    deathParticles.push({
                        x: x,
                        y: y - 10,
                        frame: 0,
                        frameTimer: 0,
                        startTime: Date.now(),
                        type: 'confetti',
                        maxFrames: 22
                    });
                }

                // Clear enemy HUD if this was the monster we were tracking
                if (lastAttackedMonster && lastAttackedMonster.id === monsterId) {
                    lastAttackedMonster = null;
                }
            },
            onBulletHit: ({ x, y, damage, multiplier, category, monsterType }) => {
                playBulletSound();

                if (typeof damage === 'number') {
                    noteSuccessfulDamage();
                    damageNumbers.push({
                        x: x,
                        y: y - 20,
                        damage: damage,
                        color: multiplier > 1 ? '#ffd166' : '#ff8888',
                        startTime: Date.now(),
                        duration: 900
                    });
                }

                if (multiplier > 1 && Date.now() - lastStrongHitAt > 250) {
                    lastStrongHitAt = Date.now();
                    const localizedCategory = category && typeof window !== 'undefined' && typeof window.tCategory === 'function'
                        ? window.tCategory(category)
                        : category;
                    const localizedMonsterType = monsterType && typeof window !== 'undefined' && typeof window.tDemon === 'function'
                        ? window.tDemon(monsterType)
                        : monsterType;
                    flashMessages.push({
                        text: category && monsterType
                            ? (typeof t === 'function'
                                ? t('game.strongVsMonster', localizedCategory, localizedMonsterType)
                                : `${localizedCategory} strong vs ${localizedMonsterType}!`)
                            : (typeof t === 'function' ? t('game.strong') : 'STRONG!'),
                        color: '#ffd166',
                        startTime: Date.now(),
                        duration: 1200
                    });
                }
            },
            onArmorAbsorb: ({ monsterId, armorLeft }) => {
                // Find monster and show armor absorb visual
                const monster = monsters.find(m => m.id === monsterId);
                if (monster) {
                    damageNumbers.push({
                        x: monster.x,
                        y: monster.y - 20,
                        damage: typeof t === 'function' ? t('game.blocked') : 'BLOCKED',
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
                    // Only show ghost message in multiplayer; solo games show game over modal
                    if (!isSoloGame) {
                        flashMessages.push({ text: 'You died! You are now a ghost.', color: '#ff6666', startTime: Date.now(), duration: 4000 });
                    }
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
                console.log('[GAMEOVER] onGameEnded fired! currentMission:', currentMission, 'result:', data.result);
                gameOverFlag = true;
                gameOverModalVisible = true;
                const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
                finalStats = {
                    result: data.result,
                    level: data.level,
                    monstersKilled: data.monstersKilled,
                    playerStats: data.playerStats,
                    versesLearned: versesLearned,
                    timePlayed: sessionDuration,
                    isMission: !!currentMission,
                    showIntroMissionPitch: shouldShowIntroMissionPitch(),
                    isSoloGame: true  // offline/solo games always true; multiplayer uses server.js
                };
                console.log('[GAMEOVER] finalStats.isMission set to:', finalStats.isMission);
                if (data.result === 'victory' && isStartHereMission(currentMission)) {
                    gameOverModalVisible = false;
                    showStartHereSummary();
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

                // Prefer the server-assigned player position. In multiplayer, later
                // joins may be spawned away from the shared room spawn to avoid overlap.
                const serverPlayer = playerCode && gameState.players ? gameState.players[playerCode] : null;
                const targetX = serverPlayer && typeof serverPlayer.x === 'number' ? serverPlayer.x : data.spawnX;
                const targetY = serverPlayer && typeof serverPlayer.y === 'number' ? serverPlayer.y : data.spawnY;

                if (targetX !== undefined && targetY !== undefined) {
                    const oldX = player.x, oldY = player.y;
                    const source = serverPlayer ? 'server-player' : 'spawn';
                    dbg('WALLS', `onWalls: ${source} position from (${oldX.toFixed(0)},${oldY.toFixed(0)}) to (${targetX},${targetY})`);
                    player.x = targetX;
                    player.y = targetY;
                    // Clear any movement target so player doesn't walk back to old position
                    if (inputHandler) {
                        inputHandler.clearTarget();
                        if (inputHandler.viewMode === '3d' && typeof inputHandler.stopForwardMovement === 'function') {
                            inputHandler.stopForwardMovement();
                        }
                    }
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
                if (window.Analytics) {
                    Analytics.trackLevelComplete(gameState.gameLevel, gameState.monstersKilled || 0);
                    Analytics.updateHeartbeat(gameState.gameLevel, gameState.monstersKilled || 0);
                }

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
                                showToast(t('toasts.thanksForSharing'), 2000);
                            }).catch(() => {
                                // User cancelled, no action needed
                            });
                        } else {
                            // Desktop: Copy to clipboard
                            navigator.clipboard.writeText(shareText).then(() => {
                                localStorage.setItem('hasShared', 'true');
                                showToast(t('toasts.shareCopied'), 3000);
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
                // Store melee hit probability for attacks without quiz answer
                if (config.meleeHitProbabilityNoAnswer !== undefined) {
                    meleeHitProbabilityNoAnswer = config.meleeHitProbabilityNoAnswer;
                }

                // FUN mode properties
                if (config.startingAmmo !== undefined) {
                    player.ammo = config.startingAmmo;
                }
                if (config.ammoRegenRate !== undefined) {
                    // Ammo regen handled by server
                }
                if (config.bonusHealth !== undefined) {
                    window.funModeBonusHealth = config.bonusHealth;
                }
                if (config.bonusAmmo !== undefined) {
                    window.funModeBonusAmmo = config.bonusAmmo;
                }
                if (config.noQuizPenalty !== undefined) {
                    window.funModeNoQuizPenalty = config.noQuizPenalty;
                }
                // Set currentMission for multiplayer mission games so completeMission() works
                if (config.missionId && !currentMission) {
                    currentMission = {
                        id: config.missionId,
                        name: config.missionName || config.missionId,
                        worldId: config.worldId,
                        xpMultiplier: config.xpMultiplier || 1.0,
                        type: config.missionType || 'verse',
                        packId: config.packId || null,
                        unitIds: config.unitIds || null
                    };
                    window.currentMission = currentMission;
                    console.log('[MISSION] Set currentMission from server config:', currentMission.name);
                    if (currentMission.type === 'discipleship' && window.discipleshipMissionManager) {
                        window.discipleshipMissionManager.buildMissionOverride(currentMission).then(function (override) {
                            pendingMissionContentOverride = override;
                            applyMissionContentOverride(override);
                            if (override && override.allQualities && override.allQualities.length > 0) {
                                window.vQuality = override.allQualities[0];
                                if (window.QuizManager && typeof QuizManager.pickQualityVerse === 'function') {
                                    QuizManager.pickQualityVerse();
                                }
                            }
                        }).catch(function (error) {
                            console.error('Failed to load discipleship mission content from server config:', error);
                        });
                    }
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
                    // Start Here needs the first prompt to reflect mission quiz settings,
                    // but the initial quiz may have been seeded before config arrived.
                    if (isStartHereMission(currentMission)
                        && window.QuizManager
                        && typeof QuizManager.pickQualityVerse === 'function'
                        && window.gameMode === 'game'
                        && currentQuiz
                        && !answerFullVerse) {
                        QuizManager.pickQualityVerse();
                    }
                }
            },
            onGameSpeedUpdate: (speed) => {
                currentGameSpeed = speed;
                gameSpeedMultiplier = GAME_SPEED_CLIENT_MULTIPLIERS[speed] || 0.5;
                console.log(`Game speed set to ${speed} (${gameSpeedMultiplier}x)`);
            }
        };

        // Connect to server with callbacks already set
        // Skip connection if already in offline mode
        if (!offlineMode) {
            try {
                await network.connect(networkCallbacks);
                console.log('Connected to game server');
            } catch (error) {
                console.warn('Connection failed, switching to offline mode:', error.message);
                // Auto-switch to offline mode
                offlineMode = true;
                network = new LocalNetwork();
                network.setCallbacks(networkCallbacks);
                updateUIForOfflineMode();
            }
        } else {
            // Already in offline mode - set callbacks on LocalNetwork
            network.setCallbacks(networkCallbacks);
            console.log('LocalNetwork callbacks set (offline mode)');
        }

        // Load other images
        try {
            // Load other player sprite (tinted grey from player1 base)
            const otherBase = await loadImage(`${scriptDirectory}/images/player1-sprite96.png`);
            otherPlayerImg = createTintedSprite(otherBase, OTHER_PLAYER_TINT);
            console.log('Other player sprite ready (grey tint)');

            // Load healing point image
            healingPointImg = await loadImage(`${scriptDirectory}/images/healing_point.png`);
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

        // Check for custom content from URL config
        if (urlConfig && urlConfig.content && urlConfig.content.source === 'custom' && urlConfig.content.verses && urlConfig.content.verses.length > 0) {
            verses = urlConfig.content.verses;
            organizedVerses = organizeByCategory(verses);
            ALL_QUALITIES = Object.keys(organizedVerses);
            QUALITIES = ALL_QUALITIES;
            console.log('Custom content loaded:', verses.length, 'verses in categories:', ALL_QUALITIES);
        } else if (PRD) {
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
            var _vlang = typeof I18n !== 'undefined' ? I18n.getLang() : 'en';
            if (_vlang === 'es' && typeof loadSelectedVersesES === 'function') {
                verses = loadSelectedVersesES();
            } else if (_vlang === 'lg' && typeof loadSelectedVersesLG === 'function') {
                verses = loadSelectedVersesLG();
            } else if (_vlang === 'hi' && typeof loadSelectedVersesHI === 'function') {
                verses = loadSelectedVersesHI();
            } else if (_vlang === 'hi-rom' && typeof loadSelectedVersesHIRom === 'function') {
                verses = loadSelectedVersesHIRom();
            } else if (_vlang === 'zw' && typeof loadSelectedVersesZW === 'function') {
                verses = loadSelectedVersesZW();
            } else if (_vlang === 'kr' && typeof loadSelectedVersesKR === 'function') {
                verses = loadSelectedVersesKR();
            } else if (typeof loadSelectedVerses === 'function') {
                verses = loadSelectedVerses();
            }
            organizedVerses = organizeByCategory(verses);
            // Filter ALL_QUALITIES to only categories present in the loaded verses
            const availableCats = Object.keys(organizedVerses);
            ALL_QUALITIES = ALL_QUALITIES.filter(q => availableCats.includes(q));
            // Add any categories in verse data that weren't in the hardcoded list
            availableCats.forEach(c => { if (!ALL_QUALITIES.includes(c)) ALL_QUALITIES.push(c); });
            QUALITIES = ALL_QUALITIES;
        }

        captureBaseContentState();
        if (pendingMissionContentOverride) {
            applyMissionContentOverride(pendingMissionContentOverride);
        }

        // Apply level 1 qualities from custom config (if present)
        // This must happen after ALL_QUALITIES is populated but before window.vQuality is picked
        if (customLevelData && customLevelData[1] && customLevelData[1].qualities && customLevelData[1].qualities.length > 0) {
            QUALITIES = customLevelData[1].qualities;
            console.log('Custom level 1 qualities applied:', QUALITIES);
        } else if (!QUALITIES || QUALITIES.length === 0) {
            QUALITIES = ALL_QUALITIES;
        }

        window.vQuality = QUALITIES[Math.floor(Math.random() * QUALITIES.length)]; // Initial random quality

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
        passedVerseTests = new Set();

        currentReviewMode = 'quality'; // Possible values: 'incorrect', 'quality'
        window.gameMode = 'game';
        canvas.width = getOptimalCanvasWidth();
        canvas.height = Math.min(600, window.innerHeight - 80);
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
        if (verseTimer) clearInterval(verseTimer);
        verseTimer = setInterval(function () {
            QuizManager.pickQualityVerse();
        }, VERSECHANGETIME);

        healingPointImg = new Image();
        healingPointImg.src = `${scriptDirectory}/images/healing_point.png`;
        healingPointImg.onload = function () {
            console.log('Healing point image loaded');
        };
        healingPointImg.onerror = function () {
            console.error('Error loading healing point image');
        };

        // Load shield image
        shieldImg = new Image();
        shieldImg.src = `${scriptDirectory}/images/shield_of_faith.png`;
        shieldImg.onload = function () {
            console.log('Shield of Faith image loaded');
        };
        shieldImg.onerror = function () {
            console.log('Shield image not found, using fallback rendering');
            shieldImg = null;
        };

        try {
            await ensureDemonImagesLoaded();
        } catch (error) {
            console.error('Error loading demon images:', error);
        }
        explosionImg = new Image();
        explosionImg.src = `${scriptDirectory}/images/effects/explosion2.png`;
        explosionImg.onload = function () {
            console.log('Explosion image loaded');
        };
        explosionImg.onerror = function () {
            console.error('Error loading explosion image');
        };

        // Initialize InputHandler
        if (inputHandler && typeof inputHandler.destroy === 'function') {
            inputHandler.destroy();
        }
        const InputHandlerClass = getInputHandlerClassForViewMode(viewMode);
        inputHandler = new InputHandlerClass(canvas, {
            QUALITY_LINE_HEIGHT,
            BUTTON_HEIGHT,
            BUTTON_WIDTH,
            ANSWER_SECTION_HEIGHT
        });

        // Set up InputHandler callbacks
        inputHandler.setCallbacks({
            onCategoryIndicatorClick: () => {
                categoryPickerOpen = !categoryPickerOpen;
            },
            onCategorySelect: (category) => {
                window.vQuality = category;
                categoryPickerOpen = false;
                QuizManager.pickQualityVerse();
            },
            onCategoryPickerClose: () => {
                categoryPickerOpen = false;
            },
            onQuizOptionClick: (selectedOption) => {
                QuizManager.handleQuizAnswer(selectedOption);
            },
            onOverlandClick: (x, y) => {
                handleOverlandClick(x, y);
            },
            onHamburgerClick: () => {
                menuOpen = !menuOpen;
            },
            onMenuItemClick: (itemId) => {
                // Always close menu after selection
                menuOpen = false;

                if (itemId === 'review') {
                    if (isStartHereMission(currentMission) && onboardingGuideState) {
                        onboardingGuideState.learnOpened = true;
                    }
                    ReviewMode.saveGameState();
                    startReviewModeManaged({ returnTo: 'game' });
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
                } else if (itemId === 'verseCotD') {
                    // Launch Verse of the Day
                    VersOfTheDayManager.clearExpiredBonus(); // Check if bonus expired
                    if (window.VotdLearningMode) {
                        window.gameMode = 'votd';
                        votdMode = 'learning';
                        VotdLearningMode.start(VersOfTheDayManager.getTodayVerse());
                    } else {
                        console.error('VotdLearningMode not available');
                    }
                } else if (itemId === 'verseTest') {
                    // Launch verse test with current verse (with rewards)
                    const verse = organizedVerses[window.vQuality][currentVerseIndex];
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
                } else if (itemId === 'songs') {
                    if (window.SongLibraryOverlay) {
                        const currentVerse = organizedVerses[window.vQuality] && organizedVerses[window.vQuality][currentVerseIndex];
                        window.SongLibraryOverlay.open({
                            currentReference: currentVerse ? currentVerse.Reference : null
                        });
                    }
                } else if (itemId === 'affinityHelp') {
                    if (window.AffinityHelpOverlay) {
                        window.AffinityHelpOverlay.open();
                    }
                } else if (itemId === 'futureFeatures') {
                    const futureFeaturesUrl = '/future-features';
                    const opened = window.open(futureFeaturesUrl, '_blank', 'noopener');
                    if (!opened) {
                        window.location.href = futureFeaturesUrl;
                    }
                } else if (itemId === 'switchViewMode') {
                    reloadWithViewMode(viewMode === '3d' ? '2d' : '3d');
                } else if (itemId === 'shareGame') {
                    if (window.ShareManager) {
                        ShareManager.shareInvite().then(result => {
                            if (result.success) {
                                ShareManager.showShareSuccess(result.method);
                            }
                        });
                    }
                } else if (itemId === 'leave') {
                    network.sendLeaveGame();
                    window.location.href = isSoloGame ? '/' : '/lobby';
                }
            },
            onGameOverButtonClick: () => {
                console.log('[GAMEOVER] Button clicked! finalStats.isMission:', finalStats.isMission, 'currentMission:', currentMission, 'finalStats:', finalStats);
                if (finalStats.isMission) {
                    // Mission ended — award stars based on result
                    const isVictory = finalStats.result === 'victory';
                    const stars = isVictory ? 3 : 0;
                    console.log('[GAMEOVER] Completing mission with', stars, 'stars');
                    // Record progress locally if currentMission is set
                    if (currentMission) {
                        completeMission(stars);
                    } else {
                        console.warn('[GAMEOVER] currentMission was null, cannot call completeMission');
                    }
                    // Solo missions return to overland; multiplayer missions return to lobby
                    if (typeof isSoloGame !== 'undefined' && !isSoloGame) {
                        window.location.href = '/lobby';
                    } else {
                        returnToOverland();
                    }
                } else if (typeof isSoloGame !== 'undefined' && !isSoloGame) {
                    console.log('[GAMEOVER] Returning to lobby (multiplayer)');
                    window.location.href = '/lobby';
                } else {
                    console.log('[GAMEOVER] Reloading page (solo)');
                    window.location.reload();
                }
            },
            onGameClick: (x, y) => {
                if (speedPromptVisible) {
                    speedPromptVisible = false;
                    localStorage.setItem('dcgame_speedPromptShown', 'true');
                    return true;
                }
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

                // Check verse test button click (floating "T" icon in bottom-right area)
                const vtb = UILayout.verseTestButton;
                const vtBtnX = UILayout.getVerseTestButtonX(canvas.width);
                const vtBtnY = UILayout.getVerseTestButtonY(canvas.height);
                const vtBtnSize = vtb.size;

                if (x >= vtBtnX && x <= vtBtnX + vtBtnSize &&
                    y >= vtBtnY && y <= vtBtnY + vtBtnSize) {
                    // Trigger verse test (same as menu → Verse Test)
                    const verse = organizedVerses[window.vQuality] && organizedVerses[window.vQuality][currentVerseIndex];
                    if (verse) {
                        const testDifficulty = Math.min(5 + player.level, 15);
                        launchVerseTest(verse.Text, verse.Reference, testDifficulty);
                    }
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
                        if (distToMonster >= getCombatDistanceForMonster(m)) {
                            network.sendShoot({ x: worldX, y: worldY });
                        }
                        return true; // Handled (prevent movement)
                    }
                }

                return false; // Not handled (allow movement)
            },
            onSpeedChange: (direction) => {
                cycleGameSpeed(direction);
            }
        });

        // Initialize daily challenge and verse counter
        initializeDailyChallenge();
        initializeVerseCounter();

        // Reset session start time when game starts
        sessionStartTime = Date.now();

        // ===== FIRST 60 SECONDS: Show pre-game tip (only on first game) =====
        if (!_gameLoopRunning) {
            setTimeout(() => {
                if (window.gameMode === 'game' && isInOnboardingWindow() && !isStartHereMission(currentMission)) {
                    showToast(t('toasts.quizTipDamage'), 4000);
                }
            }, 1000);

            setTimeout(() => {
                if (window.gameMode === 'game' && isInOnboardingWindow() && !isStartHereMission(currentMission) && !localStorage.getItem('hasSeenVerseHint')) {
                    showToast(t('toasts.goToMenuLearn'), 5000);
                    localStorage.setItem('hasSeenVerseHint', 'true');
                }
            }, 8000);

            setTimeout(() => {
                if (window.gameMode === 'game' && isInOnboardingWindow() && !isStartHereMission(currentMission) && !localStorage.getItem('hasSeenSettingsDifficultyHint')) {
                    showToast(t('toasts.settingsDifficultyHint'), 5000);
                    localStorage.setItem('hasSeenSettingsDifficultyHint', 'true');
                }
            }, 60000);
        }

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

// ==================== Mission System Functions ====================

async function initializeMissions() {
    // If missions are loaded and renderer exists, we're good
    if (missionsInitialized && overlandRenderer) return true;
    
    try {
        // Load mission data (only if not already loaded)
        let worlds = window.missionWorlds;
        if (!worlds || worlds.length === 0) {
            worlds = await missionClient.getWorlds();
            window.missionWorlds = worlds;
            console.log('Loaded worlds:', worlds);
            
            // Check and update unlocks
            if (window.progressManager) {
                await progressManager.checkUnlocks(worlds);
            }
        }
        
        // Load full world data with missions (only if not already loaded)
        if (!window.worldsWithMissions || window.worldsWithMissions.length === 0) {
            const worldsWithMissions = [];
            for (const worldMeta of worlds) {
                const fullWorld = await missionClient.getWorld(worldMeta.id);
                if (fullWorld) {
                    worldsWithMissions.push(fullWorld);
                }
            }
            window.worldsWithMissions = worldsWithMissions;
        }
        
        // Initialize overland renderer (always recreate to ensure current canvas/ctx)
        if (window.OverlandRenderer) {
            overlandRenderer = new OverlandRenderer(ctx, canvas);
            overlandRenderer.setWorlds(window.worldsWithMissions);
            console.log('OverlandRenderer created with', window.worldsWithMissions.length, 'worlds');
        } else {
            console.error('OverlandRenderer not available');
        }
        
        missionsInitialized = true;
        console.log('Missions initialized:', worlds.length, 'chapters');
        return true;
    } catch (error) {
        console.error('Failed to initialize missions:', error);
        return false;
    }
}

let overlandClickHandler = null;
let overlandWheelHandler = null;
let overlandTouchStartHandler = null;
let overlandTouchMoveHandler = null;
let overlandTouchEndHandler = null;
let reviewClickHandler = null;

function normalizeRequestedLearnQuality(rawQuality) {
    if (!rawQuality) return null;

    const requested = String(rawQuality).trim().toLowerCase();
    if (!requested) return null;

    const availableQualities = Object.keys(organizedVerses || {});
    for (const quality of availableQualities) {
        if (String(quality).trim().toLowerCase() === requested) {
            return quality;
        }
    }

    return null;
}

function prepareLearnDeeplinkLaunch(rawQuality) {
    pendingMissionContentOverride = null;
    currentMission = null;
    currentMissionConfig = null;
    window.currentMission = null;
    incorrectAnswerReferences = [];
    currentReviewMode = 'quality';
    clearMissionContentOverride();
    if (typeof gameCategory !== 'undefined') {
        gameCategory = 'All';
    }
    loadVersesFromBundle();
    ALL_QUALITIES = Object.keys(organizedVerses || {});
    QUALITIES = ALL_QUALITIES.slice();
    baseOrganizedVerses = organizedVerses;
    baseAllQualities = ALL_QUALITIES.slice();

    window._enterReviewAfterInit = {
        deeplinkLearn: true,
        returnTo: 'overland',
        requestedQuality: rawQuality || null
    };
}

function clearLearnDeeplinkUrlState() {
    try {
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has('mode')) return;
        if (currentUrl.searchParams.get('mode') !== 'learn') return;
        currentUrl.searchParams.delete('mode');
        currentUrl.searchParams.delete('quality');
        currentUrl.searchParams.delete('category');
        const nextUrl = currentUrl.pathname + (currentUrl.searchParams.toString() ? `?${currentUrl.searchParams.toString()}` : '') + currentUrl.hash;
        window.history.replaceState({}, document.title, nextUrl);
    } catch (error) {
        console.warn('Unable to clear learn deeplink URL state:', error);
    }
}

async function showOverland() {
    if (window.ModeManager && typeof window.ModeManager.start === 'function') {
        return ModeManager.start('overland');
    }
    return showOverlandInternal();
}

async function showOverlandInternal() {
window.gameMode = 'overland';
    clearLearnDeeplinkUrlState();
    
    // Ensure canvas is properly sized
    ensureCanvasSize();
    
    // Hide any visible overlays
    const splashScreen = document.getElementById('splashScreen');
    if (splashScreen) splashScreen.style.display = 'none';
    
    const votdModal = document.getElementById('votdModal');
    if (votdModal) votdModal.style.display = 'none';
    
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.style.display = 'none';
    
    const quickStartOverlay = document.getElementById('quickStartOverlay');
    if (quickStartOverlay) quickStartOverlay.style.display = 'none';
    
    canvas.width = getOptimalCanvasWidth();
    canvas.height = Math.min(600, window.innerHeight - 80);
    ctx = canvas.getContext('2d');
    
    // Make sure canvas is visible
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';
    
    // Note: Click handling for overland mode is done via InputHandler._handleClick
    // which checks gameMode === 'overland' and calls the onOverlandClick callback
    // BUT we also need a direct handler for handleOverlandClick
    if (overlandClickHandler) {
        canvas.removeEventListener('click', overlandClickHandler);
    }
    overlandClickHandler = function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleOverlandClick(x, y);
    };
    canvas.addEventListener('click', overlandClickHandler);

    if (overlandWheelHandler) {
        canvas.removeEventListener('wheel', overlandWheelHandler);
    }
    overlandWheelHandler = function(event) {
        if (!overlandRenderer) return;
        event.preventDefault();
        overlandRenderer.scrollBy(event.deltaY);
    };
    canvas.addEventListener('wheel', overlandWheelHandler, { passive: false });

    let touchStartY = null;
    let touchDragging = false;
    if (overlandTouchStartHandler) {
        canvas.removeEventListener('touchstart', overlandTouchStartHandler);
    }
    if (overlandTouchMoveHandler) {
        canvas.removeEventListener('touchmove', overlandTouchMoveHandler);
    }
    if (overlandTouchEndHandler) {
        canvas.removeEventListener('touchend', overlandTouchEndHandler);
    }

    overlandTouchStartHandler = function(event) {
        if (!event.touches || event.touches.length === 0) return;
        touchStartY = event.touches[0].clientY;
        touchDragging = false;
    };
    overlandTouchMoveHandler = function(event) {
        if (!overlandRenderer || !event.touches || event.touches.length === 0 || touchStartY === null) return;
        const currentY = event.touches[0].clientY;
        const delta = touchStartY - currentY;
        if (Math.abs(delta) > 4) {
            touchDragging = true;
            overlandRenderer.scrollBy(delta);
            touchStartY = currentY;
            event.preventDefault();
        }
    };
    overlandTouchEndHandler = function() {
        touchStartY = null;
        window.__overlandTouchDragging = touchDragging;
        setTimeout(function () {
            window.__overlandTouchDragging = false;
        }, 120);
    };

    canvas.addEventListener('touchstart', overlandTouchStartHandler, { passive: true });
    canvas.addEventListener('touchmove', overlandTouchMoveHandler, { passive: false });
    canvas.addEventListener('touchend', overlandTouchEndHandler, { passive: true });

    
    await initializeMissions();
    
    console.log('showOverland: starting game loop, canvas display:', canvas.style.display);

    // Start the game loop for overland rendering
    if (!_gameLoopRunning) gameLoop();
}

function shouldLaunchStartHereMission() {
    if (!START_HERE_AUTO_LAUNCH_ENABLED) {
        return false;
    }
    return !localStorage.getItem(START_HERE_SEEN_KEY);
}

function startDefaultSoloExperience() {
    clearReviewAndLearnDeeplinkState();
    if (shouldLaunchStartHereMission()) {
        startMission(START_HERE_WORLD_ID, START_HERE_MISSION_ID);
        return;
    }
    startGame('solo');
}

async function openDiscipleshipTrackMenu() {
    await showOverland();
    if (overlandRenderer && typeof overlandRenderer.selectMission === 'function') {
        overlandRenderer.selectMission('chapter4', 'jesus-01');
    }
}

let groupsPanelVisible = false;
let groupsModal = null;
let worldBrowserModal = null;

function showGroupsPanel() {
    if (!window.authManager || !window.authManager.isAuthenticated) {
        showToast('Please sign in to view your groups', 3000);
        return;
    }
    
    groupsPanelVisible = true;
    
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.style.display = 'none';
    
    if (!groupsModal) {
        groupsModal = document.createElement('div');
        groupsModal.id = 'groupsModal';
        groupsModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; justify-content: center; align-items: center; font-family: "Segoe UI", sans-serif;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 15px; padding: 25px; max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; color: #fff; position: relative;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position: absolute; top: 10px; right: 15px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;';
        closeBtn.addEventListener('click', hideGroupsPanel);
        content.appendChild(closeBtn);
        
        const panelContainer = document.createElement('div');
        panelContainer.id = 'groupsPanelContainer';
        content.appendChild(panelContainer);
        
        groupsModal.appendChild(content);
        document.body.appendChild(groupsModal);
        
        groupsModal.addEventListener('click', (e) => {
            if (e.target === groupsModal) hideGroupsPanel();
        });
    }
    
    groupsModal.style.display = 'flex';
    
    const groupsPanel = new GroupsPanel(window.authManager);
    
    renderGroupsList(groupsPanel, document.getElementById('groupsPanelContainer'));
}

async function renderGroupsList(groupsPanel, container) {
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Loading groups...</p>';
    
    await groupsPanel.loadMyGroups();
    
    groupsPanel.renderGroupsList(container, {
        onSelect: (group) => {
            renderGroupLeaderboard(groupsPanel, container, group);
        },
        onCreateGroup: () => {
            showCreateGroupModal(groupsPanel, container);
        },
        onJoinGroup: () => {
            showJoinGroupModal(groupsPanel, container);
        }
    });
}

async function renderGroupLeaderboard(groupsPanel, container, group) {
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Loading leaderboard...</p>';
    
    await groupsPanel.loadLeaderboard(group._id, 'weekly');
    
    groupsPanel.renderLeaderboard(container, {
        onBack: () => {
            renderGroupsList(groupsPanel, container);
        }
    });
}

function showCreateGroupModal(groupsPanel, container) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1001; display: flex; justify-content: center; align-items: center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 25px; max-width: 350px; width: 90%; color: #fff;';
    
    content.innerHTML = `
        <h3 style="margin: 0 0 20px; text-align: center;">Create a Group</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Group Name</label>
            <input type="text" id="newGroupName" placeholder="e.g. First Baptist Youth" maxlength="50" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Description (optional)</label>
            <input type="text" id="newGroupDesc" placeholder="Wednesday night Bible study" maxlength="200" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelCreateGroup" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;">Cancel</button>
            <button id="submitCreateGroup" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #6B4C9A, #4A3572); color: #fff; cursor: pointer; font-weight: bold;">Create</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('cancelCreateGroup').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('submitCreateGroup').addEventListener('click', async () => {
        const name = document.getElementById('newGroupName').value.trim();
        const description = document.getElementById('newGroupDesc').value.trim();
        
        if (!name) {
            showToast('Please enter a group name', 3000);
            return;
        }
        
        const result = await groupsPanel.createGroup(name, description);
        
        if (result.success) {
            modal.remove();
            showToast('Group created! Code: ' + result.group.code, 4000);
            await renderGroupsList(groupsPanel, container);
        } else {
            showToast(result.error || 'Failed to create group', 3000);
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showJoinGroupModal(groupsPanel, container) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1001; display: flex; justify-content: center; align-items: center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 25px; max-width: 350px; width: 90%; color: #fff; text-align: center;';
    
    content.innerHTML = `
        <h3 style="margin: 0 0 20px;">Join a Group</h3>
        <p style="font-size: 0.85em; color: #a8c5e6; margin-bottom: 15px;">Enter the group code provided by your leader</p>
        <div style="margin-bottom: 20px;">
            <input type="text" id="joinGroupCode" placeholder="e.g. FIRST2024" maxlength="20" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff; text-align: center; font-size: 1.1em; letter-spacing: 1px;">
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelJoinGroup" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;">Cancel</button>
            <button id="submitJoinGroup" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; cursor: pointer; font-weight: bold;">Join</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('cancelJoinGroup').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('submitJoinGroup').addEventListener('click', async () => {
        const code = document.getElementById('joinGroupCode').value.trim().toUpperCase();
        
        if (!code) {
            showToast('Please enter a group code', 3000);
            return;
        }
        
        const result = await groupsPanel.joinGroup(code);
        
        if (result.success) {
            modal.remove();
            showToast('Successfully joined ' + result.group.name + '!', 3000);
            await renderGroupsList(groupsPanel, container);
        } else {
            showToast(result.error || 'Failed to join group', 3000);
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function hideGroupsPanel() {
    groupsPanelVisible = false;
    if (groupsModal) {
        groupsModal.style.display = 'none';
    }
    
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) menuScreen.style.display = '';
}

function handleOverlandClick(x, y) {
    if (!overlandRenderer || !window.progressManager) return;
    
    console.log('handleOverlandClick:', x, y, 'canvas:', canvas.width, canvas.height);
    
    // Check for Back to Menu button first
    if (overlandRenderer.isMenuClicked(x, y)) {
        console.log('Menu button clicked, returning to menu');
        showMainMenu();
        // Remove overland click handler
        if (overlandClickHandler) {
            canvas.removeEventListener('click', overlandClickHandler);
            overlandClickHandler = null;
        }
        if (overlandWheelHandler) {
            canvas.removeEventListener('wheel', overlandWheelHandler);
            overlandWheelHandler = null;
        }
        if (overlandTouchStartHandler) {
            canvas.removeEventListener('touchstart', overlandTouchStartHandler);
            overlandTouchStartHandler = null;
        }
        if (overlandTouchMoveHandler) {
            canvas.removeEventListener('touchmove', overlandTouchMoveHandler);
            overlandTouchMoveHandler = null;
        }
        if (overlandTouchEndHandler) {
            canvas.removeEventListener('touchend', overlandTouchEndHandler);
            overlandTouchEndHandler = null;
        }
        return;
    }
    
    // Check for mission node click
    const clickedNode = overlandRenderer.handleClick(x, y, progressManager);
    if (clickedNode) console.log('Clicked node:', clickedNode.missionName);
    
    // Check for Start Mission button
    const startClicked = overlandRenderer.isStartMissionClicked(x, y);
    console.log('isStartMissionClicked:', startClicked);
    if (startClicked) {
        const selected = overlandRenderer.getSelectedMission();
        if (selected) {
            window._enterReviewAfterInit = false;
            startMission(selected.worldId, selected.missionId);
            return;
        }
    }
    
    // Check for Mission Learning button
    const learnClicked = overlandRenderer.isMissionLearningClicked(x, y);
    console.log('isMissionLearningClicked:', learnClicked, 'selectedMission:', !!overlandRenderer.getSelectedMission(), 'ReviewMode:', !!window.ReviewMode);
    if (learnClicked && overlandRenderer.getSelectedMission()) {
        if (window.ReviewMode) {
            const selected = overlandRenderer.getSelectedMission();
            let reviewQuality = null;
            let selectedMission = null;
            if (selected && window.worldsWithMissions && window.worldsWithMissions.length > 0) {
                const world = window.worldsWithMissions.find(w => w.id === selected.worldId);
                if (world) {
                    selectedMission = world.missions.find(m => m.id === selected.missionId);
                    if (selectedMission && selectedMission.qualities && selectedMission.qualities.length > 0) {
                        reviewQuality = selectedMission.qualities[0];
                    }
                }
            }
            
            const reviewOptions = {
                returnTo: 'overland',
                vQuality: reviewQuality
            };

            const startReview = function () {
                startReviewModeManaged(reviewOptions);
                setupReviewClickHandler();
            };

            if (selectedMission && selectedMission.type === 'discipleship' && window.discipleshipMissionManager) {
                window.discipleshipMissionManager.buildMissionOverride(selectedMission).then(function (override) {
                    pendingMissionContentOverride = override;
                    applyMissionContentOverride(override);
                    startReview();
                }).catch(function (error) {
                    console.error('Failed to prepare discipleship review content:', error);
                });
                return;
            }
            
            if (typeof organizedVerses === 'undefined' || !organizedVerses || Object.keys(organizedVerses).length === 0) {
                console.log('Loading verses before entering review mode...');
                loadVerses().then(() => {
                    console.log('Verses loaded, entering review mode');
                    startReview();
                });
            } else {
                console.log('Verses already loaded, entering review mode');
                startReview();
            }
        }
        return;
    }
}

function setupReviewClickHandler() {
    ensureCanvasSize();
    
    // Remove any legacy overland click handler
    if (overlandClickHandler) {
        canvas.removeEventListener('click', overlandClickHandler);
        overlandClickHandler = null;
    }
    if (overlandWheelHandler) {
        canvas.removeEventListener('wheel', overlandWheelHandler);
        overlandWheelHandler = null;
    }
    if (overlandTouchStartHandler) {
        canvas.removeEventListener('touchstart', overlandTouchStartHandler);
        overlandTouchStartHandler = null;
    }
    if (overlandTouchMoveHandler) {
        canvas.removeEventListener('touchmove', overlandTouchMoveHandler);
        overlandTouchMoveHandler = null;
    }
    if (overlandTouchEndHandler) {
        canvas.removeEventListener('touchend', overlandTouchEndHandler);
        overlandTouchEndHandler = null;
    }
    // Remove any previous review click handler
    if (reviewClickHandler) {
        canvas.removeEventListener('click', reviewClickHandler);
    }
    // Add review click handler with proper canvas coordinate conversion
    reviewClickHandler = function(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        ReviewMode.handleReviewClick(x, y);
    };
    canvas.addEventListener('click', reviewClickHandler);
}

async function startMission(worldId, missionId) {
    dbg('MISSION', `startMission called! worldId=${worldId} missionId=${missionId} window.gameMode=${window.gameMode} gameOverFlag=${gameOverFlag} killed=${gameState.monstersKilled}/${gameState.monstersToKill}`);
    console.trace('[MISSION] startMission call stack');
    try {
        window._enterReviewAfterInit = false;
        const mission = await missionClient.getMission(worldId, missionId);
        if (!mission) {
            console.error('Mission not found:', worldId, missionId);
            return;
        }

        currentMission = mission;
        window.currentMission = currentMission;
        currentMissionConfig = missionClient.missionToGameConfig(mission);
        if (worldId === START_HERE_WORLD_ID && missionId === START_HERE_MISSION_ID) {
            localStorage.setItem(START_HERE_SEEN_KEY, 'true');
            if (window.Analytics) {
                Analytics.trackOnboardingMissionStarted(mission.id, mission.name);
            }
        }
        if (mission.type === 'discipleship' && window.discipleshipMissionManager) {
            pendingMissionContentOverride = await window.discipleshipMissionManager.buildMissionOverride(mission);
        } else {
            pendingMissionContentOverride = null;
        }

        console.log('Starting mission:', mission.name);

        // ===== WAVE MODE: Launch wave assault if mission has gameMode "wave" =====
        if (mission.gameMode === 'wave') {
            console.log('Starting WAVE mode mission:', mission.name);
            if (!organizedVerses || Object.keys(organizedVerses).length === 0) {
                loadVersesFromBundle();
            }
            window.organizedVerses = organizedVerses;
            if (!window.vQuality) {
                window.vQuality = (mission.qualities && mission.qualities[0]) || 'Faith';
            }
            if (window.WaveGameLauncher) {
                try {
                    await ensureDemonImagesLoaded();
                } catch (error) {
                    console.error('Failed to load demon images for wave mode:', error);
                }
                const launchWaveMode = function () {
                    WaveGameLauncher.start({
                        canvas: document.getElementById('gameCanvas'),
                        ctx: document.getElementById('gameCanvas').getContext('2d'),
                        demonImages: demonImages,
                        waveConfig: {
                            totalWaves: mission.waves || 5
                        },
                        mission: mission,
                        onEndGame: function () {
                            if (currentMission) {
                                completeMission(3);
                            }
                            returnToOverland();
                        },
                        onLeaveGame: function () {
                            returnToOverland();
                        },
                        onRestartGame: function () {
                            startMission(mission.worldId, mission.id);
                        }
                    });
                };
                if (window.ModeManager && typeof window.ModeManager.start === 'function') {
                    ModeManager.start('wave', {
                        mission: mission,
                        launch: launchWaveMode
                    });
                } else {
                    launchWaveMode();
                }
            } else {
                console.error('WaveGameLauncher not available');
            }
            return;
        }

        if (mission.gameMode === 'scriptureMaze') {
            console.log('Starting SCRIPTURE MAZE mission:', mission.name);
            if (!organizedVerses || Object.keys(organizedVerses).length === 0) {
                loadVersesFromBundle();
            }
            window.organizedVerses = organizedVerses;
            if (window.ScriptureMazeLauncher) {
                try {
                    await ensureDemonImagesLoaded();
                } catch (error) {
                    console.error('Failed to load demon images for scripture maze:', error);
                }
                const launchScriptureMaze = function () {
                    ScriptureMazeLauncher.start({
                        canvas: document.getElementById('gameCanvas'),
                        ctx: document.getElementById('gameCanvas').getContext('2d'),
                        demonImages: demonImages,
                        playerSpriteUrl: `${scriptDirectory}/images/player1-sprite96.png`,
                        mission: mission,
                        onEndGame: function () {
                            if (currentMission) {
                                completeMission(3);
                            }
                            returnToOverland();
                        },
                        onLeaveGame: function () {
                            returnToOverland();
                        }
                    });
                };
                if (window.ModeManager && typeof window.ModeManager.start === 'function') {
                    ModeManager.start('scriptureMaze', {
                        mission: mission,
                        launch: launchScriptureMaze
                    });
                } else {
                    launchScriptureMaze();
                }
            } else {
                console.error('ScriptureMazeLauncher not available');
            }
            return;
        }

        // Build mission config in URL config format (same shape as loadUrlConfig)
        // Mission JSON stores spawnRate in seconds (e.g., 18 = 18s)
        // balance multipliers are ratios against base LevelConfig values
        // levels[] overrides are in seconds (applyLevelOverrides converts to ms)
        const config = {
            balance: {
                monsterHealth: 1.0,
                monsterDamage: mission.monsterDamageFactor || 1.0,
                monsterSpeed: 1.0,
                spawnRate: 1.0,
                maxMonsters: 1.0,
                healingFrequency: 1.0
            },
            levels: [{
                qualities: mission.qualities,
                monsters: mission.monsters,
                monstersToKill: mission.monstersToKill,
                maxMonsters: mission.maxMonsters,
                spawnRate: mission.spawnRate || 18
            }],
            quizSettings: mission.quizSettings || null,
            disableLevelBoss: mission.disableLevelBoss === true,
            fixedMonsters: Array.isArray(mission.fixedMonsters) ? mission.fixedMonsters.slice() : [],
            randomSpawnsEnabled: mission.randomSpawnsEnabled !== false,
            randomSpawnBudget: typeof mission.randomSpawnBudget === 'number' ? mission.randomSpawnBudget : undefined
        };

        // Pass mission config directly to startGame (no window globals)
        startGame('solo', undefined, {
            config: config,
            mapStyle: mission.mapStyle || 'classic',
            qualities: mission.qualities
        });

    } catch (error) {
        console.error('Failed to start mission:', error);
    }
}

function completeMission(stars) {
    if (!currentMission) return;
    
    const xpEarned = Math.floor(100 * (currentMission.xpMultiplier || 1.0) * stars / 3);
    if (currentMission.worldId === START_HERE_WORLD_ID && currentMission.id === START_HERE_MISSION_ID) {
        localStorage.setItem(START_HERE_SEEN_KEY, 'true');
        if (window.Analytics) {
            Analytics.trackOnboardingMissionFinished('complete', {
                mission_id: currentMission.id,
                stars: stars,
                xp_earned: xpEarned
            });
        }
    }
    
    if (window.progressManager) {
        progressManager.completeMission(currentMission.id, stars, xpEarned);
        
        // Check for chapter unlocks
        progressManager.checkUnlocks(missionWorlds);
    }
    
    console.log('Mission completed:', currentMission.id, 'stars:', stars, 'XP:', xpEarned);
    
    // Trigger immediate sync to persist progress
    if (window.syncManager) {
        window.syncManager.sync().catch(e => console.warn('Post-mission sync failed:', e.message));
    }
    
    // Show completion message
    flashMessages.push({
        text: t('overland.missionComplete', 'Mission Complete!') + ' +' + xpEarned + ' XP',
        color: '#4CAF50',
        startTime: Date.now(),
        duration: 3000
    });
    
    currentMission = null;
    currentMissionConfig = null;
    window.currentMission = null;
    clearMissionContentOverride();
}

function returnToOverland() {
    currentMission = null;
    currentMissionConfig = null;
    window.currentMission = null;
    clearMissionContentOverride();
    showOverland();
}

// Note: handleMouseClick has been replaced by InputHandler module

// Game loop
function gameLoop(generation) {
    // If generation doesn't match, this is a stale loop chain — stop it
    if (generation !== undefined && generation !== _gameGeneration) return;

    _gameLoopRunning = true;
    const gen = _gameGeneration; // Capture for requestAnimationFrame callbacks
    const nextFrame = () => requestAnimationFrame(() => gameLoop(gen));

    if (window.gameMode === 'menu') {
        nextFrame();
        return;
    }

    // Wave game mode uses its own render loop (WaveGameLauncher)
    if (window.gameMode === 'waveGame') {
        nextFrame();
        return;
    }

    // Scripture Maze mode uses its own render loop
    if (window.gameMode === 'scriptureMaze') {
        nextFrame();
        return;
    }

    // Handle Overland mode FIRST (doesn't need playerCode or game to be loaded)
    if (window.gameMode === 'overland') {
        if (overlandRenderer && window.progressManager) {
            overlandRenderer.render(progressManager);
        } else if (window.progressManager) {
            // Initialize if not done yet
            initializeMissions();
        }
        nextFrame();
        return;
    }

    // Handle Review mode (verse learning) - doesn't need playerCode
    if (window.gameMode === 'review') {
        ensureCanvasSize();
        console.log('Review mode render, canvas:', canvas.width, canvas.height);
        if (window.ReviewMode && typeof ReviewMode.displayReviewVerseScreen === 'function') {
            ReviewMode.displayReviewVerseScreen();
        }
        nextFrame();
        return;
    }

    if (!playerCode) {
        console.log("Waiting for player code assignment");
        nextFrame();
        return;
    }

    if (!isGameLoaded) {
        drawLoadingScreen();
        nextFrame();
        return;
    }

    if (!gameState) {
        console.error("Game state is undefined");
        nextFrame();
        return;
    }
    //for multiplayer
    if (!player) console.log("Player not initialised in gameLoop");
    currentTime = Date.now();
    const elapsedTime = currentTime - lastUpdateTime;

    // Debug position heartbeat (every 2s)
    if (DEBUG_MOVEMENT && player && currentTime - (_dbgHeartbeat || 0) > 2000) {
        _dbgHeartbeat = currentTime;
        const wt = inputHandler ? inputHandler.getWorldTarget() : null;
        dbg('POS', `(${player.x.toFixed(0)},${player.y.toFixed(0)}) hp=${player.health} ammo=${player.ammo} ans=${isAnswerCorrect} target=${wt ? '(' + wt.x.toFixed(0) + ',' + wt.y.toFixed(0) + ')' : 'none'} killed=${gameState.monstersKilled}/${gameState.monstersToKill}`);
    }

    // [WallSpawn] Periodic check: is the player currently inside a wall? (every ~1s)
    if (player && clientWallGrid && player.width && player.height && currentTime - _wallSpawnCheckTimer > 1000) {
        _wallSpawnCheckTimer = currentTime;
        if (clientWallGrid.collides(player.x, player.y, player.width, player.height)) {
            console.error(`[WallSpawn] STUCK: Player is inside a wall at (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) w=${player.width} h=${player.height} frozen=${movementFrozen} level=${gameState.gameLevel}`);
        }
    }

    // Handle VOTD rendering
    if (window.gameMode === 'votd') {
        if (votdMode === 'learning' && window.VotdLearningMode) {
            VotdLearningMode.render();
        } else if (votdMode === 'test' && window.VotdTestMode) {
            VotdTestMode.render(elapsedTime / 1000);
        }
        lastUpdateTime = currentTime; // Keep time in sync so game resumes correctly
        nextFrame();
        return;
    }
    
    // Handle Overland (mission selection) rendering
    if (window.gameMode === 'overland') {
        if (overlandRenderer && window.progressManager) {
            overlandRenderer.render(progressManager.getProgress());
        }
        lastUpdateTime = currentTime;
        nextFrame();
        return;
    }

    if (window.gameMode === 'game') {
        const onboardingGuide = buildStartHereGuide(player, monsters);
        const uiState = {
            vQuality: (currentQuiz && currentQuiz.contentCategory) ? currentQuiz.contentCategory : window.vQuality,
            currentCombatCategory: player ? player.currentCombatCategory : null,
            onboardingGuide,
            combatHint: onboardingGuide ? null : combatHint,
            startHereSummaryVisible: !!startHereSummaryState,
            startHereSummaryState,
            categoryPickerOpen,
            allCategories: QUALITIES,
            gameOverFlag,
            isAnswerCorrect,
            levelCompleted,
            levelAdvanceCountdown,
            lastAttackedMonster,
            explosionTimer,
            currentVerse: {
                text: answerFullVerse || (currentQuiz ? (currentQuiz.promptText || currentQuiz.answerRevealText || '') : ''),
                reference: (currentQuiz && currentQuiz.verseReference)
                    ? currentQuiz.verseReference
                    : ((organizedVerses[window.vQuality] && organizedVerses[window.vQuality][currentVerseIndex]) ? organizedVerses[window.vQuality][currentVerseIndex].Reference : '')
            },
            quiz: answerFullVerse ? null : currentQuiz,
            menuState: {
                menuOpen,
                musicState: MusicManager.getState(),
                reviewActive: window.gameMode === 'review',
                verseTestShielded,
                viewMode
            },
            combatHint: onboardingGuide ? null : (combatHint ? {
                line1: combatHint.line1,
                line2: combatHint.line2,
                duration: combatHint.duration,
                remainingMs: Math.max(0, combatHint.duration - (Date.now() - combatHint.startTime))
            } : null),
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
            flashMessages,
            currentGameSpeed,
            speedPromptVisible,
            speedOnboardingVisible: !speedOnboardingDismissed
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
        const RendererClass = getRendererClassForViewMode(viewMode);
        if (!window.renderer || window.renderer.viewMode !== viewMode) {
            window.renderer = new RendererClass(canvas, ctx, assets);
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

            // Default death burst runs 24 frames; custom effects can override.
            return particle.frame < (particle.maxFrames || 24);
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
        if (combatHint && (Date.now() - combatHint.startTime) >= combatHint.duration) {
            clearCombatHint();
        }

        // ===== INTERPOLATION: Lerp monsters and other players toward target positions =====
        const INTERPOLATION_SPEED = 0.15; // How fast to catch up (0.15 = smooth but responsive)

        // Interpolate monsters toward their target positions
        for (let i = 0; i < monsters.length; i++) {
            const m = monsters[i];
            if (m._targetX !== undefined && m._targetY !== undefined) {
                m.x = lerp(m.x, m._targetX, INTERPOLATION_SPEED);
                m.y = lerp(m.y, m._targetY, INTERPOLATION_SPEED);
            }
        }

        // Interpolate other players toward their target positions
        if (gameState.players) {
            Object.keys(gameState.players).forEach(code => {
                if (code !== playerCode) {
                    const otherPlayer = gameState.players[code];
                    if (otherPlayer && otherPlayer._targetX !== undefined && otherPlayer._targetY !== undefined) {
                        otherPlayer.x = lerp(otherPlayer.x, otherPlayer._targetX, INTERPOLATION_SPEED);
                        otherPlayer.y = lerp(otherPlayer.y, otherPlayer._targetY, INTERPOLATION_SPEED);
                    }
                }
            });
        }

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
            nextFrame();
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
        this.ctx.fillText(`Learn: ${window.vQuality}`, 7, 22);

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
                
                if (distance < getCombatDistanceForMonster(lastAttackedMonster)) {
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
        const worldTarget = inputHandler ? inputHandler.getWorldTarget() : null;
        const movementIntent = inputHandler && typeof inputHandler.getMovementIntent === 'function'
            ? inputHandler.getMovementIntent()
            : null;

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
                if (inputHandler.viewMode === '3d' && typeof inputHandler.stopForwardMovement === 'function') {
                    inputHandler.stopForwardMovement();
                }
            }
            // Reset moving state
            player.isMoving = false;
            player.currentFrame = 0;
            player.frameTimer = 0;
        } else if (movementIntent && inputHandler && inputHandler.viewMode === '3d') {
            const turnSteps = movementIntent.turnSteps || 0;
            if (turnSteps) {
                if (typeof inputHandler.stopForwardMovement === 'function') {
                    inputHandler.stopForwardMovement();
                }
                movementIntent.forward = false;
                player.viewAngle = (player.viewAngle || 0) + turnSteps * (Math.PI / 6);
                if (player.viewAngle > Math.PI) player.viewAngle -= Math.PI * 2;
                if (player.viewAngle < -Math.PI) player.viewAngle += Math.PI * 2;
            }
            if (movementIntent.fire) {
                tryHandle3DFire(monsters, Date.now());
            }

            const wasMoving = player.isMoving;
            player.isMoving = !!movementIntent.forward;
            if (wasMoving && !player.isMoving) {
                player.currentFrame = 0;
                player.frameTimer = 0;
            }

            if (movementIntent.forward) {
                const baseSpeed = activeBuffs.sandals.active ? PLAYER_SPEED * Constants.SANDALS_SPEED_BOOST : PLAYER_SPEED;
                let moveSpeed = baseSpeed * gameSpeedMultiplier * getFreezeAuraMoveFactor(player, monsters, Date.now());

                const dx = Math.cos(player.viewAngle || 0) * moveSpeed;
                const dy = Math.sin(player.viewAngle || 0) * moveSpeed;
                const newX = player.x + dx;
                const newY = player.y + dy;

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

                const blocked = monsterCollision || checkWallCollision(newX, newY, player.width, player.height);

                if (!blocked) {
                    player.x = newX;
                    player.y = newY;
                } else {
                    if (typeof inputHandler.stopForwardMovement === 'function') {
                        inputHandler.stopForwardMovement();
                    }
                    player.isMoving = false;
                }

                player.facingDirection = Math.cos(player.viewAngle || 0) >= 0 ? 'right' : 'left';
                player.x = Math.max(0, Math.min(player.x, WORLD_WIDTH));
                player.y = Math.max(0, Math.min(player.y, WORLD_HEIGHT));

                const now = Date.now();
                if (now - _lastPositionSendTime >= POSITION_SEND_INTERVAL &&
                    (player.x !== _lastSentX || player.y !== _lastSentY)) {
                    network.sendPosition(player.x, player.y);
                    _lastPositionSendTime = now;
                    _lastSentX = player.x;
                    _lastSentY = player.y;
                }
            }
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
            if (distance > THRESHOLD_DISTANCE) {
                player.viewAngle = Math.atan2(dy, dx);
            }

            // If player stopped moving, reset to idle frame
            if (wasMoving && !player.isMoving) {
                player.currentFrame = 0;
                player.frameTimer = 0;
            }

            if (distance > THRESHOLD_DISTANCE) {
                // Apply game speed multiplier to all speeds
                const baseSpeed = activeBuffs.sandals.active ? PLAYER_SPEED * Constants.SANDALS_SPEED_BOOST : PLAYER_SPEED;
                let moveSpeed = baseSpeed * gameSpeedMultiplier * getFreezeAuraMoveFactor(player, monsters, Date.now());

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

                // Send position to server (throttled to ~20Hz)
                const now = Date.now();
                if (now - _lastPositionSendTime >= POSITION_SEND_INTERVAL &&
                    (player.x !== _lastSentX || player.y !== _lastSentY)) {
                    network.sendPosition(player.x, player.y);
                    _lastPositionSendTime = now;
                    _lastSentX = player.x;
                    _lastSentY = player.y;
                }
            } else {
                // Player has arrived at target, clear it
                inputHandler.clearTarget();
            }
        }

        // Debug: detect sudden teleport
        if (player._prevX !== undefined) {
            const jump = Math.sqrt((player.x - player._prevX) ** 2 + (player.y - player._prevY) ** 2);
            if (jump > 50) {
                dbg('TELEPORT', `from (${player._prevX.toFixed(0)},${player._prevY.toFixed(0)}) to (${player.x.toFixed(0)},${player.y.toFixed(0)}) jump=${jump.toFixed(0)}`);
                console.trace('[TELEPORT] stack');
                // Dump recent debug log for context
                console.warn('=== RECENT DEBUG LOG (last 30 entries) ===');
                _dbgLog.slice(-30).forEach(e => console.warn(e));
                console.warn('=== END DEBUG LOG ===');
            }
        }
        player._prevX = player.x;
        player._prevY = player.y;

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

            if (distance < getCombatDistanceForMonster(monster) && (!player.state || player.state === 'alive')) {
                // Handle combat (ghosts cannot fight)
                if (currentTime - lastAttackTime > ATTACK_RATE) {
                    lastAttackTime = currentTime;
                    
                    let attackHits = isAnswerCorrect === true;
                    if (!attackHits && window.funModeNoQuizPenalty && meleeHitProbabilityNoAnswer > 0) {
                        attackHits = Math.random() < meleeHitProbabilityNoAnswer;
                    }

                    if (attackHits) {
                        playAttackSound();
                        monster.isAttacked = true;
                        setTimeout(() => {
                            monster.isAttacked = false;
                        }, 200);

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
                        noteMonsterPressure(monster, damage);

                        // ===== ONBOARDING: Show modal on first damage taken =====
                        if (!firstGameTips.demonAppeared && isInOnboardingWindow() && damage > 0 && !isStartHereMission(currentMission)) {
                            firstGameTips.demonAppeared = true;
                            if (window.Analytics) Analytics.trackFtueTip('first_damage');
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

                        playDamageSound();

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
                                gameOver.currentTime = 0;
                                gameOver.volume = 0.7;
                                gameOver.play().catch(() => {});
                                gameOverFlag = true;
                                gameOverModalVisible = true;

                                if (window.Analytics) {
                                    Analytics.trackPlayerDeath(
                                        gameState.gameLevel || 1,
                                        player.xp || 0,
                                        gameState.monstersKilled || 0,
                                        monsters.length
                                    );
                                    Analytics.endSession({
                                        level: gameState.gameLevel || 1,
                                        kills: gameState.monstersKilled || 0,
                                        xp: player.xp || 0,
                                        death_cause: 'monster_damage'
                                    });
                                }

                                const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
                                finalStats = {
                                    result: 'defeat',
                                    level: gameState.gameLevel || 1,
                                    monstersKilled: gameState.monstersKilled || 0,
                                    versesLearned: versesLearned,
                                    timePlayed: sessionDuration,
                                    isMission: !!currentMission,
                                    showIntroMissionPitch: shouldShowIntroMissionPitch(),
                                    isSoloGame: true
                                };
                                if (isStartHereMission(currentMission) && window.Analytics) {
                                    Analytics.trackOnboardingMissionFinished('failed', {
                                        mission_id: currentMission.id,
                                        kills: gameState.monstersKilled || 0,
                                        time_played: sessionDuration
                                    });
                                }
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
                    text: t('game.levelComplete', '🏆 LEVEL {0} COMPLETE! 🏆').replace('{0}', gameState.gameLevel),
                    color: '#FFD700',
                    x: canvas.width / 2,
                    y: canvas.height / 2 - 80,
                    startTime: Date.now(),
                    duration: 3000,
                    fontSize: 28,
                    centered: true
                });
                flashMessages.push({
                    text: t('game.demonsDefeated', '{0} Demons Defeated!').replace('{0}', killed),
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

                if (!firstGameTips.healingCollected && isInOnboardingWindow()) {
                    firstGameTips.healingCollected = true;
                    if (window.Analytics) Analytics.trackFtueTip('healing_collected');
                    showToast(t('toasts.healingCrosses'));
                }

                if (window.Analytics) Analytics.trackItemCollected('healing');

                network.sendCollectHealingPoint(healingPoint.id);
                healPickup.currentTime = 0;
                healPickup.volume = 0.5;
                healPickup.play().catch(() => {});
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

                if (window.Analytics) Analytics.trackItemCollected(item.type);

                inventory[item.type]++;
                network.sendCollectCollectible(item.id);
                healingRecharge.currentTime = 0;
                healingRecharge.volume = 0.5;
                healingRecharge.play().catch(() => {});
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
        displayBibleVerse(gappedVerse, organizedVerses[window.vQuality][currentVerseIndex].Reference);
        */
    } //end window.gameMode = 'game'

    //start window.gameMode = 'review'
    else {
        //console.log("About to enter displayReviewVerseScreen");
        ReviewMode.displayReviewVerseScreen();
    }

    if (window.gameMode === 'game' && elapsedTime >= UPDATE_INTERVAL) {
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

    nextFrame();
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
        if (!localStorage.getItem('dcgame_speedPromptShown')) {
            speedPromptVisible = true;
        }
    }

    // Check for VOTD auto-launch
    if (!votdAutoLaunchHandled && localStorage.getItem('votdAutoLaunch') === 'true') {
        console.log('VOTD flag found, checking modules...');
        console.log('VotdLearningMode:', typeof VotdLearningMode);
        console.log('VersOfTheDayManager:', typeof VersOfTheDayManager);
        if (typeof VotdLearningMode !== 'undefined' && typeof VersOfTheDayManager !== 'undefined') {
            votdAutoLaunchHandled = true;
            localStorage.removeItem('votdAutoLaunch');
            window.gameMode = 'votd';
            votdMode = 'learning';
            const verse = VersOfTheDayManager.getTodayVerse();
            console.log('Got verse:', verse?.Reference);
            VotdLearningMode.start(verse);
            console.log('✓ Auto-launched VOTD Learning Mode');
        } else {
            console.log('Modules not ready yet');
        }
    }

    // Update spawnsLeft
    if (gameState.spawnsLeft !== undefined) {
        spawnsLeft = gameState.spawnsLeft;
    }

    if (gameState.players && playerCode) {
        Object.keys(gameState.players).forEach(code => {
            if (code === playerCode) {
                // In offline mode, always keep local position (server is local too)
                if (offlineMode) {
                    // Keep local position and dimensions, update stats from server
                    const { x, y, width, height } = player;
                    const serverX = gameState.players[code].x;
                    const serverY = gameState.players[code].y;
                    const prevHealth = player.health;
                    player = { ...player, ...gameState.players[code], x: x, y: y, width: width, height: height };
                    // In FUN mode, preserve health bonus applied locally
                    if (window.funModeBonusHealth && prevHealth > gameState.players[code].health) {
                        player.health = prevHealth;
                    }
                    // Debug: detect if server position drifted far from client
                    if (typeof x === 'number' && typeof serverX === 'number') {
                        const drift = Math.sqrt((serverX - x) ** 2 + (serverY - y) ** 2);
                        if (drift > 10) {
                            dbg('SYNC', `eng=(${serverX.toFixed(0)},${serverY.toFixed(0)}) cli=(${x.toFixed(0)},${y.toFixed(0)}) drift=${drift.toFixed(0)} hp=${player.health} xp=${player.xp} ammo=${player.ammo}`);
                        }
                    }
                } else {
                    // Multiplayer: reconciliation with server
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
                        // Smooth blend toward server position for multiplayer
                        player.x = x + (serverPlayer.x - x) * 0.3;
                        player.y = y + (serverPlayer.y - y) * 0.3;
                    }
                }
            } else {
                // Update other players — store server position as interpolation target
                const existing = gameState.players[code];
                const incoming = newGameState.players[code];
                if (existing && incoming) {
                    // Set interpolation targets
                    existing._targetX = incoming.x;
                    existing._targetY = incoming.y;
                    // Update non-position fields
                    const prevX = existing.x;
                    const prevY = existing.y;
                    gameState.players[code] = { ...existing, ...incoming, x: prevX, y: prevY, _targetX: incoming.x, _targetY: incoming.y };
                } else {
                    gameState.players[code] = { ...incoming };
                }
            }
        });
    } else if (!playerCode) {
        console.log("playerCode not set yet, waiting for server assignment");
    }

    if (!playerCode) console.log("playerCode in updateGameState is empty: " + playerCode);

    const currentTime = Date.now();

    // Update monsters from server state — interpolate positions for smooth movement
    if (newGameState.monsters && Array.isArray(newGameState.monsters)) {
        // Build lookup of existing monsters by id for interpolation
        const existingById = {};
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i] && monsters[i].id !== undefined) {
                existingById[monsters[i].id] = monsters[i];
            }
        }

        monsters = newGameState.monsters.map((monsterState) => {
            const existing = existingById[monsterState.id];
            if (existing) {
                // Existing monster: set interpolation targets, keep current display position
                return {
                    ...monsterState,
                    x: existing.x,
                    y: existing.y,
                    _targetX: monsterState.x,
                    _targetY: monsterState.y,
                    healthBar: existing.healthBar || { x: 0, y: 0, width: 0, height: 7, color: 'green' }
                };
            } else {
                // New monster: appear at server position immediately
                return {
                    ...monsterState,
                    _targetX: monsterState.x,
                    _targetY: monsterState.y,
                    healthBar: { x: 0, y: 0, width: 0, height: 7, color: 'green' }
                };
            }
        });
        gameState.monsters = monsters;

        if (!player) {
            // Player not created yet, wait for initialization
        } else {
            const serverPlayer = newGameState.players[playerCode];
            if (serverPlayer) {
                // In FUN mode, don't overwrite health (allows bonus HP to persist)
                // Also preserve XP/level
                if (!window.funModeBonusHealth) {
                    player.health = serverPlayer.health;
                }
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
        gameState.collectibles = newGameState.collectibles;
    } else {
        gameState.collectibles = [];
    }

    // Sync collectibles to local variable
    collectibles = gameState.collectibles || [];
}

function ensureWorldBrowserModal() {
    if (worldBrowserModal) {
        return worldBrowserModal;
    }

    worldBrowserModal = document.createElement('div');
    worldBrowserModal.id = 'worldBrowserModal';
    worldBrowserModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.86); z-index: 1000; display: none; justify-content: center; align-items: center; font-family: "Segoe UI", sans-serif;';

    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 24px; max-width: 460px; width: 92%; max-height: 88vh; overflow-y: auto; color: #fff; position: relative; box-shadow: 0 18px 60px rgba(0,0,0,0.35);';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position: absolute; top: 10px; right: 14px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;';
    closeBtn.addEventListener('click', hideWorldBrowserPanel);
    content.appendChild(closeBtn);

    const panelContainer = document.createElement('div');
    panelContainer.id = 'worldBrowserContainer';
    content.appendChild(panelContainer);

    worldBrowserModal.appendChild(content);
    document.body.appendChild(worldBrowserModal);

    worldBrowserModal.addEventListener('click', (e) => {
        if (e.target === worldBrowserModal) hideWorldBrowserPanel();
    });

    return worldBrowserModal;
}

function hideWorldBrowserPanel() {
    if (worldBrowserModal) {
        worldBrowserModal.style.display = 'none';
    }
}

function buildCustomWorldMissionConfig(world, mission) {
    const spawnRateMs = mission.spawnRate > 1000 ? mission.spawnRate : (mission.spawnRate || 18) * 1000;
    const monstersToKill = mission.monstersToKill || (mission.objectives && mission.objectives.monstersToKill) || 10;
    const missionMonsters = Array.isArray(mission.monsters) && mission.monsters.length
        ? mission.monsters
        : (Array.isArray(mission.monsterTypes) && mission.monsterTypes.length ? mission.monsterTypes : ['Fear', 'Doubt']);
    const missionQualities = Array.isArray(mission.qualities) && mission.qualities.length
        ? mission.qualities
        : [mission.category || 'Faith'];

    return {
        balance: {
            monsterHealth: 1.0,
            monsterDamage: mission.monsterDamageFactor || 1.0,
            monsterSpeed: 1.0,
            spawnRate: 1.0,
            maxMonsters: 1.0,
            healingFrequency: 1.0
        },
        levels: [{
            qualities: missionQualities,
            monsters: missionMonsters,
            monstersToKill: monstersToKill,
            maxMonsters: mission.maxMonsters || 20,
            spawnRate: spawnRateMs / 1000
        }]
    };
}

function startCustomWorldMission(world, mission, previewData) {
    if (!world || !mission) return;

    currentMission = {
        id: mission.id,
        name: mission.name,
        xpMultiplier: mission.xpMultiplier || 1.0,
        worldId: world.slug || world.id,
        isCustomWorld: true
    };
    currentMissionConfig = buildCustomWorldMissionConfig(world, mission);
    currentMissionConfig.fixedMonsters = Array.isArray(mission.fixedMonsters) ? mission.fixedMonsters : [];
    currentMissionConfig.randomSpawnsEnabled = mission.randomSpawnsEnabled !== false;
    currentMissionConfig.randomSpawnBudget = typeof mission.randomSpawnBudget === 'number' ? mission.randomSpawnBudget : undefined;
    if (previewData) {
        currentMissionConfig.mapData = previewData;
        currentMissionConfig.playerSpawn = {
            x: previewData.spawnX,
            y: previewData.spawnY
        };
    }

    hideWorldBrowserPanel();

    startGame('solo', undefined, {
        config: currentMissionConfig,
        mapStyle: mission.mapStyle || 'classic',
        qualities: Array.isArray(mission.qualities) && mission.qualities.length ? mission.qualities : [mission.category || 'Faith']
    });
}

function drawMissionPreviewCanvas(canvasEl, previewState) {
    const ctx = canvasEl.getContext('2d');
    const preview = previewState.preview;
    if (!ctx || !preview) return;

    const mapWidth = (preview.cols || 80) * (preview.cellSize || 40);
    const mapHeight = (preview.rows || 80) * (preview.cellSize || 40);
    const scaleX = canvasEl.width / mapWidth;
    const scaleY = canvasEl.height / mapHeight;

    ctx.fillStyle = '#0e1522';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

    ctx.fillStyle = '#516072';
    (preview.walls || []).forEach((wall) => {
        ctx.fillRect(
            wall.x * scaleX,
            wall.y * scaleY,
            wall.width * scaleX,
            wall.height * scaleY
        );
    });

    ctx.fillStyle = '#6be585';
    ctx.beginPath();
    ctx.arc((preview.spawnX || 0) * scaleX, (preview.spawnY || 0) * scaleY, 5, 0, Math.PI * 2);
    ctx.fill();

    (previewState.fixedMonsters || []).forEach((monster, index) => {
        ctx.fillStyle = monster.isBoss ? '#ffcc55' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(monster.x * scaleX, monster.y * scaleY, monster.isBoss ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(String(index + 1), monster.x * scaleX + 6, monster.y * scaleY - 6);
    });
}

function isPreviewPositionBlocked(preview, x, y) {
    if (!preview || !Array.isArray(preview.walls)) {
        return false;
    }

    const halfWidth = Constants.MONSTER_WIDTH / 2;
    const halfHeight = Constants.MONSTER_HEIGHT / 2;
    const left = x - halfWidth;
    const right = x + halfWidth;
    const top = y - halfHeight;
    const bottom = y + halfHeight;

    return preview.walls.some((wall) => (
        left < wall.x + wall.width &&
        right > wall.x &&
        top < wall.y + wall.height &&
        bottom > wall.y
    ));
}

function buildMissionEditorState(mission) {
    return {
        name: mission.name || '',
        description: mission.description || '',
        category: mission.category || 'Faith',
        mapStyle: mission.mapStyle || 'classic',
        spawnRate: mission.spawnRate || 18,
        maxMonsters: mission.maxMonsters || 20,
        monstersToKill: mission.monstersToKill || 10,
        monsterDamageFactor: mission.monsterDamageFactor || 1.0,
        qualitiesCsv: Array.isArray(mission.qualities) ? mission.qualities.join(', ') : (mission.category || 'Faith'),
        monstersCsv: Array.isArray(mission.monsters) ? mission.monsters.join(', ') : (Array.isArray(mission.monsterTypes) ? mission.monsterTypes.join(', ') : ''),
        randomSpawnsEnabled: mission.randomSpawnsEnabled !== false,
        randomSpawnBudget: mission.randomSpawnBudget || '',
        fixedMonsters: Array.isArray(mission.fixedMonsters) ? mission.fixedMonsters.map((entry) => ({ ...entry })) : [],
        selectedDemonType: 'Fear',
        selectedTriggerType: 'immediate',
        selectedTriggerValue: 0,
        preview: null
    };
}

function buildMissionPayloadFromEditor(editorState) {
    const parseCsv = function (value) {
        return String(value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
    };

    const spawnRateValue = Number(editorState.spawnRate);

    return {
        name: editorState.name.trim(),
        description: editorState.description.trim(),
        category: editorState.category.trim() || 'Faith',
        mapStyle: editorState.mapStyle,
        spawnRate: Number.isFinite(spawnRateValue) && spawnRateValue > 1000 ? spawnRateValue : (Number.isFinite(spawnRateValue) ? spawnRateValue * 1000 : 18000),
        maxMonsters: Number(editorState.maxMonsters) || 20,
        monstersToKill: Number(editorState.monstersToKill) || 10,
        monsterDamageFactor: Number(editorState.monsterDamageFactor) || 1.0,
        qualities: parseCsv(editorState.qualitiesCsv),
        monsters: parseCsv(editorState.monstersCsv),
        monsterTypes: parseCsv(editorState.monstersCsv),
        randomSpawnsEnabled: !!editorState.randomSpawnsEnabled,
        randomSpawnBudget: editorState.randomSpawnBudget === '' ? undefined : Number(editorState.randomSpawnBudget) || 0,
        fixedMonsters: editorState.fixedMonsters
    };
}

async function showEditMissionModal(worldBrowser, world, mission, container, reloadList) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.94); z-index: 1002; display: flex; justify-content: center; align-items: center;';

    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #171f2b 0%, #101823 100%); border-radius: 16px; padding: 20px; width: min(980px, 96vw); max-height: 92vh; overflow: auto; color: #fff;';
    modal.appendChild(content);
    document.body.appendChild(modal);

    const editorState = buildMissionEditorState(mission);

    async function refreshPreview() {
        const result = await worldBrowser.previewMission(world.slug, mission.id, {
            mapStyle: editorState.mapStyle,
            customWalls: [],
            removedWalls: [],
            playerSpawn: null
        });
        if (result.success) {
            editorState.preview = result.preview;
            drawMissionPreviewCanvas(document.getElementById('missionPreviewCanvas'), editorState);
            renderFixedMonsterList();
        } else {
            showToast(result.error || 'Preview failed', 3000);
        }
    }

    function renderFixedMonsterList() {
        const list = document.getElementById('fixedMonsterList');
        if (!list) return;
        list.innerHTML = '';

        if (!editorState.fixedMonsters.length) {
            list.innerHTML = '<div style="opacity:0.65;">No fixed monsters placed yet. Click the preview to add one.</div>';
            drawMissionPreviewCanvas(document.getElementById('missionPreviewCanvas'), editorState);
            return;
        }

        editorState.fixedMonsters.forEach((entry, index) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;';
            row.innerHTML = `<span>${index + 1}. ${entry.demonType} @ (${Math.round(entry.x)}, ${Math.round(entry.y)}) [${entry.spawnTrigger.type}]</span>`;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.cssText = 'border:none;border-radius:6px;background:rgba(255,80,80,0.16);color:#ffd6d6;padding:6px 10px;cursor:pointer;';
            removeBtn.addEventListener('click', () => {
                editorState.fixedMonsters.splice(index, 1);
                renderFixedMonsterList();
            });
            row.appendChild(removeBtn);
            list.appendChild(row);
        });

        drawMissionPreviewCanvas(document.getElementById('missionPreviewCanvas'), editorState);
    }

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
            <div>
                <h2 style="margin:0 0 4px;">Edit Mission</h2>
                <div style="font-size:0.9em;color:#a8c5e6;">Adjust mission rules, place fixed monsters, preview, then test play.</div>
            </div>
            <button id="closeMissionEditor" style="border:none;background:none;color:#fff;font-size:24px;cursor:pointer;">×</button>
        </div>
        <div style="display:grid;grid-template-columns:minmax(300px, 1fr) minmax(340px, 1.1fr);gap:18px;">
            <div>
                <div style="display:grid;gap:10px;">
                    <input id="missionEditorName" placeholder="Mission name" value="${editorState.name.replace(/"/g, '&quot;')}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    <textarea id="missionEditorDescription" rows="3" placeholder="Mission description" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;resize:vertical;">${editorState.description}</textarea>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <input id="missionEditorCategory" placeholder="Category" value="${editorState.category.replace(/"/g, '&quot;')}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                        <select id="missionEditorMapStyle" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                            <option value="classic">Classic</option>
                            <option value="narrow">Narrow</option>
                            <option value="labyrinth">Labyrinth</option>
                            <option value="open">Open</option>
                            <option value="city">City</option>
                        </select>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <input id="missionEditorSpawnRate" type="number" min="1" step="1" value="${Math.round((Number(editorState.spawnRate) > 1000 ? Number(editorState.spawnRate) : Number(editorState.spawnRate) * 1000) / 1000)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                        <input id="missionEditorMaxMonsters" type="number" min="1" step="1" value="${editorState.maxMonsters}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                        <input id="missionEditorMonstersToKill" type="number" min="1" step="1" value="${editorState.monstersToKill}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    </div>
                    <input id="missionEditorMonsterDamageFactor" type="number" min="0.5" step="0.1" value="${editorState.monsterDamageFactor}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    <input id="missionEditorQualities" placeholder="Qualities CSV" value="${editorState.qualitiesCsv.replace(/"/g, '&quot;')}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    <input id="missionEditorMonsters" placeholder="Demons CSV" value="${editorState.monstersCsv.replace(/"/g, '&quot;')}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.92em;">
                        <input id="missionEditorRandomSpawns" type="checkbox" ${editorState.randomSpawnsEnabled ? 'checked' : ''}>
                        Random spawns enabled
                    </label>
                    <input id="missionEditorRandomBudget" type="number" min="0" step="1" placeholder="Random spawn budget (optional)" value="${editorState.randomSpawnBudget}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                </div>
                <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;">
                    <div style="font-weight:700;margin-bottom:10px;">Fixed Monster Tool</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <select id="missionEditorDemonType" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                            <option>Fear</option><option>Doubt</option><option>Confusion</option><option>Deception</option><option>Ignorance</option><option>Blindness</option><option>Condemnation</option><option>Unbelief</option><option>Depression</option><option>Despair</option><option>Pride</option><option>Poverty</option><option>Shame</option><option>Strife</option><option>Infirmity</option><option>Temptation</option><option>Swarm</option>
                        </select>
                        <select id="missionEditorTriggerType" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                            <option value="immediate">Immediate</option>
                            <option value="timer">Timer</option>
                            <option value="proximity">Proximity</option>
                            <option value="killCount">Kill Count</option>
                        </select>
                        <input id="missionEditorTriggerValue" type="number" min="0" step="1" value="0" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;">
                    </div>
                    <div style="font-size:0.82em;color:#a8c5e6;margin-top:8px;">Click on the preview map to place the selected demon. Right click the preview to remove the nearest one.</div>
                </div>
            </div>
            <div>
                <canvas id="missionPreviewCanvas" width="420" height="420" style="width:100%;max-width:420px;border-radius:12px;background:#0e1522;border:1px solid rgba(255,255,255,0.12);display:block;"></canvas>
                <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
                    <button id="refreshMissionPreview" style="padding:10px 14px;border:none;border-radius:8px;background:#4a90e2;color:#fff;cursor:pointer;">Refresh Preview</button>
                    <button id="saveMissionEdits" style="padding:10px 14px;border:none;border-radius:8px;background:#4CAF50;color:#fff;cursor:pointer;">Save Mission</button>
                    <button id="testPlayMission" style="padding:10px 14px;border:none;border-radius:8px;background:#FFD166;color:#1a1a1a;cursor:pointer;font-weight:700;">Test Play</button>
                </div>
                <div id="fixedMonsterList" style="margin-top:14px;"></div>
            </div>
        </div>
    `;

    document.getElementById('missionEditorMapStyle').value = editorState.mapStyle;

    const syncFormState = function () {
        editorState.name = document.getElementById('missionEditorName').value;
        editorState.description = document.getElementById('missionEditorDescription').value;
        editorState.category = document.getElementById('missionEditorCategory').value;
        editorState.mapStyle = document.getElementById('missionEditorMapStyle').value;
        editorState.spawnRate = Number(document.getElementById('missionEditorSpawnRate').value) || 18;
        editorState.maxMonsters = Number(document.getElementById('missionEditorMaxMonsters').value) || 20;
        editorState.monstersToKill = Number(document.getElementById('missionEditorMonstersToKill').value) || 10;
        editorState.monsterDamageFactor = Number(document.getElementById('missionEditorMonsterDamageFactor').value) || 1.0;
        editorState.qualitiesCsv = document.getElementById('missionEditorQualities').value;
        editorState.monstersCsv = document.getElementById('missionEditorMonsters').value;
        editorState.randomSpawnsEnabled = document.getElementById('missionEditorRandomSpawns').checked;
        editorState.randomSpawnBudget = document.getElementById('missionEditorRandomBudget').value;
        editorState.selectedDemonType = document.getElementById('missionEditorDemonType').value;
        editorState.selectedTriggerType = document.getElementById('missionEditorTriggerType').value;
        editorState.selectedTriggerValue = Number(document.getElementById('missionEditorTriggerValue').value) || 0;
    };

    const previewCanvas = document.getElementById('missionPreviewCanvas');
    previewCanvas.addEventListener('click', (event) => {
        if (!editorState.preview) return;
        syncFormState();
        const rect = previewCanvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * ((editorState.preview.cols || 80) * (editorState.preview.cellSize || 40));
        const y = ((event.clientY - rect.top) / rect.height) * ((editorState.preview.rows || 80) * (editorState.preview.cellSize || 40));
        if (isPreviewPositionBlocked(editorState.preview, x, y)) {
            showToast('Cannot place a demon inside a wall', 2500);
            return;
        }
        editorState.fixedMonsters.push({
            x: Math.round(x),
            y: Math.round(y),
            demonType: editorState.selectedDemonType,
            behavior: { type: 'chaser', patrolRadius: 0, patrolPath: [] },
            stats: { healthMultiplier: 1.0, damageMultiplier: 1.0, speedMultiplier: 1.0 },
            spawnTrigger: {
                type: editorState.selectedTriggerType,
                value: editorState.selectedTriggerValue
            },
            isBoss: false,
            label: ''
        });
        renderFixedMonsterList();
    });
    previewCanvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (!editorState.preview || !editorState.fixedMonsters.length) return;
        const rect = previewCanvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * ((editorState.preview.cols || 80) * (editorState.preview.cellSize || 40));
        const y = ((event.clientY - rect.top) / rect.height) * ((editorState.preview.rows || 80) * (editorState.preview.cellSize || 40));
        let closestIndex = 0;
        let closestDist = Infinity;
        editorState.fixedMonsters.forEach((entry, index) => {
            const dx = entry.x - x;
            const dy = entry.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closestIndex = index;
            }
        });
        if (closestDist < 180) {
            editorState.fixedMonsters.splice(closestIndex, 1);
            renderFixedMonsterList();
        }
    });

    document.getElementById('closeMissionEditor').addEventListener('click', () => modal.remove());
    document.getElementById('refreshMissionPreview').addEventListener('click', async () => {
        syncFormState();
        await refreshPreview();
    });
    document.getElementById('saveMissionEdits').addEventListener('click', async () => {
        syncFormState();
        const payload = buildMissionPayloadFromEditor(editorState);
        const result = await worldBrowser.updateMission(world.slug, mission.id, payload);
        if (!result.success) {
            showToast(result.error || 'Failed to save mission', 3500);
            return;
        }
        showToast('Mission saved', 2500);
        const refreshedWorld = await worldBrowser.getWorld(world.slug);
        if (refreshedWorld) {
            renderWorldDetailView(worldBrowser, refreshedWorld, container, reloadList);
        }
        modal.remove();
    });
    document.getElementById('testPlayMission').addEventListener('click', async () => {
        syncFormState();
        if (!editorState.preview) {
            await refreshPreview();
        }
        const testMission = buildMissionPayloadFromEditor(editorState);
        startCustomWorldMission(world, testMission, editorState.preview);
        modal.remove();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.remove();
    });

    await refreshPreview();
}

function showEditWorldModal(worldBrowser, world, container, reloadList) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 1001; display: flex; justify-content: center; align-items: center;';

    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #1b2334 0%, #101823 100%); border-radius: 14px; padding: 24px; max-width: 400px; width: 92%; color: #fff;';
    content.innerHTML = `
        <h3 style="margin: 0 0 10px;">Edit World</h3>
        <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">World Name</label>
            <input type="text" id="editWorldName" maxlength="100" value="${(world.name || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
        </div>
        <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Description</label>
            <textarea id="editWorldDescription" maxlength="500" rows="3" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff; resize: vertical;">${world.description || ''}</textarea>
        </div>
        <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Visibility</label>
            <select id="editWorldVisibility" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
                <option value="private" ${world.visibility === 'private' ? 'selected' : ''}>Private</option>
                <option value="unlisted" ${world.visibility === 'unlisted' ? 'selected' : ''}>Unlisted</option>
                <option value="public" ${world.visibility === 'public' ? 'selected' : ''}>Public</option>
            </select>
        </div>
        <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Status</label>
            <select id="editWorldStatus" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
                <option value="draft" ${world.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="published" ${world.status === 'published' ? 'selected' : ''}>Published</option>
                <option value="archived" ${world.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelEditWorld" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;">Cancel</button>
            <button id="submitEditWorld" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; cursor: pointer; font-weight: bold;">Save</button>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('cancelEditWorld').addEventListener('click', () => modal.remove());

    document.getElementById('submitEditWorld').addEventListener('click', async () => {
        const result = await worldBrowser.updateWorld(world.slug, {
            name: document.getElementById('editWorldName').value.trim(),
            description: document.getElementById('editWorldDescription').value.trim(),
            visibility: document.getElementById('editWorldVisibility').value,
            status: document.getElementById('editWorldStatus').value
        });

        if (!result.success) {
            showToast(result.error || 'Failed to update world', 3500);
            return;
        }

        modal.remove();
        showToast('World updated', 2500);
        const refreshed = await worldBrowser.getWorld(world.slug);
        if (refreshed) {
            renderWorldDetailView(worldBrowser, refreshed, container, reloadList);
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function renderWorldDetailView(worldBrowser, world, container, reloadList) {
    worldBrowser.renderWorldDetail(world, container, {
        onPlayMission: function (selectedWorld, mission) {
            startCustomWorldMission(selectedWorld, mission);
        },
        onEditMission: function (selectedWorld, mission) {
            showEditMissionModal(worldBrowser, selectedWorld, mission, container, reloadList);
        },
        onJoin: async function (selectedWorld) {
            const result = await worldBrowser.joinWorld(selectedWorld.slug);
            showToast(result.success ? 'World joined' : (result.error || 'Join failed'), 3000);
            const refreshed = await worldBrowser.getWorld(selectedWorld.slug);
            if (refreshed) {
                renderWorldDetailView(worldBrowser, refreshed, container, reloadList);
            }
        },
        onEditWorld: function (selectedWorld) {
            showEditWorldModal(worldBrowser, selectedWorld, container, reloadList);
        },
        onDeleteWorld: async function (selectedWorld) {
            if (!window.confirm('Delete this world?')) return;
            const result = await worldBrowser.deleteWorld(selectedWorld.slug);
            showToast(result.success ? 'World deleted' : (result.error || 'Delete failed'), 3000);
            if (result.success) {
                await reloadList();
            }
        },
        onBack: reloadList
    });
}

function showCreateWorldModal(worldBrowser, container, reloadList) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 1001; display: flex; justify-content: center; align-items: center;';

    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, #1b2334 0%, #101823 100%); border-radius: 14px; padding: 24px; max-width: 380px; width: 92%; color: #fff;';
    content.innerHTML = `
        <h3 style="margin: 0 0 10px;">Create a World</h3>
        <p style="font-size: 0.85em; color: #a8c5e6; margin: 0 0 18px;">This creates a starter world with one chapter and three missions. You can expand it later.</p>
        <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">World Name</label>
            <input type="text" id="newWorldName" placeholder="e.g. Easter Journey" maxlength="100" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
        </div>
        <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Description</label>
            <textarea id="newWorldDescription" maxlength="500" rows="3" placeholder="What is this world for?" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff; resize: vertical;"></textarea>
        </div>
        <div style="margin-bottom: 18px;">
            <label style="display: block; font-size: 0.85em; margin-bottom: 5px; color: #a8c5e6;">Visibility</label>
            <select id="newWorldVisibility" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff;">
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
            </select>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelCreateWorld" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;">Cancel</button>
            <button id="submitCreateWorld" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; cursor: pointer; font-weight: bold;">Create</button>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('cancelCreateWorld').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('submitCreateWorld').addEventListener('click', async () => {
        const name = document.getElementById('newWorldName').value.trim();
        const description = document.getElementById('newWorldDescription').value.trim();
        const visibility = document.getElementById('newWorldVisibility').value;

        if (!name) {
            showToast('Please enter a world name', 3000);
            return;
        }

        const result = await worldBrowser.createWorld({
            name,
            description,
            visibility
        });

        if (!result.success) {
            showToast(result.error || 'Failed to create world', 3500);
            return;
        }

        modal.remove();
        showToast('World created', 2500);
        await reloadList();
        const createdWorld = await worldBrowser.getWorld(result.world.slug);
        if (createdWorld) {
            renderWorldDetailView(worldBrowser, createdWorld, container, reloadList);
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function renderWorldBrowserList(worldBrowser, container) {
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Loading worlds...</p>';

    await worldBrowser.loadWorlds();

    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 16px;';

    const title = document.createElement('h2');
    title.textContent = 'Worlds';
    title.style.cssText = 'margin: 0 0 6px;';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Browse public worlds, open shared worlds, or create a starter world if you are signed in.';
    subtitle.style.cssText = 'margin: 0; font-size: 0.9em; color: #a8c5e6;';
    header.appendChild(subtitle);

    container.innerHTML = '';
    container.appendChild(header);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;';

    if (window.authManager && window.authManager.isAuthenticated && window.authManager.isRegistered) {
        const createBtn = document.createElement('button');
        createBtn.textContent = '+ Create World';
        createBtn.style.cssText = 'padding: 10px 14px; border: none; border-radius: 8px; background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; cursor: pointer; font-weight: bold;';
        createBtn.addEventListener('click', () => {
            showCreateWorldModal(worldBrowser, container, async function () {
                await renderWorldBrowserList(worldBrowser, container);
            });
        });
        actions.appendChild(createBtn);
    }

    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'Join by Code';
    shareBtn.style.cssText = 'padding: 10px 14px; border: none; border-radius: 8px; background: rgba(255,255,255,0.12); color: #fff; cursor: pointer;';
    shareBtn.addEventListener('click', async () => {
        const code = window.prompt('Enter a world share code');
        if (!code) return;
        const result = await worldBrowser.joinByShareCode(code.trim());
        if (!result.success || !result.world) {
            showToast(result.error || 'Share code not found', 3000);
            return;
        }
        const world = await worldBrowser.getWorld(result.world.slug);
        if (!world) {
            showToast('Could not open that world', 3000);
            return;
        }
        renderWorldDetailView(worldBrowser, world, container, async function () {
            await renderWorldBrowserList(worldBrowser, container);
        });
    });
    actions.appendChild(shareBtn);

    if (!window.authManager || !window.authManager.isRegistered) {
        const note = document.createElement('div');
        note.textContent = window.authManager && window.authManager.isAuthenticated
            ? 'Complete registration to create and join worlds.'
            : 'Sign in to create and join worlds.';
        note.style.cssText = 'width: 100%; font-size: 0.82em; color: rgba(255,255,255,0.64); margin-top: 2px;';
        actions.appendChild(note);
    }

    container.appendChild(actions);

    const list = document.createElement('div');
    container.appendChild(list);

    worldBrowser.renderWorldList(list, {
        onSelect: async function (worldMeta) {
            list.innerHTML = '<p style="text-align: center; padding: 20px;">Loading world...</p>';
            const world = await worldBrowser.getWorld(worldMeta.slug);
            if (!world) {
                showToast('Could not load that world', 3000);
                await renderWorldBrowserList(worldBrowser, container);
                return;
            }
            renderWorldDetailView(worldBrowser, world, container, async function () {
                await renderWorldBrowserList(worldBrowser, container);
            });
        }
    });
}

async function showWorldBrowserPanel() {
    ensureWorldBrowserModal();
    worldBrowserModal.style.display = 'flex';

    const container = document.getElementById('worldBrowserContainer');
    if (!container) return;

    const worldBrowser = new WorldBrowser(window.authManager || null);
    await renderWorldBrowserList(worldBrowser, container);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Update the handlePlayerAttack function to only send the attack data to the server
function handlePlayerAttack(monster) {
    dbg('ATTACK', `attacking monster=${monster.id} at (${monster.x.toFixed(0)},${monster.y.toFixed(0)}) player=(${player.x.toFixed(0)},${player.y.toFixed(0)}) ammo=${player.ammo}`);
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
        if (window.Analytics) {
            Analytics.trackPlayerLevelUp(player.level);
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
