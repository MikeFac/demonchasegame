const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();
const Game = require('./src/server/Game');
const RoomManager = require('./src/server/RoomManager');
const { buildMissionGameConfig } = require('./src/server/missionLoader');
const verseSongRouter = require('./src/server/routes/verseSong');
const sermonRouter = require('./src/server/routes/sermon');
const userRouter = require('./src/server/routes/users');
const progressRouter = require('./src/server/routes/progress');
const worldRouter = require('./src/server/routes/worlds');
const groupsRouter = require('./src/server/routes/groups');
const { retryFailedGenerations } = require('./src/server/jobs/retryFailedGenerations');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
// Serve static files from both root (HTML, JS) and public (audio, images)
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'lobby.html'));
});

app.get('/config', (req, res) => {
  res.sendFile(path.join(__dirname, 'config.html'));
});

// Initialize Managers
const roomManager = new RoomManager(io);
const gameInstances = new Map(); // roomId -> Game instance

// No shared solo game — each player gets their own instance via startSoloGame

// ==================== REST API ====================

// Public endpoint: return Clerk publishable key (safe to expose)
app.get('/api/clerk-key', (req, res) => {
  const key = process.env.CLERK_PUBLISHABLE_KEY;
  if (!key) return res.status(404).json({ error: 'Clerk not configured' });
  res.json({ publishableKey: key });
});

// Register a new user (with optional Clerk ID for authenticated users)
app.post('/api/register', (req, res) => {
  const { username, clerkId } = req.body;
  const result = roomManager.registerUser(username, clerkId || undefined);
  res.json(result);
});

// Login with session token
app.post('/api/login', (req, res) => {
  const { sessionToken } = req.body;
  const result = roomManager.loginUser(sessionToken);
  res.json(result);
});

// Get room list
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: roomManager.getRoomList() });
});

// Get client-side config (Clerk keys, etc.)
app.get('/api/config', (req, res) => {
  res.json({
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY
  });
});

// Get monster difficulty preset list
app.get('/api/presets', (req, res) => {
  const GameConfig = require('./src/server/config/GameConfig');
  res.json({ presets: GameConfig.getPresetList() });
});

// Get quiz balance preset list
app.get('/api/quiz-presets', (req, res) => {
  const GameConfig = require('./src/server/config/GameConfig');
  res.json({ presets: GameConfig.getQuizPresetList() });
});

// Verse Song Routes
app.use('/api/verse-song', verseSongRouter);

// Sermon / Devotional Routes
app.use('/api/sermon', sermonRouter);

// New User Registration & Profile Routes
app.use('/api/users', userRouter);

// New Progress Persistence Routes
app.use('/api/progress', progressRouter);

// New World Management & Sharing Routes
app.use('/api/worlds', worldRouter);

// Group Management Routes
app.use('/api/groups', groupsRouter);

