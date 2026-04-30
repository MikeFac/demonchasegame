const { escapeHtml } = require('../bookletBuilder');

function renderOnePageInner(sheet, page) {
  const qrMarkup = `<img class="print-qr onepage-qr" src="${sheet.qrCodeDataUrl}" alt="QR code for ${escapeHtml(sheet.siteUrl)}">`;
  const frontActionSource = sheet.frontActionDataUrl || sheet.frontActionPath;
  const frontActionMarkup = `<img class="onepage-action-print" src="${frontActionSource}" alt="Two young players using Scripture and a shield of light against a shadowy monster">`;

  if (page.kind === 'cover-front') {
    const featureHighlights = (page.featureHighlights || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    return `
      <div class="onepage-cover-front">
        <h2 class="page-title onepage-front-main-head">Become a Powerful<br>Spiritual Warrior for God!</h2>
        <p class="page-headline onepage-front-subhead">${escapeHtml(page.title)}</p>
        <div class="onepage-action-hero">
          ${frontActionMarkup}
        </div>
        <div class="page-footer-cta onepage-front-cta">Scan To Play Today - VerseBattles.com</div>
        <ul class="onepage-front-features">
          ${featureHighlights}
        </ul>
        <blockquote class="onepage-sales-verse">
          <p>${escapeHtml(page.salesVerseText)}</p>
          <footer>${escapeHtml(page.salesVerseReference)}</footer>
        </blockquote>
      </div>
    `;
  }

  if (page.kind === 'inside-verses') {
    const verseMarkup = page.verses.length > 0
      ? page.verses.map((verse) => `
        <article class="onepage-verse-card">
          <div class="onepage-verse-main">
            <h3 class="verse-reference">${escapeHtml(verse.reference)}</h3>
            <p class="verse-text">${escapeHtml(verse.text)}</p>
          </div>
          <div class="onepage-learned-cell">
            <span class="onepage-checkbox" aria-hidden="true"></span>
          </div>
        </article>
      `).join('')
      : '<p class="info-blurb">More verses available online.</p>';

    return `
      <div class="onepage-inside">
        <div class="page-kicker">${escapeHtml(sheet.category)}</div>
        <h2 class="page-title">${escapeHtml(page.title)}</h2>
        <div class="onepage-verse-head">
          <span></span>
          <span class="onepage-learned-head">Learned</span>
        </div>
        <div class="onepage-verse-list">${verseMarkup}</div>
        <div class="page-footer-cta">${escapeHtml(page.footerCta || sheet.footerCta)}</div>
      </div>
    `;
  }

  const instructionItems = (page.instructions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const featureItems = (page.features || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  return `
    <div class="onepage-cover-back">
      <div class="page-kicker">${escapeHtml(sheet.category)}</div>
      <h2 class="page-title">${escapeHtml(page.title)}</h2>
      <h3 class="onepage-subtitle">Instructions</h3>
      <ol class="onepage-list">${instructionItems}</ol>
      <h3 class="onepage-subtitle">Features</h3>
      <ul class="onepage-list">${featureItems}</ul>
      <div class="onepage-back-bottom">
        ${qrMarkup}
        <div>
          <div class="cover-url">${escapeHtml(sheet.siteUrl.replace(/^https?:\/\//, ''))}</div>
          <div class="page-footer-cta">${escapeHtml(page.footerCta || sheet.footerCta)}</div>
        </div>
      </div>
      <p class="onepage-promo"><span class="onepage-music-icon" aria-hidden="true">&#9835;</span>${escapeHtml(page.promoLine || '')}</p>
    </div>
  `;
}

function renderOnePageReading(page, sheet) {
  return `
    <section class="reading-page">
      <div class="a5-page onepage-preview-page">
        <div class="page-panel">
          <div class="page-number-badge">${page.pageNumber}</div>
          ${renderOnePageInner(sheet, page)}
        </div>
      </div>
    </section>
  `;
}

function renderOnePageImposedSpread(spread, sheet) {
  return `
    <section class="imposed-sheet">
      <div class="sheet-meta">Sheet ${spread.sheet} ${spread.side}</div>
      <div class="a4-sheet">
        <div class="sheet-page left">
          <div class="page-panel">
            <div class="page-number-badge">${spread.left.pageNumber}</div>
            ${renderOnePageInner(sheet, spread.left)}
          </div>
        </div>
        <div class="fold-guide"></div>
        <div class="sheet-page right">
          <div class="page-panel">
            <div class="page-number-badge">${spread.right.pageNumber}</div>
            ${renderOnePageInner(sheet, spread.right)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderOnePageShell({ title, bodyClass, content, controls = '', inlineCssText = '' }) {
  const stylesMarkup = inlineCssText
    ? `<style>${inlineCssText}</style>`
    : '<link rel="stylesheet" href="/public/print.css?v=20260430-onepage-4">';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${stylesMarkup}
</head>
<body class="${escapeHtml(bodyClass)}">
  ${controls}
  <main class="print-root">
    ${content}
  </main>
</body>
</html>`;
}

function renderOnePageIndex(categories) {
  const rows = categories.map((category) => `
    <li class="print-index-item">
      <div>
        <h2>${escapeHtml(category.category)}</h2>
        <p>${category.selectedVerses} verses selected from ${category.suitableVerses} suitable verses${category.isPartial ? ' (partial sheet)' : ''}.</p>
      </div>
      <div class="print-index-links">
        <a href="/print/1page/${escapeHtml(category.slug)}">Preview</a>
        <a href="/print/1page/${escapeHtml(category.slug)}/imposed">Imposed</a>
        <a href="/api/print/1page/${escapeHtml(category.slug)}/pdf">PDF</a>
      </div>
    </li>
  `).join('');

  return renderOnePageShell({
    title: 'VerseBattles 1-Page Print Sheets',
    bodyClass: 'print-index-screen print-onepage-screen',
    content: `
      <section class="print-index">
        <h1>VerseBattles 1-Page Print Sheets</h1>
        <p>Single-sheet folded version: front cover, inside two pages, and back cover.</p>
        <ul class="print-index-list">${rows}</ul>
      </section>
    `
  });
}

function renderOnePageReadingHtml(sheet) {
  const controls = `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(sheet.title)}</strong>
        <span>${sheet.totalSelectedVerses} selected verses</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/1page/${escapeHtml(sheet.slug)}/imposed">View imposed spreads</a>
        <a href="/api/print/1page/${escapeHtml(sheet.slug)}/pdf">Download PDF</a>
      </div>
    </header>
  `;

  return renderOnePageShell({
    title: `${sheet.title} Preview`,
    bodyClass: 'print-reading-screen print-onepage-screen',
    controls,
    content: sheet.pages.map((page) => renderOnePageReading(page, sheet)).join('')
  });
}

function renderOnePageImposedHtml(sheet, spreads, { forPdf = false, inlineCssText = '' } = {}) {
  const controls = forPdf ? '' : `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(sheet.title)}</strong>
        <span>Imposed single-sheet A4 duplex spread</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/1page/${escapeHtml(sheet.slug)}">Back to preview</a>
        <a href="/api/print/1page/${escapeHtml(sheet.slug)}/pdf">Download PDF</a>
      </div>
    </header>
  `;

  return renderOnePageShell({
    title: `${sheet.title} Imposed`,
    bodyClass: forPdf ? 'print-imposed-screen pdf-export print-onepage-screen' : 'print-imposed-screen print-onepage-screen',
    controls,
    content: spreads.map((spread) => renderOnePageImposedSpread(spread, sheet)).join(''),
    inlineCssText
  });
}

module.exports = {
  renderOnePageIndex,
  renderOnePageReadingHtml,
  renderOnePageImposedHtml
};
