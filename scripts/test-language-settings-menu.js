const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'language-settings-menu');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3500/';
const LANGUAGES = ['en', 'es', 'lg', 'hi', 'hi-rom', 'zw', 'kr'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true }
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function runScenario(browser, viewport, lang) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile
  });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.click('#btnSettings');
  await page.waitForTimeout(250);
  await page.selectOption('#languageSelect', lang);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.click('#btnSettings');
  await page.waitForTimeout(300);
  const openState = await page.evaluate(() => {
    const settingsContainer = document.getElementById('settingsContainer');
    const settingsBackButton = document.getElementById('settingsBackButton');
    const soloButton = document.getElementById('btnSolo');
    const menuGrid = document.querySelector('#menuScreen .menu-grid');
    return {
      currentLang: window.I18n && typeof window.I18n.getLang === 'function' ? window.I18n.getLang() : null,
      persistedLang: localStorage.getItem('lang'),
      settingsDisplay: settingsContainer ? window.getComputedStyle(settingsContainer).display : null,
      backButtonText: settingsBackButton ? settingsBackButton.innerText.trim() : null,
      soloDisplay: soloButton ? window.getComputedStyle(soloButton).display : null,
      menuGridDisplay: menuGrid ? window.getComputedStyle(menuGrid).display : null
    };
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${viewport.name}-${lang}-open.png`),
    fullPage: true
  });

  await page.click('#settingsBackButton');
  await page.waitForTimeout(300);
  const closedState = await page.evaluate(() => {
    const settingsContainer = document.getElementById('settingsContainer');
    const menuGrid = document.querySelector('#menuScreen .menu-grid');
    const soloButton = document.getElementById('btnSolo');
    const footer = document.getElementById('menuFooter');
    return {
      currentLang: window.I18n && typeof window.I18n.getLang === 'function' ? window.I18n.getLang() : null,
      persistedLang: localStorage.getItem('lang'),
      settingsDisplay: settingsContainer ? window.getComputedStyle(settingsContainer).display : null,
      menuGridDisplay: menuGrid ? window.getComputedStyle(menuGrid).display : null,
      soloDisplay: soloButton ? window.getComputedStyle(soloButton).display : null,
      footerDisplay: footer ? window.getComputedStyle(footer).display : null
    };
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${viewport.name}-${lang}-closed.png`),
    fullPage: true
  });

  await page.close();

  return {
    viewport: viewport.name,
    lang,
    openState,
    closedState,
    consoleMessages,
    pageErrors
  };
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const viewport of VIEWPORTS) {
    for (const lang of LANGUAGES) {
      results.push(await runScenario(browser, viewport, lang));
    }
  }

  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(results, null, 2)
  );
  await browser.close();
}

main().catch(async (error) => {
  try {
    await ensureDir(OUTPUT_DIR);
    await fs.promises.writeFile(
      path.join(OUTPUT_DIR, 'fatal-error.json'),
      JSON.stringify({ message: error.message, stack: error.stack }, null, 2)
    );
  } catch (_) {
    // ignore secondary failure
  }
  console.error(error);
  process.exit(1);
});
