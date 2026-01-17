const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const MAX_PLAYERS = 4;
let MONSTER_SPEED = 3; // Slower monster speed
const MIN_WALK_DISTANCE = 40; // Minimum distance for random walk
const MAX_WALK_DISTANCE = 300; // Maximum distance for random walk

app.use(express.static(path.join(__dirname, '/')));

// World dimensions (much larger than viewport)
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const CANVASWIDTH = 400;  // Viewport width
const CANVASHEIGHT = 600; // Viewport height

const MONSTER_WIDTH = 50;
const MONSTER_HEIGHT = 50;
const MAX_HEALING_POINTS = 2;
const HEALING_POINT_WIDTH = 16;
const HEALING_POINT_HEIGHT = 16;

const MINIMUM_DISTANCE = 30; // Minimum distance between player and monster
const QUALITY_LINE_HEIGHT = 45; // Height of the quality line (2.5x higher)
const BUTTON_WIDTH = 84; // Width of the quality buttons
const BUTTON_HEIGHT = 21; // Height of the quality buttons
const BUTTON_PADDING = 4; // Padding around the button text
const ANSWER_SECTION_HEIGHT = 17; // Distance from bottom where nothing should move or spawn

// If qualities is set to [] then all qualities will be used
const levelData = {
  1: {
    qualities: ['Faith', 'Courage', 'Knowledge'],
    monsters: ['Fear', 'Ignorance'],
    monsterDamageFactor: 1,
    playerSpeed: 5,
    monsterSpeed: 2,
    spawnRate: 10000,
    maxMonsters: 8  // Increased for larger world
  },
  2: {
    qualities: ['Love', 'Wisdom', 'Healing'],
    monsters: ['Strife', 'Confusion', 'Infirmity'],
    monsterDamageFactor: 1.5,
    playerSpeed: 6,
    spawnRate: 8000,
    monsterSpeed: 2.5,
    maxMonsters: 10
  },
  3: {
    qualities: ['Forgiveness', 'Good News', 'Focus'],
    monsters: ['Condemnation', 'Unbelief', 'Depression', 'Doubt'],
    monsterDamageFactor: 1.5,
    playerSpeed: 6,
    spawnRate: 5000,
    monsterSpeed: 3,
    maxMonsters: 5
  }
  // Add more level configurations as needed
};

// Maze generation using recursive backtracker
function generateMaze(width, height, cellSize = 100) {
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  const walls = [];

  // Create grid of cells
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(false));
  const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));

  // Recursive backtracker
  function carve(row, col) {
    visited[row][col] = true;

    // Randomize directions
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0]
    ].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && !visited[newRow][newCol]) {
        // Don't create wall between current and next cell
        grid[row][col] = true;
        carve(newRow, newCol);
      }
    }
  }

  // Start from random position
  carve(Math.floor(Math.random() * rows), Math.floor(Math.random() * cols));

  // Convert grid to walls (add walls around uncarved areas)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!visited[row][col] || Math.random() < 0.3) { // 30% chance to add obstacle in carved areas
        walls.push({
          x: col * cellSize,
          y: row * cellSize,
          width: cellSize,
          height: cellSize
        });
      }
    }
  }

  return walls;
}

// Game state
let gameState = {
  players: {},
  monsters: [],
  healingPoints: [],
  connectedPlayers: 0,
  gameLevel: 1, // Initialize gameLevel to 1
  maxSpawns: levelData[1].maxMonsters, // Initialize maxSpawns based on level 1
  spawnsLeft: levelData[1].maxMonsters, // Initialize spawnsLeft based on level 1
  walls: generateMaze(WORLD_WIDTH, WORLD_HEIGHT, 100) // Generate maze
};

console.log('Initial game state:', gameState);

// Serve the game files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Spawn monsters every 10 seconds (adjust as needed)
const MAX_MONSTERS = 10; // Set the desired maximum number of monsters
setInterval(spawnMonster, 10000);

