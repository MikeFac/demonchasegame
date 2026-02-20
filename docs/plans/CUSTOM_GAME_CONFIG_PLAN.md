# Custom Game Configuration Plan

## Overview

Web-based UI for players to configure game balance, monsters, and content without authentication. Reduces friction for getting players to try the game.

## Core Principles

1. **No authentication** - Any visitor can create custom games
2. **Browser-based** - All config happens in the browser
3. **Shareable** - Export config as URL parameter or JSON file
4. **Spreadsheet-friendly** - Content upload via CSV/Excel

## User Flow

```
1. Player visits /config
2. Adjusts settings via forms
3. Clicks "Play with these settings"
4. Game launches with custom config stored in URL or localStorage
5. Can share URL with others to play same custom game
```

## Quiz Modes (6 total)

| Mode | Description | Settings Slider |
|------|-------------|-----------------|
| First Letter | Type first letters of 2 missing words | 0-100% |
| Missing Word | Fill in one missing word | 0-100% |
| Category Match | Pick correct category | 0-100% |
| True/False | Identify correct/incorrect claims | 0-100% |
| **Cloze** | Progressive fill-in-the-blank (NEW) | 0-100% |

~~Short Answer~~ - Dropped (doesn't work on mobiles)

## Cloze Quiz Mode

### How It Works

1. Shows verse with multiple blanks: `"You are my _____, the _____..."`
2. Player sees letter options (A-Z) for first blank
3. Selects correct first letter → word revealed, moves to next blank
4. One mistake → shows full answer, counts as incorrect
5. Complete all blanks → counts as correct

### Quiz Data Format

```javascript
quizData: {
    cloze: {
        question: "For God so _____ the world that he gave his _____...",
        answers: ["loved", "Son"]
    }
}
```

### Auto-Generation (if missing)

- Select 2 significant words (5+ chars, not stop words)
- Replace with blanks
- Store in answers array

## File Structure

```
dcgame/
├── config.html                    # NEW: Standalone config page
├── index.html                     # MODIFY: Add Custom Game button + Cloze slider
├── game.js                        # MODIFY: Read URL config, handle cloze
│
├── src/
│   ├── client/
│   │   ├── QuizManager.js         # MODIFY: Add cloze generation + handling
│   │   ├── Renderer.js            # MODIFY: Add drawClozeQuiz()
│   │   ├── InputHandler.js        # MODIFY: Add cloze letter click handling
│   │   ├── ConfigUI.js            # NEW: Form handling, validation
│   │   ├── ConfigImporter.js      # NEW: JSON/CSV parsing
│   │   └── ConfigEncoder.js       # NEW: URL encode/decode
│   │
│   └── shared/
│       ├── GameConfig.js          # MODIFY: Add cloze to defaults
│       └── QuizGenerator.js       # NEW: Auto-generate quiz data
│
└── libs/
    └── lz-string.min.js           # NEW: URL compression library
```

## CSV Format

```csv
Reference,Text,Category,ClozeQuestion,ClozeAnswers
John 3:16,For God so loved the world that he gave his one and only Son...,Love,,"loved|Son"
```

**Auto-generation for missing cloze:**
- Select 2 significant words (5+ chars, not stop words)
- Replace with blanks
- Store in answers array

**Verse limit:** 500 max

## Implementation Phases

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Phase 1** | Cloze Quiz Mode Integration | 5 |
| **Phase 2** | Config Infrastructure (config.html, URL encoding) | 2 |
| **Phase 3** | Balance Tab + Quiz Distribution (5 sliders) | 2 |
| **Phase 4** | Levels Tab | 3 |
| **Phase 5** | Content Tab + CSV/JSON upload + Auto-generate cloze | 3 |
| **Phase 6** | Export/Play functionality | 1-2 |
| **Phase 7** | Integration + Testing | 2 |
| **Total** | | **18-19 hours** |

## Config Object Structure

```javascript
{
  version: 1,  // For future compatibility
  
  // Game Balance
  balance: {
    monsterHealth: 1.0,      // 0.7 - 2.0
    monsterDamage: 1.0,      // 0.7 - 2.0
    monsterSpeed: 1.0,       // 0.7 - 2.0
    spawnRate: 1.0,          // 0.5 - 2.0
    maxMonsters: 1.0,        // 0.5 - 2.0
    healingFrequency: 1.0    // 0.5 - 2.0
  },
  
  // Per-Level Config
  levels: [
    {
      qualities: ["Faith", "Courage", "Knowledge"],
      monsters: ["Fear", "Ignorance", "Blindness", "Doubt", "Confusion"],
      monstersToKill: 15,
      maxMonsters: 25,
      spawnRate: 20000
    },
    // ... up to 5 levels
  ],
  
  // Content
  content: {
    source: "default",       // "default" | "custom"
    verses: []               // Only if custom, max 500
  }
}
```

## URL Sharing

Short URLs using LZ-String compression:

```
https://versebattles.com/?c=eyJkaWZmaWN1bHR5I...
```

## UI Entry Point

Add "Custom Game" button to main menu:

```
┌─────────────────────────┐
│   Start Solo Game       │
├─────────────────────────┤
│   ⚙️ Custom Game        │  ← NEW
├─────────────────────────┤
│   Multiplayer Game      │
├─────────────────────────┤
│   How to Play │ Options │
└─────────────────────────┘
```

## Decisions Made

1. **URL format**: Short (base64 encoded `?c=...`)
2. **CSV quiz data**: Optional, auto-generate if missing
3. **Max verses**: 500
4. **Menu placement**: Separate "Custom Game" button
5. **Cloze priority**: High (Phase 1)
6. **Short answer mode**: Dropped (doesn't work on mobile)
7. **Cloze auto-generation**: Simple word selection
