# Hindi Implementation Plan

## Purpose

Add a Hindi version of VerseBattles in a way that is launch-safe, script-correct, and reusable for future non-Latin languages.

This plan assumes:

- primary Hindi presentation will use Devanagari
- Romanized Hindi may be offered later as a secondary aid, not as the canonical text layer
- the current quiz engine has English/Latin assumptions that must be isolated before Hindi can ship cleanly

## Strategic Recommendation

Ship Hindi in two phases:

1. Devanagari-first gameplay with only script-safe quiz modes.
2. Optional Romanized support and script-aware quiz upgrades after Hindi content quality and retention are validated.

Do not try to make the current `first_letter` mode work for Hindi by swapping letters. The current mode is structurally Latin-centric and would produce poor gameplay in Devanagari.

## Current-State Assessment

The main blockers are in [`src/client/QuizManager.js`](../src/client/QuizManager.js):

- `processVerse()` splits text by spaces and uses `word[0].toUpperCase()` for initials.
- `processVerse()` blanks words with `'-'.repeat(word.length)`, which is based on code-unit length, not rendered Hindi grapheme clusters.
- `generateFirstLetterData()` uses Latin distractors only.
- `generateClozeLetterOptions()` uses Latin `A-Z` style distractors.
- `autoGenerateCloze()` only accepts words matching `/^[a-zA-Z]+$/`.

Implication:

- current `first_letter` is not Hindi-safe
- current fallback cloze generation is not Hindi-safe
- any language rollout that depends on those paths will degrade badly in Devanagari

## Product Position

### Canonical Hindi Form

Use Devanagari as the canonical Hindi game language.

Reasons:

- it is the standard script for Hindi
- it aligns with formal scripture presentation
- it matches user expectations for a Hindi Bible-learning product
- it avoids teaching users a transliteration layer instead of the language they are trying to memorize

### Romanized Hindi

Treat Romanized Hindi as optional support, not the main product.

Good uses:

- onboarding for users comfortable speaking Hindi but slower reading Devanagari
- search input
- transliteration toggle
- metadata or subtitle layer
- growth experiments for diaspora or mixed Hindi-English audiences

Bad uses:

- as the only Hindi representation
- as the memorization target text
- as the canonical stored verse text

## Launch Scope

### In Scope for Phase 1

- Hindi locale support
- Devanagari verse content
- Hindi category translations
- Hindi UI copy
- script-safe quiz modes only
- Hindi rendering and font validation
- content ingestion and QA workflow

### Explicitly Out of Scope for Phase 1

- current `first_letter` mode for Hindi
- auto-generated cloze from raw Hindi text
- Romanized Hindi as the default language
- script-aware typing challenges

## Recommended Hindi Quiz Mix

For initial Hindi release, enable:

- `missing_word` using pre-authored Hindi quiz data
- `category_match`
- `true_false`

Disable for Hindi at launch:

- `first_letter`
- auto-generated cloze fallbacks that rely on Latin-only parsing

If cloze is desired in Hindi, it should be pre-authored first. Do not depend on the current auto-generator.

## Architecture Changes

### 1. Introduce Language Capability Flags

Add language-level feature flags so quiz modes are not assumed globally. Example capabilities:

- `supportsFirstLetterQuiz`
- `supportsAutoCloze`
- `supportsRomanizedDisplay`
- `scriptType`
- `inputMode`

This avoids one-off Hindi conditionals and gives a reusable path for Arabic, Amharic, Bengali, Tamil, etc.

### 2. Separate Canonical Text From Display Variants

Verse records should support:

- canonical scripture text
- optional transliteration
- optional localized quiz payloads

Suggested structure:

```json
{
  "language": "hi",
  "script": "Devanagari",
  "text": "क्योंकि परमेश्वर ने जगत से ऐसा प्रेम रखा...",
  "transliteration": "Kyonki Parmeshwar ne jagat se aisa prem rakha...",
  "quizData": {
    "missingWord": {},
    "categoryMatch": {},
    "trueFalse": {}
  }
}
```