// Generate a random player code
function generatePlayerCode() {
  return crypto.randomBytes(3).toString('hex');
}

function isOverlapping(x, y, width, height) {
  // Check overlap with players
  for (const playerCode in gameState.players) {
    const player = gameState.players[playerCode];
    if (
      x + width / 2 > player.x - player.width / 2 &&
      x - width / 2 < player.x + player.width / 2 &&
      y + height / 2 > player.y - player.height / 2 &&
      y - height / 2 < player.y + player.height / 2
    ) {
      return true;
    }
  }

  // Check overlap with monsters
  for (const monster of gameState.monsters) {
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
  for (const healingPoint of gameState.healingPoints) {
    if (
      x + width / 2 > healingPoint.x - healingPoint.width / 2 &&
      x - width / 2 < healingPoint.x + healingPoint.width / 2 &&
      y + height / 2 > healingPoint.y - healingPoint.height / 2 &&
      y - height / 2 < healingPoint.y + healingPoint.height / 2
    ) {
      return true;
    }
  }

  // Check overlap with walls
  for (const wall of gameState.walls) {
    if (
      x + width / 2 > wall.x &&
      x - width / 2 < wall.x + wall.width &&
      y + height / 2 > wall.y &&
      y - height / 2 < wall.y + wall.height
    ) {
      return true;
    }
  }

  return false;
}

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('A user connected');
  gameState.connectedPlayers++;
  console.log('Connected players:', gameState.connectedPlayers);

  // Check if the maximum number of players has been reached
  if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
    console.log('Maximum number of players reached');
    socket.emit('maxPlayersReached');
    return;
  }

  // Generate a random player code for the new player
  const playerCode = generatePlayerCode();

  // Associate the playerCode with the socket
  socket.playerCode = playerCode;
  // Send the playerCode and current game state to the new player
  socket.emit('playerCode', playerCode);
  console.log('Player code for new user: ' + playerCode);
  // Determine the player number based on the number of connected players
  const playerNumber = Object.keys(gameState.players).length + 1;
  // Send the player number to the client
  socket.emit('playerNumber', playerNumber);

  // Initialize player with default dimensions (spawn in world coordinates)
  // Find a valid spawn position that doesn't collide with walls
  let spawnX, spawnY;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    spawnX = Math.random() * WORLD_WIDTH;
    spawnY = Math.random() * WORLD_HEIGHT;
    attempts++;
  } while (isOverlapping(spawnX, spawnY, 47, 52) && attempts < maxAttempts);

  // If we couldn't find a valid position after max attempts, spawn in center
  if (attempts >= maxAttempts) {
    spawnX = WORLD_WIDTH / 2;
    spawnY = WORLD_HEIGHT / 2;
  }

  gameState.players[playerCode] = {
    x: spawnX,
    y: spawnY,
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
    width: 47,
    height: 52
  };


  //console.log('playerCode emit: ' + playerCode);
  socket.emit('gameState', gameState);

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    gameState.connectedPlayers--;
    console.log('Connected players:', gameState.connectedPlayers);

    const playerCode = socket.playerCode;
    if (playerCode && gameState.players[playerCode]) {
      delete gameState.players[playerCode];
      console.log(`Player with code ${playerCode} disconnected`);
    }
  });

  // Get updates to a players position
  socket.on('playerPosition', (data) => {

    const { x, y } = data;
    const playerCode = socket.playerCode;
    //console.log("Received data for playerCode; " + playerCode + " " + x + ", " +y);
    if (playerCode) {
      // Update the player's position in the game state
      gameState.players[playerCode].x = x;
      gameState.players[playerCode].y = y;
      // Update other player properties as needed
      //console.log("Updated gameState internally");
      // Broadcast the updated game state to all connected clients
      io.emit('gameState', gameState);
    } else
      console.log("Invalid player code or player not found in game state");
  });

  // Handle player data updates
  socket.on('updatePlayerData', ({ playerCode, playerData }) => {
    const player = gameState.players[playerCode];

    if (player) {
      player.x = playerData.x;
      player.y = playerData.y;
      player.health = playerData.health;
      // Update other player properties as needed

      // Broadcast the updated game state
      io.emit('gameStateUpdate', gameState);
    }
  });

  socket.on('playerAttack', (attackData) => {
    const playerCode = socket.playerCode;
    const player = gameState.players[playerCode];
    const targetMonster = gameState.monsters.find((m) => m.id === attackData.monsterId);
    console.log(`Player ${playerCode} attacking monster ${attackData.monsterId}`);
    console.log('Target monster health is: ' + targetMonster.health);
    console.log('Player health is now: ' + player.health);
    if (player && targetMonster) {
      targetMonster.health -= attackData.damage;
      console.log('Target monster health is now: ' + targetMonster.health);
      if (targetMonster.health <= 0) {
        // Remove the monster from the game
        const monsterIndex = gameState.monsters.indexOf(targetMonster);
        gameState.monsters.splice(monsterIndex, 1);
        console.log('We should be removing a monster from the game');
        // Emit a 'monsterKilled' event to all clients
        io.emit('monsterKilled', { monsterId: targetMonster.id });

        // Trigger a new chasing monster if the killed monster was a chaser
        if (targetMonster.chaser) {
          gameState.chaseTrigger = true;
        }

        // Check if all monsters are defeated
        if (gameState.monsters.length === gameState.spawnsLeft) {
          gameState.monsters.forEach(demon => {
            demon.chaser = true;
          });
        }
      }

      // Broadcast the updated game state
      io.emit('gameStateUpdate', gameState);
    } else {
      console.log(`Invalid attack: Player ${playerCode} or monster ${attackData.monsterId} not found`);
    }
  });

  function findNearestPlayer(monster) {
    let nearestPlayer = null;
    let shortestDistance = Infinity;

    for (const playerCode in gameState.players) {
      const player = gameState.players[playerCode];
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestPlayer = player;
      }
    }

    return nearestPlayer;
  }


  socket.on('levelCompleted', () => {

    if (gameState.gameLevel < Object.keys(levelData).length)
      gameState.gameLevel++;

    resetLevelData(gameState.gameLevel);
    io.emit('gameStateUpdate', gameState);
  });

  socket.on('collectHealingPoint', (healingPointId) => {
    console.log("collectHealingPoint", healingPointId);
    collectHealingPoint(socket.playerCode, healingPointId);
  });

});

