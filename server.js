const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();
const Game = require('./src/server/Game');
const RoomManager = require('./src/server/RoomManager');
const verseSongRouter = require('./src/server/routes/verseSong');
const { retryFailedGenerations } = require('./src/server/jobs/retryFailedGenerations');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'lobby.html'));
});

// Initialize Managers
const roomManager = new RoomManager(io);
const gameInstances = new Map(); // roomId -> Game instance

// No shared solo game — each player gets their own instance via startSoloGame

// ==================== REST API ====================

// Register a new user
app.post('/api/register', (req, res) => {
  const { username } = req.body;
  const result = roomManager.registerUser(username);
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

// Verse Song Routes
app.use('/api/verse-song', verseSongRouter);

// ==================== Socket.IO ====================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Solo game: each player gets their own isolated game instance
  socket.on('startSoloGame', () => {
    const soloRoomId = `solo-${socket.id}`;
    const game = new Game(io, soloRoomId);
    gameInstances.set(soloRoomId, game);
    game.onEmpty = () => {
      gameInstances.delete(soloRoomId);
      console.log(`Solo game ${soloRoomId} cleaned up`);
    };
    socket.join(`room:${soloRoomId}`);
    game.addPlayer(socket);
    game.start();
  });

  // Join an existing multiplayer game (from lobby redirect)
  socket.on('joinGame', (roomId) => {
    const game = gameInstances.get(roomId);
    if (game) {
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
      // Create new Game instance for this room
      const game = new Game(io, roomId);
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

    // Start retry job for failed generations (every 30 minutes)
    setInterval(retryFailedGenerations, 30 * 60 * 1000);
    console.log('🔄 Retry job scheduled (30 minute interval)');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}

initializeDB();

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
