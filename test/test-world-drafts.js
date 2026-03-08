#!/usr/bin/env node

const assert = require('assert');
const {
    createStarterWorldPayload,
    normalizeWorldPayload
} = require('../src/server/utils/worldDrafts');

const starter = createStarterWorldPayload({
    name: 'Easter Journey',
    description: 'Seasonal world',
    visibility: 'public'
});

assert.strictEqual(starter.name, 'Easter Journey');
assert.strictEqual(starter.visibility, 'public');
assert.strictEqual(starter.status, 'draft');
assert.strictEqual(starter.chapters.length, 1);
assert.strictEqual(starter.missions.length, 3);
assert.ok(Array.isArray(starter.missions[0].qualities));
assert.ok(Array.isArray(starter.missions[0].monsters));
assert.ok(starter.missions[0].monstersToKill > 0);
assert.deepStrictEqual(starter.chapters[0].missionIds, starter.missions.map((mission) => mission.id));

const normalizedCreate = normalizeWorldPayload({
    name: '  My World  '
}, {
    requireName: true,
    createStarterIfEmpty: true
});

assert.ok(!normalizedCreate.error);
assert.strictEqual(normalizedCreate.value.name, 'My World');
assert.strictEqual(normalizedCreate.value.missions.length, 3);

const normalizedPatch = normalizeWorldPayload({
    missions: [
        {
            name: 'Faith Opening',
            category: 'Faith',
            mapStyle: 'classic',
            monsterTypes: ['Fear', 'Doubt']
        }
    ]
}, {
    requireName: false,
    createStarterIfEmpty: false
});

assert.ok(!normalizedPatch.error);
assert.strictEqual(normalizedPatch.value.missions.length, 1);
assert.strictEqual(normalizedPatch.value.chapters.length, 1);
assert.strictEqual(normalizedPatch.value.missions[0].id, 'faith-opening');
assert.deepStrictEqual(normalizedPatch.value.missions[0].qualities, ['Faith']);
assert.deepStrictEqual(normalizedPatch.value.missions[0].monsters, ['Fear', 'Doubt']);

const invalid = normalizeWorldPayload({
    name: 'x',
    visibility: 'friends-only'
}, {
    requireName: true,
    createStarterIfEmpty: false
});

assert.strictEqual(invalid.error, 'World name must be at least 2 characters');

console.log('test-world-drafts passed');