function resetLevelData(level) {
  gameState.maxSpawns = levelData[level].maxMonsters;
  gameState.spawnsLeft = levelData[level].maxMonsters;
  console.log(`Level ${level} data reset. MaxSpawns: ${gameState.maxSpawns}, SpawnsLeft: ${gameState.spawnsLeft}`);
}

// Helper function to find nearest player to a monster
function findNearestPlayer(monster) {
  let nearestPlayer = null;
  let shortestDistance = Infinity;

  for (const playerCode in gameState.players) {
    const player = gameState.players[playerCode];
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestPlayer = player;
    }
  }

  return nearestPlayer;
}





function spawnMonster() {
  if (gameState.connectedPlayers > 1) console.log("Connected players: ", gameState.connectedPlayers);
  //console.log("Current monsters: ", gameState.monsters.length, "Max monsters: ", levelData[gameState.gameLevel].maxMonsters);
  //console.log("Spawns left: ", gameState.spawnsLeft);

  if (gameState.spawnsLeft === undefined) {
    console.log("spawnsLeft is undefined. Initializing...");
    gameState.spawnsLeft = levelData[gameState.gameLevel].maxMonsters;
  }


  // Check if there are any connected players
  if (gameState.connectedPlayers > 0) {
    // Check if monsters need to be spawned
    //console.log("There are connected Players and we will spawn monsters");
    if (gameState.monsters.length < levelData[gameState.gameLevel].maxMonsters && gameState.spawnsLeft > 0) {
      let x, y;

      // Spawn near a random player if any exist
      const playerCodes = Object.keys(gameState.players);
      if (playerCodes.length > 0) {
        const randomPlayerCode = playerCodes[Math.floor(Math.random() * playerCodes.length)];
        const randomPlayer = gameState.players[randomPlayerCode];

        // Spawn within 300-600 pixels of the player
        const spawnDistance = 300 + Math.random() * 300;
        const angle = Math.random() * 2 * Math.PI;

        let attempts = 0;
        do {
          x = randomPlayer.x + Math.cos(angle) * spawnDistance;
          y = randomPlayer.y + Math.sin(angle) * spawnDistance;

          // Keep within world bounds
          x = Math.max(MONSTER_WIDTH, Math.min(x, WORLD_WIDTH - MONSTER_WIDTH));
          y = Math.max(MONSTER_HEIGHT, Math.min(y, WORLD_HEIGHT - MONSTER_HEIGHT));
          attempts++;
        } while (isOverlapping(x, y, MONSTER_WIDTH, MONSTER_HEIGHT) && attempts < 50);
      } else {
        // No players, spawn randomly
        do {
          x = Math.random() * (WORLD_WIDTH - MONSTER_WIDTH);
          y = Math.random() * (WORLD_HEIGHT - MONSTER_HEIGHT);
        } while (isOverlapping(x, y, MONSTER_WIDTH, MONSTER_HEIGHT));
      }

      let chaser = false;
      // Make some monsters chasers (30% chance)
      if (Math.random() < 0.3) {
        chaser = true;
      }
      // Reset chaseTrigger if it was set by a killed monster, as a new chaser is being spawned
      gameState.chaseTrigger = false;

      // Randomly assign a demon type
      const demonType = levelData[gameState.gameLevel].monsters[Math.floor(Math.random() * levelData[gameState.gameLevel].monsters.length)];

      // Set the maximum damage based on the demon type
      let maxDamage;
      switch (demonType) {
        case 'Condemnation':
          maxDamage = 2;
          break;
        case 'Fear':
          maxDamage = 3;
          break;
        case 'Unbelief':
          maxDamage = 5;
          break;
        case 'Ignorance':
          maxDamage = 2;
          break;
        case 'Strife':
          maxDamage = 6;
          break;
        case 'Depression':
          maxDamage = 4;
          break;
        case 'Confusion':
          maxDamage = 3;
          break;
        case 'Doubt':
          maxDamage = 5;
          break;
        case 'Infirmity':
          maxDamage = 7;
          break;
        default:
          maxDamage = 1;
      }

      const newMonster = {
        x: x,
        y: y,
        health: 10,
        width: MONSTER_WIDTH,
        height: MONSTER_HEIGHT,
        demonType: demonType,
        maxDamage: maxDamage,
        chaser: chaser,
        chasingStartTime: null,
        behaviorStartTime: Date.now(),
        showHealth: true,
        showHealthTimeout: null,
        isAttacked: false,
        healthBar: {
          x: 0,
          y: 0,
          width: 0,
          height: 7,
          color: 'green'
        }
      };

      gameState.monsters.push(newMonster);
      gameState.spawnsLeft--;
      console.log("Monster spawned. Total monsters:", gameState.monsters.length);
    } else {
      console.log("Cannot spawn monster. Reason:",
        gameState.monsters.length >= levelData[gameState.gameLevel].maxMonsters ? "Max monsters reached" : "No spawns left");
    }
    // Broadcast the updated game state to clients
    io.emit('gameStateUpdate', gameState);
  } else {
    console.log("No connected players, skipping monster spawn");
  }
}




