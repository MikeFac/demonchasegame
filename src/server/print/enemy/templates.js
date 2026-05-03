const { escapeHtml } = require('./builder');

function renderEnemyCardSetShell({ title, bodyClass, content, controls = '', inlineCssText = '' }) {
  const stylesMarkup = inlineCssText
    ? `<style>${inlineCssText}</style>`
    : '<link rel="stylesheet" href="/public/print.css?v=20260503-enemy-1">';

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

function renderEnemyCard(card, cardIndex) {
  const firstSeenText = card.firstSeenLevel ? `Level ${card.firstSeenLevel}` : 'Starter set';

  return `
    <div class="enemy-card-item">
      <div class="enemy-card-inner">
        <div class="enemy-card-top">
          <div class="enemy-card-heading">
            <div class="enemy-card-kicker">Enemy Card</div>
            <div class="enemy-card-name">${escapeHtml(card.demonType)}</div>
          </div>
          <div class="enemy-card-art">
            ${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.demonType)} demon portrait">` : ''}
          </div>
        </div>

        <div class="enemy-card-meta">
          <div><span class="enemy-card-meta-label">Best counter</span><span class="enemy-card-meta-value">${escapeHtml(card.bestCounter)}</span></div>
          <div><span class="enemy-card-meta-label">First seen</span><span class="enemy-card-meta-value">${escapeHtml(firstSeenText)}</span></div>
        </div>

        <div class="enemy-card-role">${escapeHtml(card.role)}</div>
        <div class="enemy-card-note">${escapeHtml(card.note)}</div>
        <div class="enemy-card-footer">${escapeHtml('VerseBattles.com')} <span class="enemy-card-number">${cardIndex}</span></div>
      </div>
    </div>`;
}

function renderEnemyCardPage(pageCards, startIndex, cardsPerRow) {
  const cards = pageCards.map((card, i) => renderEnemyCard(card, startIndex + i + 1)).join('');
  return `
    <section class="enemy-card-page">
      <div class="enemy-card-grid" style="grid-template-columns: repeat(${cardsPerRow}, 1fr);">
        ${cards}
      </div>
    </section>`;
}

function renderEnemyCardIndex(sets) {
  const rows = sets.map(set => `
    <li class="print-index-item">
      <div>
        <h2>${escapeHtml(set.name)}</h2>
        <p>${escapeHtml(set.description)}</p>
      </div>
      <div class="print-index-links">
        <a href="/print/enemy/${escapeHtml(set.id)}">Preview</a>
        <a href="/api/print/enemy/${escapeHtml(set.id)}/pdf">PDF</a>
      </div>
    </li>`).join('');

  return renderEnemyCardSetShell({
    title: 'VerseBattles Enemy Cards',
    bodyClass: 'print-index-screen print-enemy-screen',
    content: `
      <section class="print-index">
        <h1>VerseBattles Enemy Cards</h1>
        <p>Printable enemy reference cards for the initial demon roster.</p>
        <ul class="print-index-list">${rows}</ul>
      </section>`
  });
}

function renderEnemyCardSetHtml(cardSet) {
  const controls = `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(cardSet.name)}</strong>
        <span>${cardSet.totalCards} cards &middot; ${cardSet.pages.length} pages</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/api/print/enemy/${escapeHtml(cardSet.id)}/pdf">Download PDF</a>
      </div>
    </header>`;

  let cardOffset = 0;
  const content = cardSet.pages.map(page => {
    const html = renderEnemyCardPage(page, cardOffset, cardSet.cardsPerRow);
    cardOffset += page.length;
    return html;
  }).join('');

  return renderEnemyCardSetShell({
    title: `${cardSet.name} Preview`,
    bodyClass: 'print-reading-screen print-enemy-screen',
    controls,
    content
  });
}

function renderEnemyCardSetImposedHtml(cardSet, { forPdf = false, inlineCssText = '' } = {}) {
  const controls = forPdf ? '' : `
    <header class="print-toolbar no-print">
      <div>
        <strong>${escapeHtml(cardSet.name)}</strong>
        <span>Print-ready &middot; ${cardSet.pages.length} pages</span>
      </div>
      <div class="print-toolbar-actions">
        <a href="/print/enemy/${escapeHtml(cardSet.id)}">Back to preview</a>
        <a href="/api/print/enemy/${escapeHtml(cardSet.id)}/pdf">Download PDF</a>
      </div>
    </header>`;

  let cardOffset = 0;
  const content = cardSet.pages.map(page => {
    const html = renderEnemyCardPage(page, cardOffset, cardSet.cardsPerRow);
    cardOffset += page.length;
    return html;
  }).join('');

  return renderEnemyCardSetShell({
    title: `${cardSet.name} Print`,
    bodyClass: forPdf ? 'print-enemy-screen pdf-export' : 'print-enemy-screen',
    controls,
    content,
    inlineCssText
  });
}

module.exports = { renderEnemyCardIndex, renderEnemyCardSetHtml, renderEnemyCardSetImposedHtml };
