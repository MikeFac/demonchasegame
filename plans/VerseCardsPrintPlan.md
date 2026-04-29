# Verse Cards Print Plan

## Objective

Create economical printed verse cards/booklets that promote `VerseBattles.com`, using existing verses from `bible-verses.js`, and support both:

- browser preview pages
- print-ready imposed PDFs for duplex A4 printing and folding

The first production target is Kampala, Uganda, with black-and-white duplex printing on A4 paper and folding to A5 booklet format.

## Product Shape

Each category should become a small folded booklet:

- `24` verses per category
- `6` verses per reading page
- `2` columns per verse page, with `3` verses per column
- `4` verse pages total
- plus branded front and back cover panels
- printed on `2` duplex A4 sheets
- folded in half to produce an `8-page` A5 booklet

This is the cleanest physical format because it leaves room for:

- a front cover with VerseBattles branding
- a back cover with branding and QR code
- consistent verse density
- stronger call to action without crowding verse pages

## Core Content Rules

- Use verses from `bible-verses.js`
- Start with `24` verses per category
- Ignore unusually long verses for the first version
- Use `6` verses per page in two columns
- Include a strong call to action at the bottom of every verse page
- Include VerseBattles logo and QR code on both front and back cover pages

## Recommended Booklet Structure

### Page 1: Front Cover

- VerseBattles logo
- category title
- QR code to `https://versebattles.com`
- short value proposition

### Pages 2-5: Verse Content

- `6` verses per page
- each verse shows reference and verse text
- bottom footer CTA on every page

### Page 6: How To Use

- short instructions:
  - read
  - memorise
  - scan QR
  - play online

### Page 7: Reinforcement / Invitation

- optional short testimony, classroom use, church use, or challenge prompt
- can also be used for partner/distribution messaging

### Page 8: Back Cover

- VerseBattles logo
- QR code
- `versebattles.com`
- short CTA

## Why Web Preview and PDF Should Differ

The web page should display pages in normal reading order so the user can review the booklet as a reader would see it after folding.

The PDF should be generated in printer-imposed spreads so duplex A4 printing and folding produce the correct reading order.

This means:

- web preview uses reading order
- PDF uses sheet imposition order

## Reading Order

The booklet reading order is:

- `1` front cover
- `2` verse page 1
- `3` verse page 2
- `4` verse page 3
- `5` verse page 4
- `6` how-to page
- `7` reinforcement / CTA page
- `8` back cover

## Imposed PDF Sheet Order

For an `8-page` booklet printed on `2` duplex A4 sheets:

- Sheet 1 front: `8 | 1`
- Sheet 1 back: `2 | 7`
- Sheet 2 front: `6 | 3`
- Sheet 2 back: `4 | 5`

This is the critical mapping that lets the folded paper match the web preview reading order.

## Delivery Approach

The best workflow for this repo is:

1. generate structured booklet data from `bible-verses.js`
2. render browser preview HTML pages
3. render separate imposed-print HTML pages
4. export imposed pages to PDF with headless Chrome or Puppeteer

This keeps HTML as the source of truth and makes layout iteration much faster.

## Proposed URL Structure

Preview route examples:

- `/print/courage`
- `/print/hope`
- `/print/love`

Optional explicit view modes:

- `/print/courage?view=reading`
- `/print/courage?view=imposed`

Or separate generation targets:

- `/print/courage`
- `/print/courage/booklet.pdf`

## Practical Kampala Printing Assumptions

- black and white only for version 1
- duplex A4 photocopier or digital print workflow
- folded in half manually
- no trimming required for initial pilot unless crop marks are later added

This keeps cost low and makes church/school trial runs easy.

## Phase 1 Scope

Phase 1 should deliver:

- one category booklet end to end
- reading-order web preview
- imposed duplex PDF
- logo, QR code, and CTA on covers
- `6` verses per verse page
- `24` verses per category

## Phase 2 Scope

After the first version works, extend to:

- all categories with enough suitable verses
- category index page
- automatic filtering of long verses
- alternate text density variants
- crop marks and fold guides if needed
- optional school/church co-branding

## Content Selection Rules For Phase 1

- choose the first `24` suitable verses from each category
- suitability is based on verse text length threshold
- long verses are excluded from this format for now
- categories with fewer than `24` suitable verses are still printable as partial booklets

## Design Principles

- must remain readable in black and white
- strong high-contrast QR code
- simple typography
- limited ink coverage
- footer CTA repeated consistently
- cover branding strong enough to drive scanning and recall

## Recommended CTA Direction

Keep the CTA short and repetitive across all verse pages. Example:

`Scan to memorise and play at VerseBattles.com`

## Success Criteria

The phase 1 solution is successful if:

- a category booklet can be previewed on the web
- the PDF prints correctly duplex on A4
- after folding, page order matches the web preview
- verse pages remain readable in black and white
- logo and QR code are clear on front and back cover pages
- the process can be repeated automatically for other categories
