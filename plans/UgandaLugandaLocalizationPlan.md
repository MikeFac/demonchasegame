# Uganda Luganda Localization Plan

## Purpose

This document outlines a pragmatic plan for making VerseBattles more usable in Uganda through Luganda support.

The goal is not only to translate menu text. It is to define the work required across:

- UI localization
- verse content
- quiz generation
- audio playback
- Bible text licensing
- Uganda-specific pilot scope

This is a planning document only.

## Problem Statement

The current repo already supports a partial English and Spanish experience, but the multilingual implementation is not yet generalized enough for a clean Luganda rollout.

Current constraints:

- `public/locales/en.json` and `public/locales/es.json` exist for UI strings
- `bible-verses.js` is the main English verse source
- `bible-verses-es.js` exists, but only as a partial translated verse bundle
- `game.js` currently special-cases Spanish verse loading instead of supporting arbitrary languages
- verse audio in review / VOTD / verse test is hardcoded to an external English-oriented audio path

This means Luganda is not a one-file translation task.

## Current-State Assessment

### What Already Exists

- UI i18n loader in `src/client/i18n.js`
- language selectors in `index.html`
- Spanish locale file in `public/locales/es.json`
- partial Spanish verse bundle in `bible-verses-es.js`
- verse translation script precedent in `scripts/translate-verses-to-spanish.js`

### Important Limitations

- language switching for verse bundles is hardcoded in `game.js`
- Spanish support is implemented as a one-off path, not a general language-content registry
- the Spanish verse bundle is only a subset, not full parity with English
- audio playback assumes a fixed external source:
  - `src/client/ReviewMode.js`
  - `src/client/VerseTestScreen.js`
  - `src/client/VotdLearningMode.js`

## Strategic Recommendation

Do not begin with "translate everything and generate all audio."

Start with a Uganda pilot that is small enough to finish and test in real schools and ministries.

Recommended first target:

- full Luganda UI localization
- one curated Luganda verse pack for high-value categories
- Luganda quiz content for that pack
- top-priority Luganda audio for those same verses
- generalized code support so Luganda is not another special-case like Spanish

## Non-Goals For The First Iteration

The first Luganda project should not aim to:

- translate all English verses immediately
- generate all verse audio immediately
- support every possible Ugandan language in the same pass
- replace the internal category keys with Luganda identifiers
- perfect every gameplay string before shipping a pilot

## Success Criteria

The first Luganda rollout is successful if:

- a user can select Luganda from the language UI
- menu and gameplay UI render in Luganda without obvious English leaks
- the game can load a Luganda verse bundle without special-casing `es`
- Luganda verse quiz content feels natural, not mechanically translated
- review / VOTD / verse test audio can play Luganda audio for the pilot verse pack
- the content and audio licensing position is clear enough for real distribution

## Key Decisions To Make Early

### 1. Bible Text Source

This is the highest-risk dependency.

The project needs a decision on whether to use:

- a Bible Society of Uganda text under permission/license
- another Luganda translation with explicit app redistribution rights
- a narrower custom educational verse set if full-Bible rights are difficult

This affects:

- whether verse text can be committed into the repo
- whether full bundles can be distributed in production
- whether derivative quiz content is acceptable

### 2. Scope Of Luganda Content

Choose one of these paths before implementation:

- pilot verse pack only
- partial curriculum by categories
- full verse library parity

Recommended first choice:

- pilot verse pack only

### 3. Audio Strategy

Pick one primary path:

- human-recorded pilot audio
- open-source Luganda TTS
- hybrid: human audio for pilot, TTS for experimentation

Recommended first choice:

- hybrid

## Proposed Architecture Changes

## Phase 1: Generalize Language Support

### Goal

Make language selection generic enough for Luganda, rather than extending the current Spanish one-off.

### Tasks

- add `public/locales/lg.json`
- add Luganda option to:
  - `index.html` main menu language select
  - `index.html` settings language select
- replace the current `if (lang === 'es')` verse selection logic in `game.js`
- introduce a generic verse bundle resolver

