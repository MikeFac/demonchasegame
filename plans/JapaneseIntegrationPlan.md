# Japanese Integration Plan

## Goal

Integrate Japanese into the game as a first-class locale, with a dedicated first-kana gameplay path for verse quizzes.

The Japanese content pipeline already exists:

- `bible-verses-deepseek-v4-pro.ja.js` for translated verses
- `bible-verses-deepseek-v4-pro.ja-kana.js` for kana annotations
- `scripts/secondpass-japanese.js` for generating `quizData.firstKana`

The game now needs to consume that content cleanly and expose Japanese gameplay without relying on Latin-letter assumptions.

---

## Current State

### Data pipeline

Japanese verse content has already been generated and reviewed at the bundle level.

The important artifacts are:

- `bible-verses-deepseek-v4-pro.ja.js`
- `bible-verses-deepseek-v4-pro.ja-kana.js`

The kana pass annotates every verse with `quizData.firstKana.candidates`.

### Client plumbing

The quiz system already has a `first_letter` mode in:

- `src/client/QuizManager.js`

The mode name is still English-centric, but the runtime already branches by language capability in:

- `src/client/i18n.js`

Japanese is not yet configured as a fully supported in-game locale.

### Current gap

The game can read Japanese verse text, but it does not yet treat Japanese as a distinct quiz experience.

The missing pieces are:

- locale selection and loading
- Japanese UI labels
- Japanese quiz generation for first-kana play
- tests for the new behavior

---

## Product Decision

Keep the internal mode ID unchanged.

- Use `first_letter` as the gameplay mode name
- Reinterpret it for Japanese as a first-kana quiz

This keeps the existing mode plumbing intact while changing the experience for Japanese players.

The Japanese first-kana quiz should use `quizData.firstKana.candidates` as the primary source of quiz choices.

---

## Scope

### In scope

- Load the Japanese verse bundle in the client
- Load the kana-annotated bundle for gameplay
- Enable Japanese locale support in `src/client/i18n.js`
- Teach `src/client/QuizManager.js` to use `quizData.firstKana`
- Add Japanese UI labels for the quiz prompt
- Keep analytics and mission tracking compatible with `first_letter`
- Add tests for Japanese first-kana prompts and candidate rendering

### Out of scope

- Reworking the English quiz system
- Changing the `first_letter` mode name globally
- Adding new translation passes beyond the existing Japanese verse and kana bundles
- Reintroducing Latin-letter logic for Japanese
- Adding cloze-first-kana behavior in phase one unless a separate data source is added later

---

## Desired Behavior

### Japanese first-kana quiz

When the active language is Japanese:

- the `first_letter` mode should become a kana-based prompt
- the hidden-word challenge should use the kana candidate list from `quizData.firstKana`
- the choices should be Japanese-friendly and readable, not alphabet-based

Example:

- Verse text: `主は私の味方です`
- Candidate surfaces: `主`, `味方`, `恐れ`
- Readings: `しゅ`, `みかた`, `おそれ`

The player should choose the correct kana reading option for the hidden word or words, depending on the prompt design used in the Japanese UI.

### Data integrity

Japanese gameplay should only use annotated verses that already have valid kana candidates.

If a verse is missing `quizData.firstKana`, the client should fail safely rather than inventing a Latin-style prompt.

---

## Technical Approach

### 1. Add Japanese locale capability

Update `src/client/i18n.js` so `ja` is a real supported locale.

The Japanese capability block should:

- identify Japanese as a non-alphabetic script
- enable `first_letter` gameplay in Japanese only through kana annotations
- keep other quiz modes aligned with the existing Japanese bundle

The exact capability shape should be explicit, so the quiz manager can branch on language instead of guessing from text.

### 2. Load the Japanese bundles

Make sure the game can load:

- `bible-verses-deepseek-v4-pro.ja.js`
- `bible-verses-deepseek-v4-pro.ja-kana.js`

The kana bundle should be used as the gameplay source when Japanese is selected, because it already contains the `firstKana` metadata.

### 3. Teach `QuizManager` to use `firstKana`

Update `src/client/QuizManager.js` so Japanese `first_letter` mode:

- reads `quizData.firstKana.candidates`
- uses kana readings as the answer surface
- avoids the English letter-prompt generator path

This should be done without changing the `first_letter` mode identifier, because analytics and the rest of the game already key off that mode.

### 4. Add Japanese prompt labels

Update the locale strings so the prompt text matches the Japanese gameplay:

- use a Japanese label for the first-kana prompt
- keep the prompt concise and game-like
- avoid describing it as “first letters”

The user-facing label should reflect kana, not alphabetic letters.

### 5. Preserve existing tracking

Do not change the core tracking model unless necessary.

Keep these behaviors compatible:

- daily challenge tracking
- unique verse learning tracking
- analytics events keyed by `first_letter`
- mission and progress recording

Japanese should look like a locale-specific interpretation of the existing mode, not an unrelated new mode.

### 6. Decide fallback behavior explicitly

For phase one, prefer a strict rule:

- if `quizData.firstKana` exists, use it
- if it does not exist, skip that verse for Japanese first-kana gameplay

This is safer than falling back to Latin letter generation, which does not fit Japanese.

If fallback behavior is needed later, it should be a deliberate Japanese-specific rule, not a generic alphabet fallback.

---

## Implementation Phases

### Phase 1: Locale plumbing

- Add Japanese locale support to `src/client/i18n.js`
- Confirm the Japanese bundle is selectable in the client
- Ensure the game can load the kana-annotated bundle

### Phase 2: Quiz generation

- Update `src/client/QuizManager.js`
- Route Japanese `first_letter` play to `quizData.firstKana`
- Keep the existing mode ID and analytics shape intact

### Phase 3: UI polish

- Add Japanese labels for quiz prompts and instructions
- Make sure the first-kana experience reads naturally in Japanese
- Confirm the prompt text fits the available UI space

### Phase 4: Validation

- Add tests for Japanese candidate selection
- Verify every verse in the Japanese bundle has usable `firstKana`
- Confirm no Latin-letter prompt leaks into Japanese gameplay

### Phase 5: Rollout

- Run a manual gameplay pass in Japanese
- Check quiz mode selection, answer validation, and progress tracking
- Verify that Japanese content stays separate from the other locales

---

## Acceptance Criteria

- Japanese can be selected as a locale in the game
- Japanese first-kana gameplay uses `quizData.firstKana.candidates`
- No Latin-letter prompt is shown when Japanese is active
- The `first_letter` mode remains compatible with existing analytics and mission logic
- The kana bundle loads successfully in the client
- Tests cover the Japanese path and protect English behavior from regression

---

## Risks

- The mode name `first_letter` is semantically awkward for Japanese, but changing it now would ripple through the game.
- Japanese prompt wording may need UI tuning once the first real playtest happens.
- If future Japanese verses are added without kana annotations, the first-kana mode should skip them rather than degrade into an English-style prompt.

---

## Next Step

Implement the locale and quiz-manager changes, then do a manual gameplay check with the Japanese bundle and kana annotations.
