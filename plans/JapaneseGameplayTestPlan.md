# Japanese Gameplay Test Plan

## Scope

Validate the Japanese gameplay integration without changing non-Japanese behavior.

Files under test:

- `index.html`
- `game.js`
- `src/client/i18n.js`
- `src/client/QuizManager.js`
- `public/locales/ja.json`
- `bible-verses-deepseek-v4-pro.ja.js`
- `bible-verses-deepseek-v4-pro.ja-kana.js`

---

## Objectives

- Confirm Japanese is selectable from both language pickers.
- Confirm Japanese mode loads the latest kana-annotated verse bundle.
- Confirm `first_letter` gameplay becomes first-kana gameplay in Japanese.
- Confirm Japanese `missing_word`, `category_match`, and `true_false` still load from the Japanese bundle.
- Confirm other languages still load their existing bundles unchanged.

---

## Static Verification

### 1. Locale data

- Parse `public/locales/ja.json`.
- Confirm:
  - `meta.code === "ja"`
  - `meta.quizCapabilities.scriptType === "kana"`
  - `meta.quizCapabilities.supportedQuizModes.first_letter === true`
  - `quiz.firstKana` exists

### 2. Japanese bundle selection

- Confirm `index.html` loads both:
  - `bible-verses-deepseek-v4-pro.ja.js`
  - `bible-verses-deepseek-v4-pro.ja-kana.js`
- Confirm the kana bundle is loaded after the plain translation bundle.
- Confirm `game.js` uses `loadSelectedVersesJA()` when `lang === "ja"`.

### 3. Kana coverage

- Load `bible-verses-deepseek-v4-pro.ja-kana.js`.
- Confirm all verses are present.
- Confirm every verse intended for Japanese gameplay has `quizData.firstKana.candidates`.

---

## Manual Browser Checks

### 4. Language selectors

- Open the main menu.
- Confirm `日本語` appears in:
  - the main-menu language selector
  - the settings language selector
- Switch to Japanese from each selector separately and confirm the selection persists.

### 5. Main-menu content source

- With Japanese selected, confirm Verse of the Day loads Japanese verse text and Japanese references.
- Confirm no English verse text appears from the default bundle.

### 6. Japanese quiz generation

- Start a solo game in Japanese.
- Force or wait for a `first_letter` quiz.
- Confirm:
  - the question label uses the Japanese kana prompt
  - the verse text shows blanks in place of selected Japanese surfaces
  - answer options are kana strings, not Latin letters
  - the correct option matches the first kana of the hidden readings

### 7. Japanese non-first-kana modes

- In Japanese mode, verify at least one example each of:
  - `missing_word`
  - `category_match`
  - `true_false`
- Confirm each uses Japanese verse text from the Japanese bundle.

### 8. Fallback safety

- Confirm Japanese `first_letter` mode does not fall back to Latin-letter options.
- Confirm a verse without `firstKana` does not generate a broken Japanese `first_letter` quiz.

---

## Regression Checks

### 9. English regression

- Switch back to English.
- Confirm the normal English bundle still loads.
- Confirm English `first_letter` still uses Latin-letter answers.

### 10. Korean regression

- Switch to Korean.
- Confirm Korean `first_letter` behavior still uses the existing syllable-based path.

### 11. Other locale regression

- Spot-check `es`, `lg`, `hi`, `hi-rom`, `zw`, and `id`.
- Confirm each still loads its original bundle and starts gameplay normally.

---

## Acceptance Criteria

- Japanese is selectable anywhere the player can change language.
- Japanese gameplay uses `loadSelectedVersesJA()` from the kana-annotated bundle.
- Japanese `first_letter` quizzes present kana-based answers only.
- No Latin-letter leakage appears in Japanese `first_letter` mode.
- English and Korean first-letter behavior remain unchanged.
- No non-Japanese bundle selection logic changes behavior.
