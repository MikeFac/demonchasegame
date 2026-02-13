const crypto = require('crypto');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();      // roomId -> Room
        this.users = new Map();      // sessionToken -> User
        this.userSockets = new Map(); // socketId -> sessionToken
    }

    // ==================== User Management ====================

    /**
     * Register a new user with just a username
     * @param {string} username 
     * @returns {{success: boolean, user?: Object, error?: string}}
     */
    registerUser(username) {
        // Validate username
        if (!username || typeof username !== 'string') {
            return { success: false, error: 'Username is required' };
        }

        const cleanUsername = username.trim();
        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
            return { success: false, error: 'Username must be 3-20 characters' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
        }

        // Check if username taken (case-insensitive)
        for (const user of this.users.values()) {
            if (user.username.toLowerCase() === cleanUsername.toLowerCase()) {
                return { success: false, error: 'Username already taken' };
            }
        }

        const user = {
            id: crypto.randomBytes(8).toString('hex'),
            username: cleanUsername,
            sessionToken: crypto.randomBytes(16).toString('hex'),
            createdAt: new Date(),
            lastSeen: new Date()
        };

        this.users.set(user.sessionToken, user);

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                sessionToken: user.sessionToken
            }
        };
    }

    /**
     * Authenticate user with session token
     * @param {string} sessionToken 
     * @returns {{success: boolean, user?: Object, error?: string}}
     */
    loginUser(sessionToken) {
        const user = this.users.get(sessionToken);
        if (!user) {
            return { success: false, error: 'Invalid session' };
        }

        user.lastSeen = new Date();
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                sessionToken: user.sessionToken
            }
        };
    }

    /**
     * Associate a socket with a user
     */
    associateSocket(socketId, sessionToken) {
        this.userSockets.set(socketId, sessionToken);
    }

    /**
     * Get user from socket
     */
    getUserFromSocket(socketId) {
        const token = this.userSockets.get(socketId);
        return token ? this.users.get(token) : null;
    }

    // ==================== Room Management ====================

    /**
     * Create a new game room
     * @param {string} hostToken - Session token of host
     * @param {Object} options - Room options
     * @returns {{success: boolean, room?: Object, error?: string}}
     */
    createRoom(hostToken, options = {}) {
        const host = this.users.get(hostToken);
        if (!host) {
            return { success: false, error: 'Must be logged in to create room' };
        }

        // Check if user is already in a room
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.id === host.id)) {
                return { success: false, error: 'Already in a room' };
            }
        }

        // Validate monster difficulty preset
        const GameConfig = require('./config/GameConfig');
        const presetName = options.preset || 'normal';

        if (!GameConfig.PRESETS[presetName]) {
            return { success: false, error: 'Invalid difficulty preset' };
        }

        // Validate quiz settings (independent of monster difficulty)
        let quizSettings = GameConfig.DEFAULT_QUIZ_SETTINGS;
        if (options.quizSettings) {
            if (GameConfig.validateQuizSettings(options.quizSettings)) {
                quizSettings = options.quizSettings;
            } else {
                return { success: false, error: 'Quiz settings must have 4 modes summing to 100%' };
            }
        }

        const room = {
            id: crypto.randomBytes(4).toString('hex'),
            name: options.name || `${host.username}'s Room`,
            hostId: host.id,
            maxPlayers: Math.min(4, Math.max(2, options.maxPlayers || 4)),
            players: [{
                id: host.id,
                username: host.username,
                ready: false,
                isHost: true
            }],
            status: 'waiting',
            settings: {
                category: options.category || '',
                preset: presetName,
                presetDisplay: GameConfig.PRESETS[presetName].name,
                quizSettings: quizSettings,
                mapStyle: options.mapStyle || 'classic'
            },
            createdAt: new Date()
        };

        this.rooms.set(room.id, room);

        return { success: true, room: this.sanitizeRoom(room) };
    }

    /**
     * Join an existing room
     * @param {string} userToken 
     * @param {string} roomId 
     * @returns {{success: boolean, room?: Object, error?: string}}
     */
    joinRoom(userToken, roomId) {
        const user = this.users.get(userToken);
        if (!user) {
            return { success: false, error: 'Must be logged in to join' };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.status !== 'waiting' && room.status !== 'playing') {
            return { success: false, error: 'Room is not joinable' };
        }

        if (room.players.length >= room.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        // Check if already in this room
        if (room.players.some(p => p.id === user.id)) {
            return { success: true, room: this.sanitizeRoom(room) };
        }

        // Check if in another room
        for (const r of this.rooms.values()) {
            if (r.id !== roomId && r.players.some(p => p.id === user.id)) {
                return { success: false, error: 'Already in another room' };
            }
        }

        room.players.push({
            id: user.id,
            username: user.username,
            ready: false,
            isHost: false
        });

        return { success: true, room: this.sanitizeRoom(room) };
    }

    /**
     * Leave a room
     * @param {string} userToken 
     * @param {string} roomId 
     */
    leaveRoom(userToken, roomId) {
        const user = this.users.get(userToken);
        if (!user) return { success: false };

        const room = this.rooms.get(roomId);
        if (!room) return { success: false };

        const playerIndex = room.players.findIndex(p => p.id === user.id);
        if (playerIndex === -1) return { success: false };

        room.players.splice(playerIndex, 1);

        // If room is empty, delete it
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return { success: true, roomDeleted: true };
        }

        // If host left, assign new host
        if (room.hostId === user.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
        }

        return { success: true, room: this.sanitizeRoom(room) };
    }

    /**
     * Set player ready status
     */
    setReady(userToken, roomId, ready) {
        const user = this.users.get(userToken);
        if (!user) return { success: false };

        const room = this.rooms.get(roomId);
        if (!room) return { success: false };

        const player = room.players.find(p => p.id === user.id);
        if (!player) return { success: false };

        player.ready = ready;

        return { success: true, room: this.sanitizeRoom(room) };
    }

    /**
     * Start the game (host only)
     */
    startGame(userToken, roomId) {
        const user = this.users.get(userToken);
        if (!user) return { success: false, error: 'Not logged in' };

        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Room not found' };

        if (room.hostId !== user.id) {
            return { success: false, error: 'Only host can start' };
        }

        if (room.players.length < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        // Check all players ready (except host)
        const notReady = room.players.filter(p => !p.isHost && !p.ready);
        if (notReady.length > 0) {
            return { success: false, error: 'Not all players are ready' };
        }

        room.status = 'playing';

        return { success: true, room: this.sanitizeRoom(room) };
    }

    /**
     * Get list of joinable rooms
     */
    getRoomList() {
        const rooms = [];
        for (const room of this.rooms.values()) {
            if (room.status === 'waiting' || room.status === 'playing') {
                rooms.push(this.sanitizeRoom(room));
            }
        }
        return rooms;
    }

    /**
     * Quick play - find or create a room
     */
    quickPlay(userToken) {
        // Find a room with space
        for (const room of this.rooms.values()) {
            if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
                return this.joinRoom(userToken, room.id);
            }
        }

        // No available rooms, create one
        return this.createRoom(userToken, { name: 'Quick Play' });
    }

    /**
     * Remove sensitive data from room for client
     */
    sanitizeRoom(room) {
        return {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            maxPlayers: room.maxPlayers,
            playerCount: room.players.length,
            players: room.players.map(p => ({
                id: p.id,
                username: p.username,
                ready: p.ready,
                isHost: p.isHost
            })),
            status: room.status,
            settings: room.settings
        };
    }

    /**
     * Get session token for a socket ID
     */
    getTokenForSocket(socketId) {
        return this.userSockets.get(socketId) || null;
    }

    /**
     * Handle socket disconnect
     */
    handleDisconnect(socketId) {
        const token = this.userSockets.get(socketId);
        if (!token) return;

        const user = this.users.get(token);
        if (!user) return;

        // Find and leave any rooms
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.id === user.id)) {
                this.leaveRoom(token, room.id);
                // Notify remaining players
                this.io.to(`room:${room.id}`).emit('playerLeft', {
                    playerId: user.id,
                    room: this.rooms.get(room.id) ? this.sanitizeRoom(this.rooms.get(room.id)) : null
                });
            }
        }

        this.userSockets.delete(socketId);
    }
}

module.exports = RoomManager;