// ==================== Socket.IO ====================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Solo game: each player gets their own isolated game instance with custom config
  socket.on('startSoloGame', (options = {}) => {
    const soloRoomId = `solo-${socket.id}`;
    const GameConfig = require('./src/server/config/GameConfig');

    // Use player's selected difficulty, quiz settings, and game speed
    const difficulty = options.difficulty || 'normal';
    const quizSettings = options.quizSettings || null;
    const gameSpeed = options.gameSpeed || 'normal';

    // Map speed to multiplier
    const Constants = require('./src/shared/Constants');
    const speedMultipliers = {
      slow: Constants.SPEED_SLOW,
      normal: Constants.SPEED_NORMAL,
      fast: Constants.SPEED_FAST
    };
    const speedMultiplier = speedMultipliers[gameSpeed] || Constants.SPEED_NORMAL;

    // Use custom balance if provided (from URL config), otherwise use preset
    var gameConfig;
    if (options.balance) {
      gameConfig = GameConfig.createFromCustomBalance(
        options.balance,
        quizSettings,
        options.levels || null,
        {
          fixedMonsters: options.fixedMonsters || null,
          randomSpawnsEnabled: options.randomSpawnsEnabled,
          randomSpawnBudget: options.randomSpawnBudget,
          mapData: options.mapData || null,
          playerSpawn: options.playerSpawn || null
        }
      );
    } else {
      gameConfig = GameConfig.createGameConfig(difficulty, quizSettings);
    }
    gameConfig.gameSpeed = gameSpeed;
    gameConfig.speedMultiplier = speedMultiplier;
    gameConfig.mapStyle = options.mapStyle || 'classic';

    const game = new Game(io, soloRoomId, gameConfig);

    gameInstances.set(soloRoomId, game);
    game.onEmpty = () => {
      gameInstances.delete(soloRoomId);
      console.log(`Solo game ${soloRoomId} cleaned up`);
    };
    socket.join(`room:${soloRoomId}`);
    game.addPlayer(socket);
    game.start();

    // Emit game speed to client
    socket.emit('gameSpeedUpdate', gameSpeed);
  });

  // Join an existing multiplayer game (from lobby redirect)
  socket.on('joinGame', (roomId) => {
    const game = gameInstances.get(roomId);
    if (game) {
      // Look up username from RoomManager session
      const token = roomManager.getTokenForSocket(socket.id);
      if (token) {
        const user = roomManager.users.get(token);
        if (user) socket.username = user.username;
      }
      socket.join(`room:${roomId}`);
      game.addPlayer(socket);
    } else {
      console.warn(`joinGame: no game found for room ${roomId}`);
    }
  });

  // Authenticate socket with session token
  socket.on('authenticate', (sessionToken, callback) => {
    const result = roomManager.loginUser(sessionToken);
    if (result.success) {
      roomManager.associateSocket(socket.id, sessionToken);
      socket.sessionToken = sessionToken;
      callback({ success: true, user: result.user });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  // Get room list
  socket.on('getRooms', (callback) => {
    callback({ rooms: roomManager.getRoomList() });
  });

  // Create room
  socket.on('createRoom', (options, callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false, error: 'Not authenticated' });
    }
    const result = roomManager.createRoom(socket.sessionToken, options);
    if (result.success) {
      socket.join(`room:${result.room.id}`);
      io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
    }
    callback(result);
  });

  // Join room
  socket.on('joinRoom', (roomId, callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false, error: 'Not authenticated' });
    }
    const result = roomManager.joinRoom(socket.sessionToken, roomId);
    if (result.success) {
      socket.join(`room:${roomId}`);
      io.to(`room:${roomId}`).emit('roomUpdated', { room: result.room });
      io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
    }
    callback(result);
  });

  // Leave room
  socket.on('leaveRoom', (roomId, callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false });
    }
    const result = roomManager.leaveRoom(socket.sessionToken, roomId);
    socket.leave(`room:${roomId}`);
    if (result.success && !result.roomDeleted) {
      io.to(`room:${roomId}`).emit('roomUpdated', { room: result.room });
    }
    io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
    callback(result);
  });

  // Set ready status
  socket.on('setReady', ({ roomId, ready }, callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false });
    }
    const result = roomManager.setReady(socket.sessionToken, roomId, ready);
    if (result.success) {
      io.to(`room:${roomId}`).emit('roomUpdated', { room: result.room });
    }
    callback(result);
  });

  // Start game (host only)
  socket.on('startGame', (roomId, callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false, error: 'Not authenticated' });
    }
    const result = roomManager.startGame(socket.sessionToken, roomId);
    if (result.success) {
      // Get room config and create game with preset + quiz settings
      const room = roomManager.rooms.get(roomId);
      const GameConfig = require('./src/server/config/GameConfig');
      let gameConfig;

      if (room.settings.gameMode === 'mission') {
        // Load mission JSON and build config from it
        gameConfig = buildMissionGameConfig(room.settings, GameConfig);
        if (!gameConfig) {
          room.status = 'waiting';
          return callback({ success: false, error: 'Failed to load mission data' });
        }
      } else {
        gameConfig = GameConfig.createGameConfig(
          room.settings.preset,
          room.settings.quizSettings
        );
        gameConfig.mapStyle = room.settings.mapStyle || 'classic';
      }

      // Create new Game instance for this room with config
      const game = new Game(io, roomId, gameConfig);
      gameInstances.set(roomId, game);
      game.onEmpty = () => {
        gameInstances.delete(roomId);
        console.log(`Game for room ${roomId} cleaned up (all players left)`);
      };
      game.start();

      // Notify lobby clients — they'll redirect to /?room=ROOMID and joinGame
      io.to(`room:${roomId}`).emit('gameStarted', { roomId });

      io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
    }
    callback(result);
  });

  // Quick play
  socket.on('quickPlay', (callback) => {
    if (!socket.sessionToken) {
      return callback({ success: false, error: 'Not authenticated' });
    }
    const result = roomManager.quickPlay(socket.sessionToken);
    if (result.success) {
      socket.join(`room:${result.room.id}`);
      io.to(`room:${result.room.id}`).emit('roomUpdated', { room: result.room });
      io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
    }
    callback(result);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
    io.emit('roomListUpdated', { rooms: roomManager.getRoomList() });
  });
});

// Initialize MongoDB connection
async function initializeDB() {
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set—VerseSong features disabled');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for VerseSong');
    console.log('   URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password

    // Start retry job for failed generations (every 30 minutes)
    setInterval(retryFailedGenerations, 30 * 60 * 1000);
    console.log('🔄 Retry job scheduled (30 minute interval)');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Connection URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password
    console.error('   Make sure MongoDB is running on localhost:27017 with proper credentials');
    console.error('   Or set MONGODB_URI to your MongoDB connection string');
  }
}

initializeDB();

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