### 3. Make Quiz Generation Script-Aware

Longer term, quiz generation should move from Latin assumptions to script-aware helpers:

- grapheme segmentation rather than `word[0]`
- display-width-safe masking rather than `'-'.repeat(word.length)`
- language-specific distractor generation
- Unicode-aware tokenization

If a future Hindi equivalent of `first_letter` is built, it should be a `first_akshara` mode, not a literal port of current English logic.

## Content Pipeline

### Phase 1 Content Requirements

- Hindi verse corpus in Devanagari
- category labels translated to Hindi
- pre-authored Hindi quiz data for supported modes
- QA pass for punctuation, danda handling if present, and verse reference consistency

### Content Rules

- preserve a single canonical translation/version for launch
- avoid mixing highly Sanskritized and colloquial registers inside one release
- keep quiz wording simple and modern
- store transliteration separately from canonical text

## UI and Rendering Requirements

- choose a Devanagari-capable web font and test fallback behavior
- verify line breaks on mobile for longer verse text
- verify shaping for conjuncts such as `प्र`, `क्त`, `त्र`, `ज्ञ`
- verify text measurement in buttons, cards, and quiz options
- verify copy does not break timer, answer, or results layouts

## Implementation Phases

### Phase 0: Audit and Guardrails

- identify all places where quiz logic assumes Latin text
- add a Hindi language config
- prevent Hindi from entering unsupported quiz paths
- define storage shape for transliteration and localized quiz data

Exit criteria:

- Hindi can be loaded without falling into `first_letter` or Latin-only auto-cloze

### Phase 1: Devanagari MVP

- add Hindi locale strings
- ingest Hindi verse set
- attach pre-authored quiz data for supported modes
- enable only script-safe quiz modes for Hindi
- run device QA across desktop and mobile

Exit criteria:

- Hindi rounds are playable end-to-end
- no broken glyph shaping
- no Latin fallback artifacts in gameplay

### Phase 2: Romanized Assist Layer

- add optional transliteration field
- add UI toggle for `Hindi` / `Romanized Hindi`
- keep answer validation and canonical memorization anchored to Devanagari
- test whether transliteration improves onboarding without hurting scripture learning

Exit criteria:

- transliteration is helpful but does not replace canonical Hindi

### Phase 3: Script-Aware Advanced Modes

- build Unicode-aware tokenization utilities
- prototype `first_akshara` mode
- build Hindi-safe cloze generation if still valuable
- test confusion rate and learning value versus simpler modes

Exit criteria:

- advanced mode performs well enough to justify maintenance cost

## Risks

### Product Risks

- Romanized-only Hindi would broaden accessibility short term but weaken scripture memorization quality
- over-reliance on auto-generated quizzes will produce awkward or incorrect Hindi prompts
- mixing scripts casually can make the product feel lower-trust

### Engineering Risks

- Unicode segmentation bugs
- font fallback inconsistencies across devices
- unguarded Latin-only fallbacks reappearing through custom verse flows

## Success Criteria

- Hindi users can complete stable quiz sessions in Devanagari
- no unsupported mode is shown for Hindi
- verse rendering is clean on mobile and desktop
- content authors can add Hindi verses and quiz data without hand-editing code
- Romanized Hindi, if added, improves onboarding or search without replacing Devanagari as the memorization target

## Recommended Build Order

1. Add Hindi language config and feature flags.
2. Disable unsupported quiz modes for Hindi.
3. Add Devanagari UI strings and category translations.
4. Ingest Hindi verse content with pre-authored quiz payloads.
5. QA rendering and mobile layouts.
6. Pilot with Devanagari only.
7. Add Romanized Hindi as an experiment if user demand justifies it.
8. Build script-aware advanced quizzes only if Hindi retention data supports the investment.
