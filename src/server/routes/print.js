const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { buildBookletBySlug, getPrintableCategories } = require('../print/bookletBuilder');
const { buildImposedSpreads } = require('../print/bookletImposition');
const { renderIndexPage, renderReadingHtml, renderImposedHtml } = require('../print/bookletTemplates');
const { buildOnePageBySlug, getPrintableOnePageCategories } = require('../print/1page/builder');
const { buildOnePageImposedSpreads } = require('../print/1page/imposition');
const { renderOnePageIndex, renderOnePageReadingHtml, renderOnePageImposedHtml } = require('../print/1page/templates');

const router = express.Router();
const PDF_TIMEOUT_MS = 30000;
const PRINT_CSS_PATH = path.join(__dirname, '..', '..', '..', 'public', 'print.css');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';

function execFileAsync(command, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

router.get('/print', (req, res) => {
  res.send(renderIndexPage(getPrintableCategories()));
});

router.get('/print/1page', (req, res) => {
  res.send(renderOnePageIndex(getPrintableOnePageCategories()));
});

router.get('/print/1page/:categorySlug', async (req, res) => {
  const sheet = await buildOnePageBySlug(req.params.categorySlug);
  if (!sheet) {
    return res.status(404).send('Printable category not found or does not yet have enough suitable verses.');
  }

  res.send(renderOnePageReadingHtml(sheet));
});

router.get('/print/1page/:categorySlug/imposed', async (req, res) => {
  const sheet = await buildOnePageBySlug(req.params.categorySlug);
  if (!sheet) {
    return res.status(404).send('Printable category not found or does not yet have enough suitable verses.');
  }

  const spreads = buildOnePageImposedSpreads(sheet.pages);
  const forPdf = req.query.format === 'pdf';
  res.send(renderOnePageImposedHtml(sheet, spreads, { forPdf }));
});

router.get('/print/:categorySlug', async (req, res) => {
  const booklet = await buildBookletBySlug(req.params.categorySlug);
  if (!booklet) {
    return res.status(404).send('Printable category not found or does not yet have enough suitable verses.');
  }

  res.send(renderReadingHtml(booklet));
});

router.get('/print/:categorySlug/imposed', async (req, res) => {
  const booklet = await buildBookletBySlug(req.params.categorySlug);
  if (!booklet) {
    return res.status(404).send('Printable category not found or does not yet have enough suitable verses.');
  }

  const spreads = buildImposedSpreads(booklet.pages);
  const forPdf = req.query.format === 'pdf';
  res.send(renderImposedHtml(booklet, spreads, { forPdf }));
});

router.get('/api/print/:categorySlug/pdf', async (req, res) => {
  const booklet = await buildBookletBySlug(req.params.categorySlug);
  if (!booklet) {
    return res.status(404).json({ error: 'Printable category not found or does not yet have enough suitable verses.' });
  }

  const spreads = buildImposedSpreads(booklet.pages);
  const cssText = fs.readFileSync(PRINT_CSS_PATH, 'utf8');
  const html = renderImposedHtml(booklet, spreads, { forPdf: true, inlineCssText: cssText });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'versebattles-print-'));
  const htmlPath = path.join(tempDir, `${req.params.categorySlug}.html`);
  const pdfPath = path.join(tempDir, `${req.params.categorySlug}.pdf`);

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    await execFileAsync(
      CHROME_BIN,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`
      ],
      PDF_TIMEOUT_MS
    );
    const pdf = fs.readFileSync(pdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.categorySlug}-versebattles-booklet.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('Failed to generate print PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

router.get('/api/print/1page/:categorySlug/pdf', async (req, res) => {
  const sheet = await buildOnePageBySlug(req.params.categorySlug);
  if (!sheet) {
    return res.status(404).json({ error: 'Printable category not found or does not yet have enough suitable verses.' });
  }

  const spreads = buildOnePageImposedSpreads(sheet.pages);
  const cssText = fs.readFileSync(PRINT_CSS_PATH, 'utf8');
  const html = renderOnePageImposedHtml(sheet, spreads, { forPdf: true, inlineCssText: cssText });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'versebattles-print-'));
  const htmlPath = path.join(tempDir, `${req.params.categorySlug}.html`);
  const pdfPath = path.join(tempDir, `${req.params.categorySlug}.pdf`);

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    await execFileAsync(
      CHROME_BIN,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`
      ],
      PDF_TIMEOUT_MS
    );
    const pdf = fs.readFileSync(pdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.categorySlug}-versebattles-onepage.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('Failed to generate one-page print PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

module.exports = router;
