const MapGeneratorFactory = require('./index');
const Constants = require('../../../shared/Constants');

const styles = ['classic', 'narrow', 'labyrinth', 'open', 'city'];

console.log('--- Verifying Map Generators ---');

let allPassed = true;

styles.forEach(style => {
    try {
        console.log(`\nTesting style: ${style}`);
        const result = MapGeneratorFactory.generateMap(style, 2000, 2000, 25);

        if (!result.walls || !Array.isArray(result.walls)) {
            console.error(`❌ FAILED: ${style} - walls not returned or invalid`);
            allPassed = false;
        } else {
            console.log(`✅ Walls generated: ${result.walls.length}`);
        }

        if (!result.grid || !Array.isArray(result.grid)) {
            console.error(`❌ FAILED: ${style} - grid not returned or invalid`);
            allPassed = false;
        } else {
            // Check dimensions
            console.log(`✅ Grid size: ${result.rows}x${result.cols}`);
        }

        if (typeof result.spawnX !== 'number' || typeof result.spawnY !== 'number') {
            console.error(`❌ FAILED: ${style} - spawn point missing`);
            allPassed = false;
        } else {
            console.log(`✅ Spawn point: (${result.spawnX.toFixed(1)}, ${result.spawnY.toFixed(1)})`);
        }

    } catch (err) {
        console.error(`❌ EXCEPTION: ${style}`, err);
        allPassed = false;
    }
});

if (allPassed) {
    console.log('\n--- ALL GENERATORS PASSED ---');
    process.exit(0);
} else {
    console.log('\n--- SOME CHECKS FAILED ---');
    process.exit(1);
}
