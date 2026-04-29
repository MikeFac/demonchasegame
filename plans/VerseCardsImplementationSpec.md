# Verse Cards Implementation Spec

## Goal

Implement a print system that:

- reads category verses from `bible-verses.js`
- builds an `8-page` A5 booklet per category
- renders a browser preview in reading order
- renders printer-imposed A4 spreads for PDF generation
- exports a consistent duplex PDF suitable for local printing

## Scope

Phase 1 implementation covers:

- one reusable print pipeline
- one booklet per category
- `24` verses per category
- `6` verses per reading page
- `2` columns per verse page, with `3` verses per column
- front and back covers with VerseBattles logo and QR code
- CTA at the bottom of every verse page

## Data Source

Primary input:

- [bible-verses.js](/home/michael/proj/dcgame/bible-verses.js:1)

Expected fields already present:

- `Category`
- `Reference`
- `Text`

## Booklet Data Model

Create an internal booklet object shaped approximately like this:

```js
{
  slug: "courage",
  category: "Courage",
  title: "Courage Verses",
  verses: [
    { reference: "Joshua 1:9", text: "..." }
  ],
  pages: [
    { pageNumber: 1, kind: "cover-front", ... },
    { pageNumber: 2, kind: "verses", verses: [...] },
    { pageNumber: 3, kind: "verses", verses: [...] },
    { pageNumber: 4, kind: "verses", verses: [...] },
    { pageNumber: 5, kind: "verses", verses: [...] },
    { pageNumber: 6, kind: "how-to", ... },
    { pageNumber: 7, kind: "cta", ... },
    { pageNumber: 8, kind: "cover-back", ... }
  ]
}
```

## Verse Selection Rules

Phase 1 selection logic:

1. group all verses by `Category`
2. sort by existing source order
3. filter out long verses using a fixed threshold
4. take the first `24` suitable verses

Recommended default threshold:

- `Text.length <= 160`

Reason:

- this threshold preserves about `71.1%` of all verses
- it is a good first-pass fit for denser printed layouts

If a category has fewer than `24` suitable verses:

- render a partial booklet using the suitable verses available
- keep four verse pages in the model so the `8-page` imposition remains stable

## Page Model

### Page 1: `cover-front`

Fields:

- logo asset path
- category title
- QR code image path or generated data URL
- headline
- short subhead

### Pages 2-5: `verses`

Fields:

- page number
- category
- exactly `6` verse items
- footer CTA

### Page 6: `how-to`

Fields:

- short step-by-step instructions
- optional QR repeat

### Page 7: `cta`

Fields:

- reinforcement headline
- short supporting copy
- CTA
- optional QR repeat

### Page 8: `cover-back`

Fields:

- logo
- QR code
- URL
- short CTA

## Route and File Strategy

Because the site is already served from Express static/root HTML in [server.js](/home/michael/proj/dcgame/server.js:1), implement the print feature with server-rendered or generated HTML routes.

Recommended route structure:

- `GET /print/:categorySlug`
  - reading-order preview
- `GET /print/:categorySlug/imposed`
  - printer spread layout
- `GET /api/print/:categorySlug/pdf`
  - generated PDF download

Optional supporting route:

- `GET /print`
  - category index page

## HTML Rendering Strategy

Use HTML and CSS as the source of truth for layout.

There should be two rendering modes:

### Reading Mode

Purpose:

- preview pages as a reader sees them after folding

Characteristics:

- page panels shown in order `1..8`
- each panel displayed at A5 proportions
- useful for content review and debugging

### Imposed Mode

Purpose:

- render A4 landscape printer spreads

Characteristics:

- each spread contains two A5 panels
- panels are arranged using booklet imposition mapping
- intended for PDF generation only

## Imposition Mapping

For `8` pages, use this mapping:

```js
const imposedSpreads = [
  { sheet: 1, side: "front", left: 8, right: 1 },
  { sheet: 1, side: "back", left: 2, right: 7 },
  { sheet: 2, side: "front", left: 6, right: 3 },
  { sheet: 2, side: "back", left: 4, right: 5 }
];
```

The imposed route should render these as four consecutive A4 landscape pages.

## Styling Requirements

Create dedicated print styling, likely under `public/` or another shared stylesheet path.

### General

- A5 page panel inside preview mode
- A4 landscape page size in imposed mode
- black-and-white safe palette
- high contrast
- low ink density

