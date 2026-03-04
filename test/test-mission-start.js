const { chromium } = require('playwright');

async function testMissionStart() {
    console.log('=== Testing Mission Start ===\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === 'error') {
            console.log('[ERROR]', msg.text());
        }
    });
    
    page.on('pageerror', err => {
        console.log('[PAGE ERROR]', err.message);
    });
    
    try {
        console.log('1. Loading page...');
        await page.goto('http://localhost:3500/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('#gameCanvas', { timeout: 10000 });
        
        // Wait for FTUE to complete and game to fully initialize
        console.log('2. Waiting for game to initialize (FTUE)...');
        await page.waitForTimeout(8000);
        
        // Check game state
        var gameState = await page.evaluate(function() {
            return {
                gameMode: window.gameMode,
                hasPlayer: typeof window.player !== 'undefined',
                hasMonsters: typeof window.monsters !== 'undefined' && window.monsters && window.monsters.length > 0,
                hasGameState: typeof window.gameState !== 'undefined',
                monstersCount: window.monsters ? window.monsters.length : 0,
                playerHealth: window.player ? window.player.health : null
            };
        });
        
        console.log('\n3. Game state after FTUE:');
        console.log('   gameMode:', gameState.gameMode);
        console.log('   hasPlayer:', gameState.hasPlayer);
        console.log('   playerHealth:', gameState.playerHealth);
        console.log('   hasMonsters:', gameState.hasMonsters);
        console.log('   monstersCount:', gameState.monstersCount);
        console.log('   hasGameState:', gameState.hasGameState);
        
        if (gameState.gameMode === 'game' && gameState.hasPlayer && gameState.playerHealth > 0) {
            console.log('\n✅ SUCCESS: Game is running properly after FTUE');
        } else {
            console.log('\n❌ FAILED: Game not running properly');
            console.log('\nRecent console logs:');
            consoleLogs.slice(-20).forEach(l => {
                console.log('   [' + l.type + ']', l.text);
            });
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testMissionStart().catch(console.error);
