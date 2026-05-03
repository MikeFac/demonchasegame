function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRulesList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderRulesDraft1Html() {
  const rulesets = [
    {
      name: 'Core Game',
      summary: 'Enemy cards, verse cards, and tactical counterplay.',
      bullets: [
        'Draw one Enemy Card.',
        'Choose the best Verse Card against it.',
        'Read, explain, or quote the verse to earn power.',
        'Best counter category gets the biggest bonus.'
      ]
    },
    {
      name: 'Classroom Battle',
      summary: 'Teacher-led, team-based play for 6 to 40+ students.',
      bullets: [
        'Split into 2 to 4 teams.',
        'Teacher reveals an enemy challenge.',
        'Teams discuss the best response.',
        'One student reads; another explains; a third may quote from memory.'
      ]
    },
    {
      name: 'Memory Quest',
      summary: 'A slower progression mode for repeated practice.',
      bullets: [
        'Pick 3 verses to practice each week.',
        'Return next session and recite them.',
        'Earn rewards or new cards for mastery.',
        'Use it as a bridge between print and the app.'
      ]
    }
  ];

  const enemyCards = [
    'Fear',
    'Doubt',
    'Shame',
    'Confusion',
    'Temptation',
    'Discouragement',
    'Condemnation',
    'Pride'
  ];

  const variationKnobs = [
    'How many verses each player starts with',
    'Whether players draft, draw, or choose cards',
    'How strict the category matching should be',
    'Whether the teacher scores, or the table self-scores',
    'Whether enemy cards are fixed encounters or random draws',
    'Whether memory is required for bonus points or for all points'
  ];

  const decisionMatrix = [
    ['Fast to teach', 'Keep rules simple and score by category match plus memory bonus.'],
    ['Best for schools', 'Use team play and teacher-led enemy reveals.'],
    ['Best for home play', 'Use shorter rounds and smaller hands of cards.'],
    ['Best for skill', 'Increase challenge by requiring exact verse quotation.']
  ];

  const rulesetBlocks = rulesets.map((ruleset) => `
    <article class="rules-draft-card">
      <div class="rules-draft-card-head">
        <div class="rules-draft-kicker">Ruleset</div>
        <h2>${escapeHtml(ruleset.name)}</h2>
        <p>${escapeHtml(ruleset.summary)}</p>
      </div>
      <ul class="rules-draft-list">${renderRulesList(ruleset.bullets)}</ul>
    </article>
  `).join('');

  const enemyItems = enemyCards.map((enemy) => `<li>${escapeHtml(enemy)}</li>`).join('');
  const variationItems = variationKnobs.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const decisionRows = decisionMatrix.map(([label, value]) => `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `).join('');

  const cssText = `
    :root {
      --bg: #f3efe4;
      --paper: #fffdf7;
      --ink: #17130f;
      --muted: #65594b;
      --accent: #8a4b2a;
      --accent-soft: rgba(138, 75, 42, 0.12);
      --border: rgba(23, 19, 15, 0.16);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(138, 75, 42, 0.12), transparent 30%),
        linear-gradient(180deg, #f6f0e6 0%, var(--bg) 100%);
    }
    .rules-draft-page {
      min-height: 100vh;
      padding: 24px;
    }
    .rules-draft-shell {
      max-width: 1080px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
    }
    .rules-draft-hero {
      padding: 32px;
      background: linear-gradient(135deg, rgba(138, 75, 42, 0.08), rgba(23, 19, 15, 0.03));
      border-bottom: 1px solid var(--border);
    }
    .rules-draft-eyebrow {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font: 700 12px/1 Arial, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .rules-draft-hero h1 {
      margin: 16px 0 10px;
      font: 800 clamp(32px, 4vw, 54px)/0.95 Georgia, 'Times New Roman', serif;
      letter-spacing: -0.03em;
    }
    .rules-draft-lede {
      max-width: 70ch;
      margin: 0;
      font-size: 18px;
      line-height: 1.55;
      color: var(--muted);
    }
    .rules-draft-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 20px;
      padding: 28px 32px 36px;
    }
    .rules-draft-card,
    .rules-draft-panel {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: #fff;
      padding: 20px;
    }
    .rules-draft-main {
      grid-column: span 8;
      display: grid;
      gap: 16px;
    }
    .rules-draft-side {
      grid-column: span 4;
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .rules-draft-card-head h2,
    .rules-draft-panel h2 {
      margin: 6px 0 6px;
      font: 800 24px/1.1 Georgia, 'Times New Roman', serif;
    }
    .rules-draft-card-head p,
    .rules-draft-panel p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .rules-draft-kicker {
      color: var(--accent);
      font: 700 11px/1 Arial, sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .rules-draft-list {
      margin: 16px 0 0;
      padding-left: 20px;
      color: var(--ink);
      line-height: 1.55;
    }
    .rules-draft-list li + li { margin-top: 8px; }
    .rules-draft-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 15px;
      line-height: 1.45;
    }
    .rules-draft-table th,
    .rules-draft-table td {
      vertical-align: top;
      text-align: left;
      padding: 10px 0;
      border-top: 1px solid var(--border);
    }
    .rules-draft-table th {
      width: 34%;
      padding-right: 14px;
      color: var(--accent);
      font: 700 14px/1.25 Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .rules-draft-badge-list {
      list-style: none;
      padding: 0;
      margin: 14px 0 0;
    }
    .rules-draft-badge-list li {
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(138, 75, 42, 0.06);
      border: 1px solid rgba(138, 75, 42, 0.14);
      margin-bottom: 10px;
      line-height: 1.45;
    }
    .rules-draft-footnote {
      padding: 0 32px 32px;
      color: var(--muted);
      line-height: 1.5;
    }
    @media (max-width: 880px) {
      .rules-draft-grid { grid-template-columns: 1fr; }
      .rules-draft-main,
      .rules-draft-side { grid-column: auto; }
      .rules-draft-page { padding: 14px; }
      .rules-draft-hero,
      .rules-draft-grid,
      .rules-draft-footnote { padding-left: 18px; padding-right: 18px; }
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .rules-draft-page { padding: 0; }
      .rules-draft-shell { box-shadow: none; border: none; border-radius: 0; }
      .rules-draft-hero { padding: 0 0 12px; border-bottom: 1px solid #bbb; background: none; }
      .rules-draft-grid { padding: 16px 0 0; }
      .rules-draft-footnote { padding: 12px 0 0; }
      .rules-draft-card,
      .rules-draft-panel { break-inside: avoid; }
    }
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rules Draft 1 - VerseBattles</title>
  <style>${cssText}</style>
</head>
<body>
  <main class="rules-draft-page">
    <section class="rules-draft-shell">
      <div class="rules-draft-hero">
        <span class="rules-draft-eyebrow">Rules Draft 1</span>
        <h1>Enemy Cards + Verse Cards + Team Scoring</h1>
        <p class="rules-draft-lede">
          This first draft turns VerseBattles into a teacher-led encounter game: draw an enemy, choose the best verse, explain why it fits, and score the response. It is intentionally simple enough to run on paper, but still leaves room for more advanced variants later.
        </p>
      </div>

      <div class="rules-draft-grid">
        <div class="rules-draft-main">
          ${rulesetBlocks}

          <article class="rules-draft-card">
            <div class="rules-draft-kicker">Enemy roster</div>
            <h2>Initial enemy types</h2>
            <p>These are the demon cards that this draft is designed around.</p>
            <ul class="rules-draft-badge-list">${enemyItems}</ul>
          </article>

          <article class="rules-draft-card">
            <div class="rules-draft-kicker">Scoring</div>
            <h2>Simple scoring model</h2>
            <table class="rules-draft-table">
              <tbody>
                ${decisionRows}
              </tbody>
            </table>
          </article>
        </div>

        <aside class="rules-draft-side">
          <section class="rules-draft-panel">
            <div class="rules-draft-kicker">Design knobs</div>
            <h2>What can vary later</h2>
            <ul class="rules-draft-list">${variationKnobs.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </section>

          <section class="rules-draft-panel">
            <div class="rules-draft-kicker">Why this works</div>
            <h2>What the draft optimizes for</h2>
            <p>This version prioritizes quick setup, group participation, and clear learning feedback over deep strategy.</p>
          </section>

          <section class="rules-draft-panel">
            <div class="rules-draft-kicker">Future drafts</div>
            <h2>Next things to test</h2>
            <ul class="rules-draft-list">
              <li>head-to-head duel rules</li>
              <li>solo memory challenge rules</li>
              <li>classroom cooperative raid rules</li>
              <li>reward and progression variants</li>
            </ul>
          </section>
        </aside>
      </div>

      <div class="rules-draft-footnote">
        Draft 1 is a baseline, not a final ruleset. The goal is to make the game understandable on a single page so we can compare other versions against it.
      </div>
    </section>
  </main>
</body>
</html>`;
}

module.exports = { renderRulesDraft1Html };
