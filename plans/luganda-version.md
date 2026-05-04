# Luganda Version — Implementation Plan

> Updated: 2025-05-05. Tracks concrete engineering tasks to ship a Luganda game version.
> See `plans/UgandaLugandaLocalizationPlan.md` for the broader strategic plan.

## What's Already Done

- [x] `bible-verses-lg.js` — 3,101 Luganda verses (21 categories, full quiz data)
- [x] `VerseSong` schema has `language: 'lg'` field (indexed)
- [x] 5 Luganda verse songs in MongoDB (Prayer, Prophecy, Prosperity, Purity, Wisdom)
- [x] Server routes filter by `lang` param (`verseSong.js`)
- [x] Client sends `lang` to all song APIs (`VerseSongService.js`, `SongLibraryOverlay.js`)
- [x] `game.js` loads Luganda verses when `lang === 'lg'`
- [x] `index.html` includes `bible-verses-lg.js` script tag
- [x] VOTD loads Luganda verses based on language
- [x] `public/locales/lg.json` — full Luganda UI translation (292 strings)

## Implementation Tasks

### 1. Fix `bible-verses-lg.js` function name (BUG)

**File:** `bible-verses-lg.js` line 1
**Problem:** Function is named `loadSelectedVerses()` (same as English). Since `bible-verses.js` loads first in `index.html`, the Luganda function overwrites the English one (or vice versa). The client code checks for `loadSelectedVersesLG`.
**Fix:** Rename to `loadSelectedVersesLG()`, add `window.loadSelectedVersesLG` alias.

### 2. Add Luganda to language select dropdowns

**File:** `index.html`
**Change:** Add `<option value="lg">Luganda</option>` to both:
- `#mainMenuLanguageSelect` (~line 1275)
- `#languageSelect` (~line 1366)

### 3. Add Luganda files to service worker cache

**File:** `service-worker.js`
**Change:** Add to cached files list:
- `'/locales/lg.json'`
- `'/bible-verses-lg.js'`

### 4. Create `public/locales/lg.json`

**File:** `public/locales/lg.json` (new)
**Source:** Copy `en.json` structure, translate all 292 strings to Luganda.
**Sections by size:**

| Section | Strings | Content |
|---------|---------|---------|
| config | 60 | Settings/options screen |
| ui | 37 | Core gameplay strings |
| lobby | 28 | Multiplayer lobby |
| menu | 26 | Main menu items |
| tutorial | 26 | Tutorial pages (HTML content) |
| votd | 24 | Verse of the day UI |
| demons | 17 | Demon display names |
| categories | 14+ | Category display names (needs 21 for Luganda) |
| overland | 11 | Campaign map UI |
| toasts | 10 | Toast notifications |
| review | 8 | Verse review screen |
| quickStart | 7 | Quick start overlay |
| items | 6 | Armor of God items |
| mapStyles | 5 | Map style names |
| stats | 4 | End-of-game stats |
| buffs | 4 | Power-up labels |
| meta | 3 | Language metadata |
| verseTest | 2 | Verse test labels |

**Approach:** Use Gemini to translate in one shot (same as verse translation).

### 5. I18n quiz question labels (optional enhancement)

**File:** `QuizManager.js` lines 188, 270, 294, 334-335, 453
**Problem:** Quiz question labels are hardcoded English:
- `"First letters of missing words:"`
- `"Fill in the missing word:"`
- `"Which quality does this verse teach?"`
- `"TRUE"` / `"FALSE"`
- `"Fill in the blanks:"`

**Fix:** Add 5 new keys to locale files, replace hardcoded strings with `t()` calls.

## NOT Needed (already done or language-agnostic)

- No `i18n.js` changes
- No `Renderer.js` changes (already uses `t()`)
- No `ReviewMode.js` changes (already uses `t()`)
- No `VotdLearningMode.js` changes (already uses `t()`)
- No server route changes (already filter by `lang`)

## Testing Checklist

After all tasks are complete, verify:

1. Select Luganda from language dropdown → page reloads in Luganda
2. Main menu renders in Luganda
3. Start solo game → verses are in Luganda (Luganda references, Luganda text)
4. Quizzes work with Luganda text and options
5. Verse songs play (for the 5 categories that have Luganda songs)
6. Song library shows Luganda songs only (when in Luganda mode)
7. Review mode shows Luganda verses
8. VOTD shows Luganda verse
9. Settings/options screen is in Luganda
10. Switching back to English works cleanly
11. Offline mode works (service worker caches Luganda files)

## Cost

- Locale translation: $0 (Gemini API, included in existing usage)
- Verse songs: 5 × $0.06 = $0.30 (already done)
- Total: $0.30
