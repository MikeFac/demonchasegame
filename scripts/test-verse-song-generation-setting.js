const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'verse-song-generation-setting');
const MISSING_REFERENCE = 'Codex Missing Song 99:999';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 512, height: 700 } });
  const errors = [];
  const songRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('/api/verse-song?')) songRequests.push(request.url());
  });

  try {
    await page.goto('http://127.0.0.1:3500/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.click('#btnSettings');
    await page.waitForSelector('#autoGenerateVerseSongsToggle:visible');
    await page.locator('#autoGenerateVerseSongsToggle').uncheck();
    const persisted = await page.evaluate(() => ({
      enabled: window.autoGenerateVerseSongs,
      saved: localStorage.getItem('autoGenerateVerseSongs')
    }));
    assert(!persisted.enabled && persisted.saved === 'false', 'generation setting should persist as disabled');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-generation-disabled.png') });

    const results = await page.evaluate(async (missingReference) => {
      const missing = await window.VerseSongService.getSongForVerse(missingReference);
      const existing = await window.VerseSongService.getSongForVerse('Romans 10:17');
      return { missing, existingStatus: existing && existing.status, existingAudioUrl: existing && existing.audioUrl };
    }, MISSING_REFERENCE);
    assert(results.missing && results.missing.status === 'unavailable', 'missing song should not be queued when disabled');
    assert(results.existingStatus === 'ready' && results.existingAudioUrl, 'existing song should remain available when generation is disabled');
    assert(songRequests.some(url => url.includes('generate=false')), 'song request should include generate=false');
    await fs.promises.writeFile(path.join(OUTPUT_DIR, 'state.json'), JSON.stringify({ persisted, results, songRequests, errors }, null, 2));
    console.log('Verse song generation setting passed');
  } finally {
    await browser.close();
  }
  assert(errors.length === 0, 'page errors: ' + errors.join('; '));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
