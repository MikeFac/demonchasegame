const { chromium } = require('playwright');

async function testReviewMode() {
    console.log('=== Testing Review Mode ===\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    
    try {
        console.log('1. Loading page...');
        await page.goto('http://localhost:3500/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('#gameCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        // Check that vQuality is set
        const vQualityCheck = await page.evaluate(function() {
            return {
                vQuality: window.vQuality,
            };
        });
        
        console.log('2. vQuality:', vQualityCheck.vQuality);
        
        // Test ReviewMode.startReviewMode
        var reviewTest = await page.evaluate(function() {
            window.ReviewMode.startReviewMode({ returnTo: 'game', vQuality: 'Hope' });
            return {
                gameMode: window.gameMode,
                vQuality: window.vQuality
            };
        });
        
        console.log('2. After startReviewMode:');
        console.log('   gameMode:', reviewTest.gameMode);
        console.log('   vQuality:', reviewTest.vQuality);
        
        // Test restoreGameState
        var restoreTest = await page.evaluate(function() {
            window.ReviewMode.restoreGameState();
            return {
                gameMode: window.gameMode
            };
        });
        
        console.log('1. After restoreGameState:');
        console.log('   gameMode:', restoreTest.gameMode);
        
        if (reviewTest.gameMode === 'review' && reviewTest.vQuality === 'Hope' && restoreTest.gameMode === 'game') {
            console.log('\n✅ SUCCESS: ReviewMode works correctly');
        } else {
            console.log('\n❌ FAILED');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

testReviewMode().catch(console.error);
