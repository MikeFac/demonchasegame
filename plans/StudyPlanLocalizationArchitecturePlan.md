# Study Plan Localization Architecture Plan

## Goal

Add a Bible study plan to Learn mode that sits next to the existing devotional flow.

The study plan should:

1. Be generated in English as the canonical source.
2. Be translated into the active locale for display.
3. Reuse the same caching, polling, and retry behavior as devotionals.
4. Feel like an application layer on top of the devotional, not a separate game system.

The study plan is meant to move the player from reading to reflection to application.

---

## Product Shape

The Learn screen should expose two actions:

- `Devotional`
- `Study Plan`

The devotional remains the short explanatory reading.
The study plan is a guided question flow that helps the user think through the verse and devotional.

The study plan should be created from:

- the verse text
- the verse reference
- the category
- the devotional text

That gives the generator enough context to ask focused, verse-specific questions instead of generic Bible study prompts.

---

## Why English First

The user-facing question set should be generated in English first, then translated into the local language.

This matches the current devotional architecture and avoids language drift.

Benefits:

- one canonical theological source
- one prompt to tune
- consistent question ordering across languages
- easier QA
- easier translation backfill later

The English plan should be the authoritative artifact.
Localized study plans should be derived artifacts, not independent source content.

---

## Current Flow To Reuse

The devotional pipeline already has a source-first pattern in:

- [src/server/services/DevotionalGenerationService.js](/home/michael/proj/dcgame/src/server/services/DevotionalGenerationService.js)
- [src/server/services/SermonService.js](/home/michael/proj/dcgame/src/server/services/SermonService.js)
- [src/server/routes/sermon.js](/home/michael/proj/dcgame/src/server/routes/sermon.js)

The current shape is:

1. Generate an English devotional source.
2. Translate that devotional into the requested language.
3. Return a pending or ready response to the client.

The study-plan feature should mirror this structure instead of inventing a new one.

---

## Content Model

The canonical English study plan should be structured, not free-form prose.

Recommended shape:

```json
{
  "title": "Study Plan",
  "summary": "Short English summary of the verse and devotional focus",
  "questions": [
    {
      "id": "what-does-it-say",
      "prompt": "What does this verse say?",
      "help": "Paraphrase the main idea in your own words."
    },
    {
      "id": "what-does-it-mean",
      "prompt": "What does this verse mean?",
      "help": "What is the author saying to the original audience?"
    },
    {
      "id": "about-god",
      "prompt": "What does this verse tell us about God?",
      "help": "Look for God's character, actions, or promises."
    },
    {
      "id": "about-people",
      "prompt": "What does this verse tell us about people?",
      "help": "Look for our condition, motives, or needs."
    },
    {
      "id": "command",
      "prompt": "Is there a command to obey?",
      "help": "Is there something to do, avoid, or practice?"
    },
    {
      "id": "promise",
      "prompt": "Is there a promise to believe?",
      "help": "Is there something God says He will do?"
    },
    {
      "id": "who-to-teach",
      "prompt": "Who can I teach this to in the next week?",
      "help": "Name one person or situation where you could share it."
    }
  ],
  "application": "One short action step for the next 7 days",
  "prayer": "Short closing prayer"
}
```

Notes:

- Keep the question list small and stable.
- Preserve the same `id` order across languages.
- Allow category-specific emphasis in the generated `help` text, but keep the main prompts consistent.
- Keep the `application` field short enough for mobile.

---

## Category Awareness

The generator should adjust emphasis based on the verse category.

Examples:

- `Promise` verses should lean into trust and belief.
- `Command` verses should lean into obedience and practice.
- `Prayer` verses should lean into dependence and prayerful response.
- `Wisdom` verses should lean into discernment and daily decision-making.
- `Love` verses should lean into relationships and service.

This should be guidance, not a category-specific prompt explosion.
The core question list should stay the same.

---

## Data Model

Use a source-plus-variant structure, matching the devotional architecture.

### Canonical source

Collection: `StudyPlanSource`

Fields:

- `verseReference`
- `sourceLang` (`'en'`)
- `verseText`
- `devotionalText`
- `category`
- `title`
- `summary`
- `questions`
- `application`
- `prayer`
- `generationStatus` (`pending`, `completed`, `failed`)
- `generationError`
- `model`
- `promptVersion`
- `createdAt`
- `updatedAt`

Indexes:

- unique on `verseReference + sourceLang`

### Localized variant

Collection: `StudyPlanVariant`

Fields:

- `verseReference`
- `lang`
- `sourceStudyPlanId`
- `verseText`
- `devotionalText`
- `title`
- `summary`
- `questions`
- `application`
- `prayer`
- `generationStatus` (`pending`, `completed`, `failed`)
- `generationError`
- `translationModel`
- `translationPromptVersion`
- `createdAt`
- `updatedAt`

Indexes:

- unique on `verseReference + lang`
- index on `sourceStudyPlanId`

---

## Generation Pipeline

### English source generation

Generate the study plan in English from:

- verse reference
- verse text
- category
- devotional text

The English generator should output structured JSON.

### Translation step

Translate the completed English study plan into the active language.

The translator should:

