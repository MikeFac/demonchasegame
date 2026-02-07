const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const Game = require('./src/server/Game');
const RoomManager = require('./src/server/RoomManager');

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

// Create default solo game for direct connections (backward compatibility)
const soloGame = new Game(io, 'solo');
soloGame.start();
gameInstances.set('solo', soloGame);

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

// ==================== Socket.IO ====================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // For direct connections (not from lobby), add to solo game immediately
  // Wait a short moment to see if they authenticate via lobby
  let addedToSolo = false;
  setTimeout(() => {
    if (!socket.sessionToken && !addedToSolo) {
      addedToSolo = true;
      socket.join('room:solo');
      soloGame.addPlayer(socket);
    }
  }, 500);

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

      // Add all players in the room to the game
      const room = result.room;
      io.in(`room:${roomId}`).fetchSockets().then(sockets => {
        sockets.forEach(s => {
          game.addPlayer(s);
        });
        game.start();
        io.to(`room:${roomId}`).emit('gameStarted', { roomId });
      });

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

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
