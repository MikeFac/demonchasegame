const { escapeHtml } = require('./builder');

function renderCardSetShell({ title, bodyClass, content, controls = '', inlineCssText = '' }) {
  const stylesMarkup = inlineCssText
    ? `<style>${inlineCssText}</style>`
    : '<link rel="stylesheet" href="/public/print.css?v=20260503-card-5">';

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

function renderCard(card, cardIndex) {
  return `
    <div class="verse-card-item">
      <div class="card-inner">
        <div class="card-category">${escapeHtml(card.category)}</div>
        <div class="card-number">${cardIndex}</div>
        <div class="card-reference">${escapeHtml(card.reference)}</div>
        <div class="card-text">${escapeHtml(card.text)}</div>
        <div class="card-footer">${escapeHtml('VerseBattles.com')}</div>
      </div>
    </div>`;
}

function renderCardPage(pageCards, startIndex, cardsPerRow) {
  const cards = pageCards.map((card, i) => renderCard(card, startIndex + i + 1)).join('');
  return `
    <section class="card-page">
      <div class="card-grid" style="grid-template-columns: repeat(${cardsPerRow}, 1fr);">
        ${cards}
      </div>
    </section>`;
}

function renderCardIndex(sets) {
  const rows = sets.map(set => `
    <li class="print-index-item">
      <div>
        <h2>${escapeHtml(set.name)}</h2>
        <p>${escapeHtml(set.description)}</p>
      </div>
      <div class="print-index-links">
        <a href="/print/card/${escapeHtml(set.id)}">Preview</a>
        <a href="/api/print/card/${escapeHtml(set.id)}/pdf">PDF</a>
      </div>
    </li>`).join('');

  return renderCardSetShell({
    title: 'VerseBattles Verse Cards',
    bodyClass: 'print-index-screen print-card-screen',
    content: `
      <section class="print-index">
        <h1>VerseBattles Verse Cards</h1>
        <p>Printable verse cards for memorisation and review.</p>
        <ul class="print-index-list">${rows}</ul>
      </section>`
  });
}

function renderCardSetHtml(cardSet) {
  const controls = `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(cardSet.name)}</strong>
        <span>${cardSet.totalCards} cards &middot; ${cardSet.pages.length} pages</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/api/print/card/${escapeHtml(cardSet.id)}/pdf">Download PDF</a>
      </div>
    </header>`;

  let cardOffset = 0;
  const content = cardSet.pages.map(page => {
    const html = renderCardPage(page, cardOffset, cardSet.cardsPerRow);
    cardOffset += page.length;
    return html;
  }).join('');

  return renderCardSetShell({
    title: `${cardSet.name} Preview`,
    bodyClass: 'print-reading-screen print-card-screen',
    controls,
    content
  });
}

function renderCardSetImposedHtml(cardSet, { forPdf = false, inlineCssText = '' } = {}) {
  const controls = forPdf ? '' : `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(cardSet.name)}</strong>
        <span>Print-ready &middot; ${cardSet.pages.length} pages</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/card/${escapeHtml(cardSet.id)}">Back to preview</a>
        <a href="/api/print/card/${escapeHtml(cardSet.id)}/pdf">Download PDF</a>
      </div>
    </header>`;

  let cardOffset = 0;
  const content = cardSet.pages.map(page => {
    const html = renderCardPage(page, cardOffset, cardSet.cardsPerRow);
    cardOffset += page.length;
    return html;
  }).join('');

  return renderCardSetShell({
    title: `${cardSet.name} Print`,
    bodyClass: forPdf ? 'print-card-screen pdf-export' : 'print-card-screen',
    controls,
    content,
    inlineCssText
  });
}

module.exports = { renderCardIndex, renderCardSetHtml, renderCardSetImposedHtml };