- preserve the question order
- preserve the question IDs
- preserve the application structure
- preserve the theological meaning
- localize the tone naturally

### Strict fallback behavior

If the English source does not exist yet:

- queue the English source first
- return pending to the client

If the source fails:

- the localized variant should fail with the source error context

This keeps the dependency chain deterministic.

---

## Service Layer

Add two new services to mirror the devotional service structure.

### `src/server/services/StudyPlanGenerationService.js`

Responsibilities:

- generate English study-plan JSON
- translate study plans into the active language
- validate the structured output
- enforce prompt versions

Suggested methods:

- `generateEnglishStudyPlan(verseReference, verseText, devotionalText, category)`
- `translateStudyPlanToLanguage(sourceDoc, verseText, devotionalText, lang)`

### `src/server/services/StudyPlanService.js`

Responsibilities:

- create or reuse pending source rows
- create or reuse pending variant rows
- trigger generation jobs
- dedupe in-flight requests
- expose a single `getOrGenerateStudyPlan(...)` entry point

Suggested methods:

- `getOrGenerateStudyPlan(verseReference, verseText, devotionalText, category, lang)`
- `regenerateStudyPlan(verseReference, verseText, devotionalText, category, lang)`

Implementation should follow the same pending/completed/failed lifecycle used by `SermonService`.

---

## API Shape

Add a study-plan endpoint alongside the devotional endpoint.

Recommended route:

- `GET /api/sermon/study-plan`

Alternative:

- `GET /api/study-plan`

The route should accept:

- `ref`
- `text`
- `category`
- `lang`
- `devotional`

Behavior:

1. Load or create the English source plan.
2. If the English plan is pending, return `202 pending`.
3. If the English plan is ready, load or create the localized variant.
4. If the localized variant is pending, return `202 pending`.
5. If the localized variant is ready, return the translated study plan JSON.

The route should return the same style of ready/pending/failed responses as the devotional endpoint.

---

## Client Flow

The Learn screen should present the study plan as a second action next to the devotional.

Suggested flow:

1. User opens a verse in Learn mode.
2. Devotional loads as today.
3. User taps `Study Plan`.
4. The app requests the study plan for the current verse and locale.
5. If pending, show the existing polling/loading treatment.
6. If ready, render the questions as a guided sequence.

Likely client touchpoints:

- [src/client/SermonViewer.js](/home/michael/proj/dcgame/src/client/SermonViewer.js)
- [src/client/VotdLearningMode.js](/home/michael/proj/dcgame/src/client/VotdLearningMode.js)
- [src/client/ReviewMode.js](/home/michael/proj/dcgame/src/client/ReviewMode.js)
- [game.js](/home/michael/proj/dcgame/game.js)

The goal is to keep the study plan discoverable without replacing the devotional flow.

---

## Prompt Strategy

### English source prompt

The English prompt should ask for a compact, structured study plan:

- short title
- short summary
- the fixed question list
- one application step
- one prayer

The prompt should explicitly forbid:

- adding extra questions
- changing the question order
- writing generic sermon prose instead of a study plan
- making the output long or academic

### Translation prompt

The translation prompt should instruct the model to:

- preserve all IDs
- preserve order
- preserve theology
- translate naturally into the target language
- keep the tone conversational and usable in a game UI

For Japanese and other non-English locales, the translated questions should still read like study prompts, not literal sentence-by-sentence machine output.

---

## UI Copy

Use short button labels:

- `Devotional`
- `Study Plan`

Potential screen labels:

- `Study Plan`
- `Reflect`
- `Think It Through`

Keep the question prompts concise.

Examples:

- `What does this verse say?`
- `What does this verse mean?`
- `What does this tell us about God?`
- `What does this tell us about people?`
- `Is there a command to obey?`
- `Is there a promise to believe?`
- `Who can I teach this to this week?`

---

## Storage And QA

Do not store the study plan inside the devotional document unless the codebase already requires that.

Preferred approach:

- separate source and variant records
- separate prompt versions
- separate regeneration path

That makes it possible to:

- update the study-plan prompt without touching devotionals
- translate study plans independently
- regenerate only broken localized variants

QA checklist:

- English source returns structured JSON
- translated plan preserves question order
- locale fallback behaves predictably
- pending states still poll cleanly
- failed source fails the localized variant too
- the UI does not hide or truncate the key application question

---

## Implementation Phases

### Phase 1

- Add the source/variant study-plan model
- Implement English generation
- Store and retrieve the English source

### Phase 2

- Add translation of the finished English plan
- Wire the locale-aware study-plan endpoint
- Reuse the devotional polling flow

### Phase 3

- Add the Learn-mode `Study Plan` button
- Render the question sequence in the client
- Add translations for the button and prompt labels

### Phase 4

- Add tests for English source generation
- Add tests for translation preservation
- Add smoke coverage in Learn mode

---

## Acceptance Criteria

- The study plan is generated in English first.
- The displayed study plan is translated into the selected locale.
- The question set is stable and verse-specific.
- The devotional and study plan are separate actions in Learn mode.
- The flow uses the same pending/ready/failed behavior as the devotional system.
- No existing devotional behavior regresses.