### Typography

- readable serif or highly legible print-safe font
- clear verse reference hierarchy
- balanced spacing between verse blocks

### Verse Block

Each verse block should contain:

- reference in bold or semi-bold
- verse text beneath
- optional small category label omitted if redundant

### Footer CTA

Every verse page must include:

`Scan to memorise and play at VerseBattles.com`

### Cover Pages

Front and back covers must include:

- VerseBattles logo
- QR code
- URL text

## QR Code Strategy

Use one of these approaches:

1. generate QR server-side and embed inline as SVG or data URL
2. pre-generate a static QR asset for `https://versebattles.com`

For phase 1, the simplest reliable option is:

- generate one static QR asset and reuse it

## Assets Needed

Phase 1 assets:

- VerseBattles logo suitable for black-and-white print
- QR code asset for `https://versebattles.com`

Recommended locations:

- `public/print-assets/logo-bw.png` or `.svg`
- `public/print-assets/versebattles-qr.svg`

## Suggested File Layout

One pragmatic structure:

```text
src/server/print/
  bookletBuilder.js
  bookletTemplates.js
  bookletImposition.js
  printRoutes.js

public/
  print-assets/
  print.css

scripts/
  generate_print_pdf.js
```

## Server Responsibilities

### `bookletBuilder.js`

Responsibilities:

- load verses from `bible-verses.js`
- group by category
- filter by length threshold
- select first `24`
- assemble the `8-page` booklet model

### `bookletImposition.js`

Responsibilities:

- map reading pages to printer spreads
- validate expected `8-page` input
- return spread descriptors for HTML rendering

### `bookletTemplates.js`

Responsibilities:

- render reading-order HTML
- render imposed spread HTML
- keep page markup consistent between both modes

### `printRoutes.js`

Responsibilities:

- wire Express endpoints
- validate `categorySlug`
- return HTML preview or imposed HTML
- provide metadata for PDF export requests

## PDF Generation Strategy

The repo already points toward browser-based PDF export in [scripts/render_uganda_handouts_pdf.sh](/home/michael/proj/dcgame/scripts/render_uganda_handouts_pdf.sh:1). Reuse that direction.

Preferred approach:

- use Puppeteer or headless Chrome
- load `/print/:categorySlug/imposed`
- export with print CSS enabled

Recommended PDF endpoint flow:

1. request `/api/print/:categorySlug/pdf`
2. server renders or opens imposed route
3. browser engine exports A4 landscape PDF
4. response downloads the file

### PDF Settings

- format: `A4`
- landscape: `true`
- print backgrounds: `false` unless needed for contrast blocks
- margins: minimal and controlled by CSS
- prefer CSS page size: `true`

## Web UI Controls

Preview page should include:

- `Download PDF` button
- optional `Print Preview` or `Open Imposed View` link

The `Download PDF` button should target:

- `/api/print/:categorySlug/pdf`

## Validation Rules

Before rendering a booklet:

- confirm category exists
- confirm category has enough selected verses
- confirm exactly `4` verse pages are built
- confirm exactly `8` pages total are built

If validation fails:

- return a clear error page or JSON error

## Testing Plan

### Unit-Level Checks

- booklet builder returns correct categories
- filtering threshold excludes long verses
- every successful booklet contains `24` verses
- imposition mapping matches the expected page order

### Manual Browser Checks

- `/print/courage` shows pages `1..8` in reading order
- `/print/courage/imposed` shows `4` A4 spreads
- footer CTA appears on all verse pages
- logo and QR appear on front and back covers

### PDF Checks

- generated PDF has `4` A4 landscape pages
- printing duplex and folding yields correct page order
- text remains legible in black and white

## Phase 1 Implementation Steps

1. Add print assets
2. Create booklet builder
3. Create reading-page and imposed-page templates
4. Add print CSS
5. Add Express routes
6. Add PDF export script or endpoint
7. Build first test booklet for one category
8. Verify fold order manually
9. Extend to all printable categories

## Open Decisions

These can stay fixed for phase 1 unless the user wants changes:

- use `160` character suitability threshold
- use an `8-page` booklet structure
- use a static QR asset
- use server-side PDF generation for consistent output

## Phase 1 Deliverables

- printable booklet plan implemented in code
- reading-order preview route
- imposed spread route
- downloadable PDF endpoint
- first category booklet validated end to end