### Suggested Direction

Instead of:

```javascript
if (lang === 'es' && typeof loadSelectedVersesES === 'function') {
  verses = loadSelectedVersesES();
} else {
  verses = loadSelectedVerses();
}
```

move toward:

```javascript
verses = loadSelectedVersesForLanguage(lang);
```

### Suggested Bundle Contract

Each localized verse bundle should expose a consistent shape:

```javascript
function loadSelectedVersesLG() { ... }
```

or preferably a registry-based pattern:

```javascript
window.VerseBundles = {
  en: loadSelectedVerses,
  es: loadSelectedVersesES,
  lg: loadSelectedVersesLG
};
```

### Exit Criteria

- UI can select `lg`
- `game.js` can load verses through a generic path
- adding another language no longer requires another special-case branch

## Phase 2: Build A Luganda Locale File

### Goal

Translate the UI layer independently from verse content.

### Tasks

- copy `public/locales/en.json` to `public/locales/lg.json`
- translate:
  - menu strings
  - settings strings
  - review labels
  - VOTD labels
  - verse test labels
  - category display names
  - demon display names where appropriate
- review any English strings that are not yet routed through `I18n.t()`

### Risks

- some UI text may still be hardcoded in gameplay or overlay code
- short strings may need manual wording adjustments to fit the UI

### Exit Criteria

- menu and options screens are mostly Luganda
- core gameplay feedback strings render from `lg.json`

## Phase 3: Create A Luganda Verse Content Pipeline

### Goal

Produce a usable Luganda verse bundle with quiz content designed for Luganda wording.

### Important Principle

Do not rely on direct translation of English quiz prompts as the final product.

For Luganda quality, each verse entry should be validated or regenerated from the Luganda text itself.

### Tasks

- create `bible-verses-lg.js` or another Luganda bundle file
- define the initial verse subset for the pilot
- translate:
  - `Reference`
  - `Text`
- preserve internal `Category` keys in English
- generate Luganda quiz content:
  - `missingWord.question`
  - `missingWord.answer`
  - `missingWord.options`
  - any other localized prompt text
- decide how to handle `EnglishRef`
  - recommended: keep an `EnglishRef` field for cross-language mapping

### Recommended Data Shape

```javascript
{
  Id: 1,
  Category: "Faith",
  Reference: "Yokaana 3:16",
  EnglishRef: "John 3:16",
  Text: "...",
  quizData: {
    missingWord: { ... },
    categoryMatch: { ... },
    trueFalse: { ... }
  }
}
```

### Pilot Scope Recommendation

Start with:

- 5 to 10 categories
- 10 to 20 verses per category

Possible first categories:

- Faith
- Love
- Courage
- Wisdom
- Hope
- Healing

### Exit Criteria

- a Luganda verse bundle exists
- the bundle loads in game
- quizzes make sense in Luganda

## Phase 4: Introduce A Real Audio Abstraction

### Goal

Remove the assumption that verse audio always comes from one external English-style source.

### Current Problem

Audio resolution is coupled to:

- reference-to-filename conversion
- a fixed remote base URL
- English book-name assumptions

This is too rigid for multilingual audio.

### Tasks

- identify all verse-audio call sites
- create a shared audio lookup abstraction, for example:

```javascript
VerseAudioService.getAudioUrl({
  language: 'lg',
  reference: 'Yokaana 3:16',
  englishReference: 'John 3:16'
});
```

- allow language-specific audio catalogs
- support missing-audio fallback behavior

### Fallback Behavior

Recommended order:

1. Luganda audio if available
2. no audio
3. optional English fallback only if explicitly desired

Do not silently play English audio in Luganda mode unless that is a conscious UX choice.

### Exit Criteria

- review mode can ask for Luganda audio without hardcoded path logic
- VOTD and verse test can do the same

## Phase 5: Pilot Audio Production

### Goal

Ship a credible Luganda audio experience for the first verse pack.

### Recommended Approach

Use two parallel tracks:

- production track: human recordings for pilot verses
- R&D track: Luganda TTS experimentation

