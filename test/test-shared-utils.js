const assert = require('assert');

// Test that utils module loads and exports expected functions
const utils = require('../src/shared/utils');

// Test generateId
assert.strictEqual(typeof utils.generateId, 'function', 'generateId should be a function');
const id1 = utils.generateId();
const id2 = utils.generateId();
assert.strictEqual(typeof id1, 'string', 'generateId should return a string');
assert.ok(id1.length >= 8, 'generateId should return at least 8 chars');
assert.ok(/^[0-9a-f]+$/.test(id1), 'generateId should return hex string');
assert.notStrictEqual(id1, id2, 'generateId should return unique values');

// Test generateUUID
assert.strictEqual(typeof utils.generateUUID, 'function', 'generateUUID should be a function');
const uuid1 = utils.generateUUID();
const uuid2 = utils.generateUUID();
assert.strictEqual(typeof uuid1, 'string', 'generateUUID should return a string');
assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid1), 'generateUUID should return valid UUID format');
assert.notStrictEqual(uuid1, uuid2, 'generateUUID should return unique values');

console.log('All shared utils tests passed!');
console.log(`  generateId() => ${id1}`);
console.log(`  generateUUID() => ${uuid1}`);
