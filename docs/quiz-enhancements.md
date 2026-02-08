# Quiz Enhancements: 4 Gameplay Modes

We are enhancing the core gameplay loop by introducing variety in the quiz mechanics. Currently, the game only supports "First Letter" matching. We will expand this to 4 distinct modes that can be selected randomly or by difficulty level.

## 1. First Letter (Existing)
**Objective**: Build muscle memory for verse recitation.
*   **Prompt**: The full verse text with a missing phrase (e.g., "For God so _____ the world").
*   **Options**: 4 Buttons showing the *First Letters* of the missing words (e.g., "L T", "H T", "J T", "L A").
*   **Difficulty**: Hard (Requires knowing the exact words).

## 2. Missing Word (Cloze Deletion)
**Objective**: Contextual understanding and key word recall.
*   **Prompt**: The verse text with a single key word blanked out (e.g., "For God so [_____] the world").
*   **Options**: 4 Buttons with word choices (e.g., "loved", "hated", "judged", "created").
*   **Difficulty**: Medium.

## 3. Category Match
**Objective**: Thematic association.
*   **Prompt**: The full verse text is displayed (e.g., "For God so loved the world...").
*   **Question**: "Which category does this verse belong to?"
*   **Options**: 4 Category names (e.g., "Love", "Faith", "Hope", "Warfare").
*   **Difficulty**: Easy/Medium.

## 4. True / False
**Objective**: Speed and rapid verification.
*   **Prompt**: A verse text paired with a Category or Reference.
    *   *Example A*: "For God so loved..." - **Category: Warfare**?
    *   *Example B*: "For God so loved..." - **Reference: John 3:16**?
*   **Options**: 2 Buttons: **TRUE** / **FALSE**.
*   **Difficulty**: Easy (Speed Round).

---

## Technical Implementation

### Data Structures
We do not need to radically change the database. Most distractions can be generated dynamically:
*   **Category Match**: Pick 3 random categories from `ALL_QUALITIES` as distractors.
*   **Missing Word**: Requires pre-processing or real-time NLP to pick a "significant" word (not "the", "and") and generate plausible antonyms/synonyms (or just random words from other verses).
*   **True/False**: 50% chance to pick the correct metadata, 50% chance to pick a random one.

### Class Structure (`QuizManager.js`)

We will update `generateQuiz(verse)` to return a standardized `Quiz` object:

```javascript
{
    mode: "missing_word", // or "first_letter", "category", "true_false"
    prompt: "For God so [_____] the world",
    options: [
        { text: "loved", isCorrect: true },
        { text: "hated", isCorrect: false },
        { text: "seen", isCorrect: false },
        { text: "sold", isCorrect: false }
    ]
}
```

### Renderer Updates (`Renderer.js`)
The `drawQuiz` function needs to be generic:
*   Render the `prompt` text.
*   Loop through `options` to draw 2, 3, or 4 buttons.
*   Handle button clicks based on the index.
