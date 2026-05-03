const { escapeHtml } = require('./bookletBuilder');

function renderPageInner(booklet, page) {
  const qrMarkup = `<img class="print-qr" src="${booklet.qrCodeDataUrl}" alt="QR code for ${escapeHtml(booklet.siteUrl)}">`;
  const logoSource = booklet.logoDataUrl || booklet.logoPath;
  const logoMarkup = `<img class="print-logo" src="${logoSource}" alt="VerseBattles logo">`;
  const menuScreenSource = booklet.menuScreenDataUrl || booklet.menuScreenPath;
  const menuScreenMarkup = `<img class="menu-screen-print" src="${menuScreenSource}" alt="VerseBattles menu screen showing play options">`;
  const actionPanelMarkup = `
    <div class="action-panel">
      <div class="action-image-col">
        ${menuScreenMarkup}
      </div>
      <div class="action-qr-col">
        ${qrMarkup}
        <p class="info-blurb">Open the site on a phone, tablet, or school computer lab.</p>
        <div class="page-footer-cta">${escapeHtml(page.footerCta || booklet.footerCta)}</div>
      </div>
    </div>
  `;

  if (page.kind === 'cover-front' || page.kind === 'cover-back') {
    return `
      <div class="page-cover">
        <div class="cover-top">
          ${logoMarkup}
          <div class="cover-label">VerseBattles</div>
        </div>
        <div class="cover-main">
          <div class="page-kicker">${escapeHtml(booklet.category)}</div>
          <h2 class="page-title page-title-cover">${escapeHtml(page.title)}</h2>
          <p class="page-headline">${escapeHtml(page.headline)}</p>
          <p class="page-subhead">${escapeHtml(page.subhead)}</p>
        </div>
        <div class="cover-bottom">
          ${qrMarkup}
          <div class="cover-url">${escapeHtml(booklet.siteUrl.replace(/^https?:\/\//, ''))}</div>
          <div class="page-footer-cta">${escapeHtml(page.footerCta || booklet.footerCta)}</div>
        </div>
      </div>
    `;
  }

  if (page.kind === 'verses') {
    const verseMarkup = page.verses.length > 0
      ? page.verses.map((verse, index) => `
      <article class="verse-card">
        <div class="verse-content">
          <h3 class="verse-reference">${escapeHtml(verse.reference)}</h3>
          <p class="verse-text">${escapeHtml(verse.text)}</p>
        </div>
      </article>
    `).join('')
      : `
      <div class="verse-empty">
        <p class="page-headline">More ${escapeHtml(booklet.category)} practice online.</p>
        <p class="info-blurb">Scan the QR code to review, quiz, and keep learning with VerseBattles.</p>
        ${actionPanelMarkup}
      </div>
    `;

    return `
      <div class="page-verse">
        <div class="page-header">
          <div class="page-kicker">${escapeHtml(booklet.category)}</div>
        </div>
        <h2 class="page-title">${escapeHtml(page.title)}</h2>
        <div class="verse-grid">
          ${verseMarkup}
        </div>
        <div class="page-footer-cta">${escapeHtml(page.footerCta)}</div>
      </div>
    `;
  }

  if (page.kind === 'how-to') {
    const steps = page.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
    return `
      <div class="page-info">
        <div class="page-header">
          <div class="page-kicker">${escapeHtml(booklet.category)}</div>
        </div>
        <h2 class="page-title">${escapeHtml(page.title)}</h2>
        <ol class="info-steps">
          ${steps}
        </ol>
        ${actionPanelMarkup}
      </div>
    `;
  }

  return `
    <div class="page-info">
      <div class="page-header">
        <div class="page-kicker">${escapeHtml(booklet.category)}</div>
      </div>
      <h2 class="page-title">${escapeHtml(page.title)}</h2>
      <p class="page-headline">${escapeHtml(page.headline)}</p>
      <p class="info-blurb">${escapeHtml(page.body)}</p>
      ${actionPanelMarkup}
    </div>
  `;
}

