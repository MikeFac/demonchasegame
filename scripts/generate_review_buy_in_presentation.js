const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'presentations');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'FutureReviewSystemBuyIn.pptx');

const COLORS = {
  navy: '10253F',
  blue: '2F5D8C',
  sky: 'DCEAF7',
  gold: 'D8A23D',
  green: '2F7D57',
  red: '8C3C3C',
  ink: '1E2A36',
  muted: '5F6B76',
  white: 'FFFFFF',
  light: 'F7F9FC',
  border: 'D5DDE5'
};

function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.6, y: 0.4, w: 8.5, h: 0.6,
    fontFace: 'Aptos Display', fontSize: 24, bold: true, color: COLORS.navy
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 1.0, w: 8.6, h: 0.5,
      fontFace: 'Aptos', fontSize: 11, color: COLORS.muted
    });
  }
}

function addBullets(slide, items, opts = {}) {
  const x = opts.x ?? 0.8;
  const y = opts.y ?? 1.6;
  const w = opts.w ?? 8.1;
  const h = opts.h ?? 4.8;
  const fontSize = opts.fontSize ?? 20;
  const color = opts.color ?? COLORS.ink;
  slide.addText(
    items.map((text) => ({ text, options: { bullet: { indent: 16 } } })),
    {
      x, y, w, h,
      fontFace: 'Aptos',
      fontSize,
      color,
      breakLine: true,
      paraSpaceAfterPt: 14,
      valign: 'top'
    }
  );
}

function addFooter(slide, text) {
  slide.addText(text, {
    x: 0.6, y: 6.7, w: 8.2, h: 0.3,
    fontFace: 'Aptos', fontSize: 9, italic: true, color: COLORS.muted, align: 'left'
  });
}

