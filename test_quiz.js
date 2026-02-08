const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 750 });

  const errors = [];
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

  await page.goto('http://localhost:3500', { waitUntil: 'networkidle0' });

  // Screenshot menu with quiz settings
  await page.click('#quizSettingsToggle');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/menu_sliders.png' });
  console.log('Saved menu screenshot');

  // Start game
  await page.click('#btnSolo');
  await new Promise(r => setTimeout(r, 4000));

  // Force each mode and screenshot
  for (const mode of ['first_letter', 'missing_word', 'category_match', 'true_false']) {
    await page.evaluate((targetMode) => {
      // Override quizSettings to force this mode
      quizSettings = { firstLetter: 0, missingWord: 0, categoryMatch: 0, trueFalse: 0 };
      if (targetMode === 'first_letter') quizSettings.firstLetter = 100;
      else if (targetMode === 'missing_word') quizSettings.missingWord = 100;
      else if (targetMode === 'category_match') quizSettings.categoryMatch = 100;
      else quizSettings.trueFalse = 100;

      QuizManager.pickQualityVerse();
    }, mode);

    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `/tmp/quiz_${mode}.png` });
    console.log(`Saved ${mode} screenshot`);
  }

  if (errors.length > 0) {
    console.log('ERRORS:', JSON.stringify(errors));
  } else {
    console.log('No page errors');
  }

  await browser.close();
})();