### Human Recording Track

Pros:

- highest trust
- best pronunciation control
- easiest church/school acceptance

Cons:

- slower to scale
- requires voice talent, QA, and editing

### Open-Source TTS Track

Most promising current path:

- Meta MMS Luganda model (`facebook/mms-tts-lug`)
- WaxalNLP Luganda TTS data and related fine-tunes

Pros:

- real Luganda model availability today
- can scale audio generation beyond pilot size

Cons:

- more engineering and ML operations work
- quality may vary
- inference hosting needs to be solved

### Managed API Track

Current vendor support appears weak for Luganda specifically.

Implication:

- managed cloud TTS should not be assumed as the primary Luganda production path

### Exit Criteria

- first Luganda verse pack has playable audio
- the team has evidence on whether TTS is good enough for expansion

## Phase 6: Quality Assurance

### Goal

Make sure the Luganda experience is educationally credible, not just technically functional.

### QA Areas

- UI wording accuracy
- Bible reference formatting consistency
- quiz clarity
- cloze answer quality
- first-letter test behavior on Luganda words and punctuation
- audio pronunciation
- mobile readability
- category labels
- school/church comprehension

### Required Reviewers

- native or highly fluent Luganda reviewer
- church/ministry reviewer
- school-use reviewer if targeting Christian schools

### Exit Criteria

- pilot content passes native review
- top issues are fixed before broad rollout

## Specific Engineering Worklist

### Files Likely To Change

- `index.html`
- `game.js`
- `src/client/i18n.js`
- `src/client/ReviewMode.js`
- `src/client/VerseTestScreen.js`
- `src/client/VotdLearningMode.js`

### Files Likely To Add

- `public/locales/lg.json`
- `bible-verses-lg.js`
- `src/client/VerseAudioService.js` or equivalent
- one or more scripts for Luganda verse generation / validation
- audio catalog files if audio becomes manifest-driven

## Research Summary For Implementation Decisions

### Bible Availability

Luganda Bible content is clearly available through organizations such as:

- Bible Society of Uganda
- YouVersion
- Digital Bible Society / Biblica ecosystem

However, availability does not equal app redistribution rights.

### Current TTS Landscape

Based on current documentation reviewed during planning:

- Google Cloud TTS: no clear Luganda support in official voice list
- Amazon Polly: no Luganda support
- Azure Speech: no Luganda locale found
- OpenAI TTS: Swahili listed, Luganda not explicitly listed
- ElevenLabs: Swahili listed, Luganda not clearly listed in mainstream model support
- Open-source path: Luganda support exists through Meta MMS and Waxal-related data/models

## Recommended Rollout Order

### Option A: Fastest Credible Uganda Pilot

1. Luganda UI
2. Luganda pilot verse pack
3. Human-recorded pilot audio
4. generalized language and audio architecture
5. school/church field test

### Option B: Architecture-First

1. generalize multilingual verse loading
2. generalize audio lookup
3. add Luganda locale
4. create Luganda pilot content
5. add audio

### Recommended Choice

Option B, but keep the content scope small enough to behave like a pilot.

## Open Questions

- Which Luganda Bible text can legally be embedded and redistributed in the game?
- Should pilot verses focus on schools, chaplaincy, or general discipleship first?
- Is human audio mandatory for trust, or acceptable only for phase 1?
- Do we want English fallback behavior when Luganda audio is missing?
- Should the first localized content target only one country-language pair, or also prepare for Runyankore / Swahili later?

## Suggested First Milestone

Define a milestone called:

`Uganda Luganda Pilot V1`

Suggested contents:

- `lg.json` UI localization
- generic verse bundle loader
- generic verse audio lookup
- 50 to 100 Luganda verses
- manually reviewed quiz data
- human or high-confidence Luganda audio for those verses
- one field-testable build for Uganda partners

## Outcome

If executed in this order, Luganda support becomes:

- technically extensible
- realistic to ship
- compatible with Uganda pilot feedback
- not blocked on full-library perfection

That is the right level of ambition for a first Uganda-specific localization effort.
