// Test script for Cloze quiz mode
// Run: node test_cloze.js

// Load GameConfig (exports via module.exports in Node.js)
const GameConfig = require('./src/shared/GameConfig');

console.log('=== Testing GameConfig DEFAULT_QUIZ_SETTINGS ===');
const settings = GameConfig.DEFAULT_QUIZ_SETTINGS;
console.log('Settings:', settings);

const total = Object.values(settings).reduce((a, b) => a + b, 0);
console.log('Total:', total);

if (total !== 100) {
    console.error('❌ FAIL: Settings should total 100, got', total);
    process.exit(1);
}

if (!settings.cloze) {
    console.error('❌ FAIL: cloze setting is missing');
    process.exit(1);
}

console.log('✅ PASS: GameConfig has cloze setting with correct total');

// Test validateQuizSettings
console.log('\n=== Testing validateQuizSettings ===');
const valid = GameConfig.validateQuizSettings(settings);
console.log('Valid settings:', valid);

if (!valid) {
    console.error('❌ FAIL: Default settings should be valid');
    process.exit(1);
}

// Test invalid settings
const invalid = GameConfig.validateQuizSettings({ firstLetter: 50, missingWord: 50 });
console.log('Invalid settings (missing keys):', invalid);

if (invalid) {
    console.error('❌ FAIL: Invalid settings should fail validation');
    process.exit(1);
}

console.log('✅ PASS: validateQuizSettings works correctly');

// Test QUIZ_BALANCE_PRESETS
console.log('\n=== Testing QUIZ_BALANCE_PRESETS ===');
const presets = GameConfig.QUIZ_BALANCE_PRESETS;
for (const [key, preset] of Object.entries(presets)) {
    const presetTotal = Object.values(preset.settings).reduce((a, b) => a + b, 0);
    console.log(`Preset "${preset.name}":`, preset.settings, 'Total:', presetTotal);
    if (presetTotal !== 100) {
        console.error(`❌ FAIL: Preset ${key} total should be 100, got`, presetTotal);
        process.exit(1);
    }
    if (!preset.settings.cloze) {
        console.error(`❌ FAIL: Preset ${key} missing cloze`);
        process.exit(1);
    }
}

console.log('✅ PASS: All presets have cloze and total 100');

console.log('\n=== All tests passed! ===');