function addCallout(slide, title, body, opts = {}) {
  const x = opts.x ?? 6.8;
  const y = opts.y ?? 1.5;
  const w = opts.w ?? 2.5;
  const h = opts.h ?? 3.0;
  const fill = opts.fill ?? COLORS.sky;
  const accent = opts.accent ?? COLORS.blue;
  slide.addShape('roundRect', {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: accent, pt: 1.2 }
  });
  slide.addText(title, {
    x: x + 0.18, y: y + 0.16, w: w - 0.36, h: 0.4,
    fontFace: 'Aptos Display', fontSize: 15, bold: true, color: accent
  });
  slide.addText(body, {
    x: x + 0.18, y: y + 0.58, w: w - 0.36, h: h - 0.76,
    fontFace: 'Aptos', fontSize: 11, color: COLORS.ink, valign: 'top'
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'OpenAI Codex';
  pptx.company = 'DCGame';
  pptx.subject = 'Future review system buy-in presentation';
  pptx.title = 'Future Scripture Review System Buy-In';
  pptx.lang = 'en-AU';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
    lang: 'en-AU'
  };

  let slide = pptx.addSlide();
  slide.background = { color: COLORS.light };
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.55, fill: { color: COLORS.navy }, line: { color: COLORS.navy, pt: 0 } });
  slide.addText('A Future Scripture Review System Worth Piloting', {
    x: 0.7, y: 1.0, w: 8.8, h: 0.9,
    fontFace: 'Aptos Display', fontSize: 28, bold: true, color: COLORS.navy
  });
  slide.addText('A proposal for learner retention, ministry follow-through, and measurable discipleship progress', {
    x: 0.7, y: 2.0, w: 8.4, h: 0.7,
    fontFace: 'Aptos', fontSize: 15, color: COLORS.muted
  });
  addCallout(slide, 'Positioning', 'This is not a commitment to build immediately. It is a concrete future feature concept that needs partner buy-in before serious investment.', {
    x: 9.2, y: 1.1, w: 3.2, h: 2.5, fill: 'EEF5EC', accent: COLORS.green
  });
  slide.addText('DCGame / VerseBattles concept deck', {
    x: 0.7, y: 5.9, w: 4.0, h: 0.3, fontFace: 'Aptos', fontSize: 10, color: COLORS.muted
  });

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'The Core Problem', 'Many players can enjoy a session without ever building a sustainable habit of remembering the verses later.');
  addBullets(slide, [
    'A single exciting session does not guarantee long-term recall.',
    'Ministry leaders need more than playtime. They need evidence of actual retention.',
    'Without review timing, the game can teach a verse once and then lose the learner at the point memory starts fading.',
    'That makes follow-up hard for parents, youth pastors, schools, and discipleship groups.'
  ], { w: 8.3, fontSize: 19 });
  addCallout(slide, 'Bottom Line', 'The issue is not just engagement. The issue is whether engagement turns into memory and discipleship.', {
    x: 9.15, y: 1.75, w: 3.0, h: 2.3, fill: 'FFF7E8', accent: COLORS.gold
  });
  addFooter(slide, 'If Scripture retention matters, review timing matters.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'The Proposed Future Feature', 'A per-user review system that knows which verses are due and guides learners back at the right time.');
  addBullets(slide, [
    'Track verse progress per learner, not just per device.',
    'Schedule verses for review based on actual learning history.',
    'Surface what is due now instead of making learners guess what to revisit.',
    'Connect missions, Learn mode, and follow-up review into one loop.'
  ], { w: 8.2, fontSize: 19 });
  addCallout(slide, 'Key Design Choice', 'This should be built only if it serves real ministry use. It is a strategic system, not a cosmetic feature.', {
    x: 9.05, y: 1.6, w: 3.15, h: 2.5, fill: COLORS.sky, accent: COLORS.blue
  });
  addFooter(slide, 'The feature is valuable because it can turn isolated wins into ongoing formation.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.light };
  addTitle(slide, 'What Learners Would Experience', 'The value should be obvious to the player, not hidden in backend data.');
  slide.addShape('roundRect', {
    x: 0.8, y: 1.7, w: 3.8, h: 3.7,
    fill: { color: 'FFFFFF' }, line: { color: COLORS.border, pt: 1.2 }
  });
  slide.addShape('roundRect', {
    x: 4.8, y: 1.7, w: 3.8, h: 3.7,
    fill: { color: 'FFFFFF' }, line: { color: COLORS.border, pt: 1.2 }
  });
  slide.addShape('roundRect', {
    x: 8.8, y: 1.7, w: 3.8, h: 3.7,
    fill: { color: 'FFFFFF' }, line: { color: COLORS.border, pt: 1.2 }
  });
  slide.addText('1. Learn', { x: 1.0, y: 1.95, w: 1.0, h: 0.3, fontSize: 18, bold: true, color: COLORS.navy });
  slide.addText('A mission or review session teaches a verse with context and repetition.', { x: 1.0, y: 2.45, w: 3.2, h: 1.1, fontSize: 16, color: COLORS.ink });
  slide.addText('2. Return', { x: 5.0, y: 1.95, w: 1.2, h: 0.3, fontSize: 18, bold: true, color: COLORS.navy });
  slide.addText('The game shows what is due today, so the next step is clear.', { x: 5.0, y: 2.45, w: 3.2, h: 1.1, fontSize: 16, color: COLORS.ink });
  slide.addText('3. Retain', { x: 9.0, y: 1.95, w: 1.2, h: 0.3, fontSize: 18, bold: true, color: COLORS.navy });
  slide.addText('Repeated review strengthens recall and gives the learner a visible sense of growth.', { x: 9.0, y: 2.45, w: 3.2, h: 1.3, fontSize: 16, color: COLORS.ink });
  addFooter(slide, 'The point is not more complexity. The point is a clearer and more fruitful learning loop.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'Why Ministries May Care', 'A serious review system can create ministry value beyond entertainment.');
  addBullets(slide, [
    'Gives leaders a stronger story: not just players who tried the game, but learners who kept returning to God’s Word.',
    'Makes follow-up easier for youth ministries, camps, schools, and parents.',
    'Creates room for structured pilots, church cohorts, and discipleship challenges.',
    'Improves the credibility of the platform as a Scripture formation tool.'
  ], { w: 8.4, fontSize: 18 });
  addCallout(slide, 'Potential Ministry Outcome', 'Leaders could eventually ask, “What verses are my students actually retaining?” instead of “Did they play it once?”', {
    x: 9.0, y: 1.55, w: 3.2, h: 2.8, fill: 'EEF5EC', accent: COLORS.green
  });
  addFooter(slide, 'This is where the feature becomes more than a gameplay enhancement.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'Why We Should Not Build It Casually', 'This is a meaningful system, not a quick win.');
  addBullets(slide, [
    'It needs user-specific progress tracking, not shared device state.',
    'It touches learning logic, review flows, and eventually server sync.',
    'It should be measured against real ministry usage, not just internal enthusiasm.',
    'It deserves buy-in before significant engineering time is committed.'
  ], { w: 8.1, fontSize: 19 });
  addCallout(slide, 'Strategic Principle', 'Do not treat this as a small feature request. Treat it as a product capability that should earn its place.', {
    x: 8.95, y: 1.65, w: 3.25, h: 2.6, fill: 'FBECEC', accent: COLORS.red
  });
  addFooter(slide, 'The best case is strong. The implementation cost is real. Both should be stated plainly.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.light };
  addTitle(slide, 'What Partner Buy-In Could Fund Or Validate', 'The ask is not only money. It can also be pilot participation, feedback time, and testing commitment.');
  addBullets(slide, [
    'Discovery with real ministries and educators to confirm the workflow is genuinely useful.',
    'A pilot phase with actual learners to see whether due-based review improves return behavior.',
    'Design and engineering time for per-user progress, review scheduling, and reporting.',
    'Testing support from partners willing to use the feature seriously once a pilot exists.'
  ], { w: 8.3, fontSize: 18 });
  addCallout(slide, 'Buy-In Options', 'Investment can mean cash, pilot access, real student testing, or implementation sponsorship.', {
    x: 9.0, y: 1.7, w: 3.1, h: 2.4, fill: 'FFF7E8', accent: COLORS.gold
  });
  addFooter(slide, 'A feature like this becomes credible when partners help validate the real-world use case.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'A Responsible Rollout Path', 'The right rollout is staged and evidence-based.');
  addBullets(slide, [
    'Phase 1: validate the problem and partner interest.',
    'Phase 2: build per-user review foundations and a basic due-now experience.',
    'Phase 3: test with a small pilot group and measure return and retention behavior.',
    'Phase 4: decide whether to expand into broader ministry-facing reporting and workflows.'
  ], { w: 8.25, fontSize: 18 });
  addCallout(slide, 'What We Avoid', 'We avoid spending heavily on a sophisticated review engine before proving people actually want and will use it.', {
    x: 9.0, y: 1.75, w: 3.05, h: 2.55, fill: COLORS.sky, accent: COLORS.blue
  });
  addFooter(slide, 'The proposal is intentionally staged so commitment can grow with evidence.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addTitle(slide, 'The Ask', 'If this vision resonates, we are asking for concrete buy-in rather than vague encouragement.');
  addBullets(slide, [
    'Tell us whether this would solve a real discipleship or classroom problem for you.',
    'Commit to pilot testing if a first version is built.',
    'Consider sponsoring part of the design, engineering, or evaluation work.',
    'Help us define success in ministry terms, not just product terms.'
  ], { w: 8.0, fontSize: 19 });
  addCallout(slide, 'Decision Frame', 'If there is real partner demand, this becomes a justified roadmap investment. If not, it should stay a concept.', {
    x: 8.95, y: 1.65, w: 3.25, h: 2.7, fill: 'EEF5EC', accent: COLORS.green
  });
  addFooter(slide, 'The objective is alignment and validation, not pressure.');

  slide = pptx.addSlide();
  slide.background = { color: COLORS.navy };
  slide.addText('Future Review System', {
    x: 0.8, y: 1.2, w: 4.8, h: 0.6,
    fontFace: 'Aptos Display', fontSize: 28, bold: true, color: COLORS.white
  });
  slide.addText('A feature worth building only if it helps people return to Scripture more faithfully and more often.', {
    x: 0.8, y: 2.0, w: 6.2, h: 1.0,
    fontFace: 'Aptos', fontSize: 17, color: 'E5EEF8'
  });
  slide.addShape('roundRect', {
    x: 7.3, y: 1.3, w: 4.6, h: 3.2,
    fill: { color: COLORS.gold }, line: { color: COLORS.gold, pt: 1 }
  });
  slide.addText('Next step:\nIdentify which partners are willing to validate, pilot, or sponsor this direction.', {
    x: 7.6, y: 1.75, w: 4.0, h: 1.8,
    fontFace: 'Aptos Display', fontSize: 18, bold: true, color: COLORS.navy, align: 'center', valign: 'mid'
  });
  slide.addText('Thank you', {
    x: 0.8, y: 6.0, w: 2.0, h: 0.4,
    fontFace: 'Aptos', fontSize: 16, color: 'D8E5F3'
  });

  await pptx.writeFile({ fileName: OUTPUT_FILE });
  console.log(OUTPUT_FILE);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
