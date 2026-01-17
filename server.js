const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const Game = require('./src/server/Game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve the game files
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize Game
const game = new Game(io);
game.start();

// Handle WebSocket connections
io.on('connection', (socket) => {
  // console.log('A user connected');
  game.addPlayer(socket);
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});