// Save game state endpoint
app.post('/save-game-state', (req, res) => {
  // Save the current game state to a file or database
  // ...

  res.json({ success: true });
});

// Load game state endpoint
app.get('/load-game-state', (req, res) => {
  // Load the game state from a file or database
  // ...

  res.json(gameState);
});



function updateMonsters() {
  gameState.monsters.forEach(monster => {
    if (monster.chaser) {
      // Chase the nearest player
      let nearestPlayer = findNearestPlayer(monster);
      if (nearestPlayer) {
        let dx = nearestPlayer.x - monster.x;
        let dy = nearestPlayer.y - monster.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate new position
        const newX = monster.x + (dx / distance) * MONSTER_SPEED;
        const newY = monster.y + (dy / distance) * MONSTER_SPEED;

        // Check wall collision before moving
        if (!isOverlapping(newX, newY, MONSTER_WIDTH, MONSTER_HEIGHT)) {
          monster.x = newX;
          monster.y = newY;
        }
      }
    } else {
      // Random walk
      if (monster.walkingDistance === undefined) {
        monster.walkingDistance = Math.random() * (MAX_WALK_DISTANCE - MIN_WALK_DISTANCE) + MIN_WALK_DISTANCE;
        monster.angle = Math.random() * 2 * Math.PI;
      }

      let dx = Math.cos(monster.angle) * MONSTER_SPEED;
      let dy = Math.sin(monster.angle) * MONSTER_SPEED;

      // Calculate new position
      const newX = monster.x + dx;
      const newY = monster.y + dy;

      // Check wall collision before moving
      if (!isOverlapping(newX, newY, MONSTER_WIDTH, MONSTER_HEIGHT)) {
        monster.x = newX;
        monster.y = newY;
        monster.walkingDistance -= MONSTER_SPEED;
      } else {
        // Hit a wall, pick a new direction
        monster.walkingDistance = undefined;
        monster.angle = undefined;
      }

      // Keep monster within world bounds
      monster.x = Math.max(MONSTER_WIDTH / 2, Math.min(monster.x, WORLD_WIDTH - MONSTER_WIDTH));
      monster.y = Math.max(MONSTER_HEIGHT / 2, Math.min(monster.y, WORLD_HEIGHT - MONSTER_HEIGHT));


      if (monster.walkingDistance <= 0) {
        monster.walkingDistance = undefined;
        monster.angle = undefined;
      }
    }
  });
}

