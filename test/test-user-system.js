#!/usr/bin/env node
/**
 * Test User Registration System
 * Tests: RoomManager user management, Mongoose model validation, clerkAuth middleware
 * Run: node test/test-user-system.js
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  ✓ ' + message);
        passed++;
    } else {
        console.log('  ✗ FAIL: ' + message);
        failed++;
    }
}

// ==================== RoomManager Tests ====================

console.log('\n=== RoomManager: Guest Registration ===');

const RoomManager = require('../src/server/RoomManager');

// Create a mock io object (RoomManager constructor needs it)
const mockIO = {
    emit: function () {},
    to: function () { return { emit: function () {} }; }
};

const rm = new RoomManager(mockIO);

// Test: Valid guest registration (no clerkId)
const guestResult = rm.registerUser('TestGuest');
assert(guestResult.success === true, 'Guest registration succeeds');
assert(guestResult.user.username === 'TestGuest', 'Username is correct');
assert(guestResult.user.sessionToken.length > 0, 'Session token is generated');
assert(guestResult.user.clerkId === null, 'clerkId is null for guest');

// Test: Valid registration with clerkId
const clerkResult = rm.registerUser('ClerkUser', 'clerk_abc123');
assert(clerkResult.success === true, 'Registration with clerkId succeeds');
assert(clerkResult.user.clerkId === 'clerk_abc123', 'clerkId is stored');

// Test: Duplicate username
const dupeResult = rm.registerUser('TestGuest');
assert(dupeResult.success === false, 'Duplicate username rejected');
assert(dupeResult.error.includes('already taken'), 'Error mentions username taken');

// Test: Case-insensitive duplicate
const caseDupeResult = rm.registerUser('testguest');
assert(caseDupeResult.success === false, 'Case-insensitive duplicate rejected');

// Test: Username too short
const shortResult = rm.registerUser('ab');
assert(shortResult.success === false, 'Short username rejected');
assert(shortResult.error.includes('3-20'), 'Error mentions length requirement');

// Test: Username too long
const longResult = rm.registerUser('a'.repeat(21));
assert(longResult.success === false, 'Long username rejected');

// Test: Invalid characters
const invalidResult = rm.registerUser('user name!');
assert(invalidResult.success === false, 'Invalid characters rejected');
assert(invalidResult.error.includes('letters, numbers, and underscores'), 'Error mentions valid chars');

// Test: Empty username
const emptyResult = rm.registerUser('');
assert(emptyResult.success === false, 'Empty username rejected');

// Test: Null / undefined username
const nullResult = rm.registerUser(null);
assert(nullResult.success === false, 'Null username rejected');

// Test: Valid chars (underscores, numbers)
const validCharsResult = rm.registerUser('User_123');
assert(validCharsResult.success === true, 'Username with underscores and numbers succeeds');

console.log('\n=== RoomManager: Login ===');

// Test: Login with valid token
const loginResult = rm.loginUser(guestResult.user.sessionToken);
assert(loginResult.success === true, 'Login with valid token succeeds');
assert(loginResult.user.username === 'TestGuest', 'Login returns correct username');

// Test: Login with invalid token
const badLoginResult = rm.loginUser('invalid_token');
assert(badLoginResult.success === false, 'Login with invalid token fails');

console.log('\n=== RoomManager: Socket Association ===');

// Test: Associate socket
rm.associateSocket('socket123', guestResult.user.sessionToken);
const socketUser = rm.getUserFromSocket('socket123');
assert(socketUser !== null, 'User found from socket');
assert(socketUser.username === 'TestGuest', 'Socket maps to correct user');

// Test: Unknown socket
const unknownSocketUser = rm.getUserFromSocket('unknown_socket');
assert(unknownSocketUser === null, 'Unknown socket returns null');

console.log('\n=== RoomManager: Room Creation ===');

// Test: Create room
const roomResult = rm.createRoom(guestResult.user.sessionToken, {
    name: 'Test Room',
    preset: 'normal',
    gameMode: 'classic'
});
assert(roomResult.success === true, 'Room creation succeeds');
assert(roomResult.room.name === 'Test Room', 'Room name is correct');
assert(roomResult.room.players.length === 1, 'Room has 1 player (host)');

// Test: Can't create room if already in one
const dupeRoomResult = rm.createRoom(guestResult.user.sessionToken, { name: 'Second Room' });
assert(dupeRoomResult.success === false, 'Cannot create room while in one');

// Test: Unauthenticated room creation
const noAuthRoomResult = rm.createRoom('bogus_token', { name: 'No Auth' });
assert(noAuthRoomResult.success === false, 'Unauthenticated room creation fails');

console.log('\n=== RoomManager: Room List ===');

// Test: Room list
const roomList = rm.getRoomList();
assert(Array.isArray(roomList), 'Room list is an array');
assert(roomList.length > 0, 'Room list has rooms');
assert(roomList[0].name === 'Test Room', 'Room name in list');

console.log('\n=== RoomManager: Join/Leave Room ===');

// Join with another user
const joinUser = rm.registerUser('Joiner');
assert(joinUser.success === true, 'Second user registered for join test');

const joinResult = rm.joinRoom(joinUser.user.sessionToken, roomResult.room.id);
assert(joinResult.success === true, 'Join room succeeds');
assert(joinResult.room.players.length === 2, 'Room now has 2 players');

// Leave the room
const leaveResult = rm.leaveRoom(joinUser.user.sessionToken, roomResult.room.id);
assert(leaveResult.success === true, 'Leave room succeeds');

// ==================== Mongoose Model Tests ====================

console.log('\n=== Mongoose Models: Schema Validation (dry) ===');

// These tests check model schemas WITHOUT connecting to MongoDB.
// We test that required fields and validators are defined correctly.

const mongoose = require('mongoose');

const User = require('../src/server/models/User');
const World = require('../src/server/models/World');
const PlayerProgress = require('../src/server/models/PlayerProgress');
const WorldMap = require('../src/server/models/WorldMap');

// Test: User model loads
assert(typeof User === 'function', 'User model loads');
assert(User.modelName === 'User', 'User model name is correct');

// Test: User schema required fields
const userPaths = User.schema.paths;
assert(userPaths.clerkId.isRequired, 'clerkId is required');
assert(userPaths.username.isRequired, 'username is required');
assert(userPaths.agreedToTerms.isRequired, 'agreedToTerms is required');
assert(userPaths.agreedToPrivacy.isRequired, 'agreedToPrivacy is required');
assert(userPaths.ageVerified.isRequired, 'ageVerified is required');

// Test: User username validation
const usernameValidator = userPaths.username.validators.find(v => v.type === 'regexp' || v.type === 'match');
assert(usernameValidator !== undefined, 'Username has regex validator');

// Test: World model loads
assert(typeof World === 'function', 'World model loads');
assert(World.modelName === 'World', 'World model name is correct');

// Test: World schema fields
const worldPaths = World.schema.paths;
assert(worldPaths.slug.isRequired, 'World slug is required');
assert(worldPaths.name.isRequired, 'World name is required');
assert(worldPaths.authorId.isRequired, 'World authorId is required');

// Test: World visibility enum
const visEnum = worldPaths.visibility.enumValues;
assert(visEnum.includes('private'), 'Visibility includes private');
assert(visEnum.includes('unlisted'), 'Visibility includes unlisted');
assert(visEnum.includes('public'), 'Visibility includes public');

// Test: PlayerProgress model
assert(typeof PlayerProgress === 'function', 'PlayerProgress model loads');
assert(PlayerProgress.modelName === 'PlayerProgress', 'PlayerProgress model name is correct');

// Test: WorldMap model
assert(typeof WorldMap === 'function', 'WorldMap model loads');
assert(WorldMap.modelName === 'WorldMap', 'WorldMap model name is correct');

const worldMapPaths = WorldMap.schema.paths;
assert(worldMapPaths.worldId.isRequired, 'WorldMap worldId is required');
assert(worldMapPaths.generatorType.isRequired, 'WorldMap generatorType is required');

// Test: WorldMap generatorType enum
const genEnum = worldMapPaths.generatorType.enumValues;
assert(genEnum.includes('classic'), 'generatorType includes classic');
assert(genEnum.includes('city'), 'generatorType includes city');
assert(genEnum.includes('custom'), 'generatorType includes custom');

// ==================== clerkAuth Middleware Tests ====================

console.log('\n=== clerkAuth Middleware: Unit Tests ===');

const { requireAuth, optionalAuth } = require('../src/server/middleware/clerkAuth');

assert(typeof requireAuth === 'function', 'requireAuth is a function');
assert(typeof optionalAuth === 'function', 'optionalAuth is a function');

// Test: requireAuth rejects missing Authorization header
(async function testRequireAuthNoHeader() {
    const mockReq = { headers: {} };
    let statusCode = null;
    let responseBody = null;
    const mockRes = {
        status: function (code) { statusCode = code; return this; },
        json: function (body) { responseBody = body; }
    };
    const mockNext = function () {};

    await requireAuth(mockReq, mockRes, mockNext);
    assert(statusCode === 401, 'requireAuth returns 401 for missing header');
    assert(responseBody.error.includes('Authorization'), 'Error mentions Authorization header');
})();

// Test: requireAuth rejects malformed Authorization header
(async function testRequireAuthBadHeader() {
    const mockReq = { headers: { authorization: 'NotBearer token123' } };
    let statusCode = null;
    const mockRes = {
        status: function (code) { statusCode = code; return this; },
        json: function () {}
    };
    const mockNext = function () {};

    await requireAuth(mockReq, mockRes, mockNext);
    assert(statusCode === 401, 'requireAuth returns 401 for malformed header');
})();

// Test: requireAuth rejects invalid JWT (will throw because no valid Clerk secret)
(async function testRequireAuthInvalidJWT() {
    const mockReq = { headers: { authorization: 'Bearer fake_jwt_token_here' } };
    let statusCode = null;
    const mockRes = {
        status: function (code) { statusCode = code; return this; },
        json: function () {}
    };
    const mockNext = function () {};

    await requireAuth(mockReq, mockRes, mockNext);
    assert(statusCode === 401, 'requireAuth returns 401 for invalid JWT');
})();

// Test: optionalAuth passes through without auth header
(async function testOptionalAuthNoHeader() {
    const mockReq = { headers: {} };
    let nextCalled = false;
    const mockRes = {};
    const mockNext = function () { nextCalled = true; };

    await optionalAuth(mockReq, mockRes, mockNext);
    assert(nextCalled === true, 'optionalAuth calls next() without auth header');
    assert(mockReq.auth === undefined, 'optionalAuth does not set req.auth without header');
})();

// Test: optionalAuth silently ignores invalid token
(async function testOptionalAuthBadToken() {
    const mockReq = { headers: { authorization: 'Bearer bad_token' } };
    let nextCalled = false;
    const mockRes = {};
    const mockNext = function () { nextCalled = true; };

    await optionalAuth(mockReq, mockRes, mockNext);
    assert(nextCalled === true, 'optionalAuth calls next() even with bad token');
})();

// Wait a moment for async tests to complete
setTimeout(() => {
    // ---- Summary ----
    console.log('\n=== Results ===');
    console.log('Passed: ' + passed + ', Failed: ' + failed);
    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('All tests passed!');
        process.exit(0);
    }
}, 1000);
