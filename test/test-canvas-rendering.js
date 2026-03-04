const { chromium } = require('playwright');

async function testCanvasRendering() {
    console.log('=== Testing Canvas Rendering ===\n');
    
    const browser = await chromium.launch({ headless: false }); // Set to false to see the browser
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    
    try {
        console.log('1. Loading page...');
        await page.goto('http://localhost:3500/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('#gameCanvas', { timeout: 10000 });
        
        // Wait for game to initialize
        console.log('2. Waiting for game to initialize...');
        await page.waitForTimeout(5000);
        
        // Take a screenshot
        console.log('3. Taking screenshot...');
        await page.screenshot({ path: '/home/michael/proj/dcgame/test/canvas-rendering.png', fullPage: true });
        console.log('   Screenshot saved to test/canvas-rendering.png');
        
        // Check canvas visibility and size
        var canvasInfo = await page.evaluate(function() {
            var canvas = document.getElementById('gameCanvas');
            var rect = canvas.getBoundingClientRect();
            return {
                display: canvas.style.display,
                width: canvas.width,
                height: canvas.height,
                rect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                },
                parentDisplay: canvas.parentElement?.style.display
            };
        });
        
        console.log('\n4. Canvas info:');
        console.log('   Display:', canvasInfo.display);
        console.log('   Size:', canvasInfo.width, 'x', canvasInfo.height);
        console.log('   Rect:', JSON.stringify(canvasInfo.rect));
        console.log('   Parent display:', canvasInfo.parentDisplay);
        
        // Wait a bit more and take another screenshot
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/home/michael/proj/dcgame/test/canvas-rendering-2.png', fullPage: true });
        console.log('   Second screenshot saved to test/canvas-rendering-2.png');
        
        console.log('\nCheck the screenshots to see if the canvas is rendering properly.');
        console.log('Press Ctrl+C to close the browser when done.');
        
        // Keep browser open for manual inspection
        await page.waitForTimeout(60000);
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testCanvasRendering().catch(console.error);