function spawnHealingPoint() {
  // Spawn up to 5 healing points for the larger world
  if (gameState.healingPoints.length < 5) {
    let x, y;
    do {
      x = Math.random() * WORLD_WIDTH;
      y = Math.random() * WORLD_HEIGHT;
    } while (isOverlapping(x, y, 30, 30));

    const healingPoint = {
      id: Date.now(),
      x: x,
      y: y,
      width: 30,
      height: 30
    };

    gameState.healingPoints.push(healingPoint);
    console.log(`Healing point spawned at (${x}, ${y})`);
    console.log(`Current healing points: ${gameState.healingPoints.length}`);
  }
}

function collectHealingPoint(playerCode, healingPointId) {
  const player = gameState.players[playerCode];
  const healingPointIndex = gameState.healingPoints.findIndex(hp => hp.id === healingPointId);

  if (player && healingPointIndex !== -1) {
    // Remove the healing point
    gameState.healingPoints.splice(healingPointIndex, 1);

    // Heal the player
    player.health = Math.min(player.health + 10, player.maxHealth);

    // Spawn a new healing point
    spawnHealingPoint();

    // Broadcast the updated game state
    io.emit('gameStateUpdate', gameState);

    console.log(`Player ${playerCode} collected healing point ${healingPointId}`);
  }
}

// In your server initialization
for (let i = 0; i < MAX_HEALING_POINTS; i++) {
  spawnHealingPoint();

}
// Call this function periodically or when needed
setInterval(() => {
  if (gameState.healingPoints.length < MAX_HEALING_POINTS) {
    spawnHealingPoint();
  }
}, 30000); // Check every 30 seconds, adjust as needed



setInterval(() => {
  updateMonsters();
  io.emit('gameStateUpdate', gameState);
}, 100);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});