function renderReadingPage(page, booklet) {
  return `
    <section class="reading-page">
      <div class="a5-page">
        <div class="page-panel">
          <div class="page-number-badge">${page.pageNumber}</div>
          ${renderPageInner(booklet, page)}
        </div>
      </div>
    </section>
  `;
}

function renderImposedSpread(spread, booklet) {
  return `
    <section class="imposed-sheet">
      <div class="sheet-meta">Sheet ${spread.sheet} ${spread.side}</div>
      <div class="a4-sheet">
        <div class="sheet-page left">
          <div class="page-panel">
            <div class="page-number-badge">${spread.left.pageNumber}</div>
            ${renderPageInner(booklet, spread.left)}
          </div>
        </div>
        <div class="fold-guide"></div>
        <div class="sheet-page right">
          <div class="page-panel">
            <div class="page-number-badge">${spread.right.pageNumber}</div>
            ${renderPageInner(booklet, spread.right)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderShell({ title, bodyClass, content, controls = '', inlineCssText = '' }) {
  const stylesMarkup = inlineCssText
    ? `<style>${inlineCssText}</style>`
    : '<link rel="stylesheet" href="/public/print.css?v=20260430-versecards-3">';
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

function renderIndexPage(categories) {
  const rows = categories.map((category) => `
    <li class="print-index-item">
      <div>
        <h2>${escapeHtml(category.category)}</h2>
        <p>${category.selectedVerses} verses selected from ${category.suitableVerses} suitable verses${category.isPartial ? ' (partial booklet)' : ''}.</p>
      </div>
      <div class="print-index-links">
        <a href="/print/${escapeHtml(category.slug)}">Preview</a>
        <a href="/print/${escapeHtml(category.slug)}/imposed">Imposed</a>
        <a href="/api/print/${escapeHtml(category.slug)}/pdf">PDF</a>
      </div>
    </li>
  `).join('');

  return renderShell({
    title: 'VerseBattles Print Booklets',
    bodyClass: 'print-index-screen',
    content: `
      <section class="print-index">
        <h1>VerseBattles Print Booklets</h1>
        <p>Phase 1 booklet previews and PDF exports by category.</p>
        <p><a href="/print/card">Verse cards</a> · <a href="/print/enemy">Enemy cards</a> · <a href="/print/rules-draft1">Rules draft 1</a></p>
        <ul class="print-index-list">${rows}</ul>
      </section>
    `
  });
}

function renderReadingHtml(booklet) {
  const controls = `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(booklet.title)}</strong>
        <span>${booklet.totalSelectedVerses} selected verses</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/${escapeHtml(booklet.slug)}/imposed">View imposed spreads</a>
        <a href="/api/print/${escapeHtml(booklet.slug)}/pdf">Download PDF</a>
      </div>
    </header>
  `;

  return renderShell({
    title: `${booklet.title} Preview`,
    bodyClass: 'print-reading-screen',
    controls,
    content: booklet.pages.map((page) => renderReadingPage(page, booklet)).join('')
  });
}

function renderImposedHtml(booklet, spreads, { forPdf = false, inlineCssText = '' } = {}) {
  const controls = forPdf ? '' : `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(booklet.title)}</strong>
        <span>Imposed A4 duplex spreads</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/${escapeHtml(booklet.slug)}">Back to preview</a>
        <a href="/api/print/${escapeHtml(booklet.slug)}/pdf">Download PDF</a>
      </div>
    </header>
  `;

  return renderShell({
    title: `${booklet.title} Imposed`,
    bodyClass: forPdf ? 'print-imposed-screen pdf-export' : 'print-imposed-screen',
    controls,
    content: spreads.map((spread) => renderImposedSpread(spread, booklet)).join(''),
    inlineCssText
  });
}

module.exports = {
  renderIndexPage,
  renderReadingHtml,
  renderImposedHtml
};
