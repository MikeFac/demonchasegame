# Enhancement Proposal 2: Bible Category Skill Trees & Progression System

## Overview
Add a deep progression system where players "level up" individual Bible categories, unlocking perks that improve learning and gameplay.

## Core Concept

### Category Leveling
```
Each category (Love, Faith, Courage, etc.) has independent levels:

Level 1 (0-50 verses)   → Level 2 (51-150)   → Level 3 (151-300)
    ↓                         ↓                      ↓
   10% XP bonus        + 20% ammo drops        + Faster reload
   Novice badge        Proficient badge       Expert badge

Unlock: Basic quiz      Unlock: Expert mode    Unlock: Master mode
        1 category          Leaderboards         All verses

Max Level: 10 (1000+ verses learned per category)
```

### Tree Structure (Example: "Love" Category)

```
                    ┌─ ROMANCE ─┐
                    │   Unlock  │
                    │ love song │
                    │ playlist  │
                    └─────────────┘
                          ↑
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───────┐          ┌───────┐          ┌───────┐
    │ Lv 3  │          │ Lv 5  │          │ Lv 7  │
    │DEEPENS│          │ETERNAL│          │PERFECT│
    │+30%XP │          │+Shields│          │Win=+20%│
    └───────┘          └───────┘          └───────┘
        ↑                  ↑                  ↑
        └──────────────────┼──────────────────┘
                    ┌───────────┐
                    │  Lv 1: AGAPE
                    │ Love basics
                    │ +10% ammo
                    └───────────┘
```

## Skill Tree Details

### Tier 1 (Levels 1-3): Foundation
```
Name: AGAPE (Love in action)
├─ +10% ammo drops
├─ Verses 1-3 of category unlock
├─ Access to Love song playlist
└─ "Beginner" cosmetic title
```

### Tier 2 (Levels 4-6): Deepening
```
Name: DEEPENS (Love grows)
├─ +20% ammo drops
├─ Faster reload speed (+5%)
├─ Unlock "Love Quotes" feature (random verse reminder daily)
├─ Category leaderboard access
└─ "Proficient" cosmetic title
```

### Tier 3 (Levels 7-9): Mastery
```
Name: ETERNAL (Love perfected)
├─ +30% ammo drops
├─ +10% shield effectiveness
├─ Unlock "Love Deep Dive" mode (10 verses at once)
├─ Unlock love-themed cosmetics (heart effects, pink player skin)
└─ "Expert" cosmetic title
```

### Tier 4 (Level 10): Perfection
```
Name: PERFECT (Love mastered)
├─ +50% ammo drops
├─ Instant shield recharge on 5+ correct streak
├─ Unlock "Love Master" tournament mode
├─ Exclusive cosmetics (golden aura, special effects)
└─ "Master" cosmetic title + name badge
```

## Progression Mechanics

### XP Gain per Action
```
Event                          | XP Gain | Notes
-------------------------------|---------|----------------------------------
Correct answer                 | 10 XP   | Per verse in that category
Streak (5 consecutive correct) | 25 XP   | Bonus for momentum
Learning from song             | 15 XP   | + 5 XP if using verse song
Weekly challenge complete      | 100 XP  | Seasonal boost
Friend challenge win           | 50 XP   | Social engagement bonus
Perfect game (100% correct)    | 75 XP   | Encourages excellence
```

### Level Requirements
```
Level  | Total XP  | Time (casual) | Achievement
-------|-----------|---------------|------------------
1→2    | 200 XP    | ~1 hour       | First verses
2→3    | 400 XP    | ~2 hours      | Novice mastery
3→4    | 700 XP    | ~3-4 hours    | Foundation complete
4→5    | 1000 XP   | ~5 hours      | Category familiar
5→6    | 1300 XP   | ~6-7 hours    | High proficiency
6→7    | 1600 XP   | ~8 hours      | Expertise emerging
7→8    | 2000 XP   | ~10 hours     | True mastery
8→9    | 2500 XP   | ~12 hours     | Category expert
9→10   | 3000 XP   | ~15 hours     | Ultimate knowledge
```

### Category Skill Trees (All 22)
```
WISDOM          FAITH           JOY             LOVE
├─ Philosopher  ├─ Believer      ├─ Celebrant     ├─ Lover
├─ Scholar      ├─ Steadfast     ├─ Joyfull       ├─ Beloved
├─ Sage         ├─ Faithful      ├─ Radiant       ├─ Passionate
└─ Wisest       └─ Perfect       └─ Joyous        └─ Perfect

COURAGE         HEALING         FORGIVENESS     HOPE
├─ Brave        ├─ Comforter     ├─ Pardoner      ├─ Hopeful
├─ Bold         ├─ Healer        ├─ Merciful      ├─ Believing
├─ Fearless     ├─ Restorer      ├─ Gracious      ├─ Inspired
└─ Unshakeable  └─ Perfect       └─ Perfect       └─ Eternal

[...16 more categories]
```

## Learning Benefits

### Psychological Engagement
- **Clear progression**: See yourself improving visually
- **Milestone rewards**: Level-ups feel like achievements
- **Depth**: 22 skill trees means 22 separate journeys
- **Mastery feeling**: Ultimate goal (Level 10) feels worthy

### Retention Improvement
- **Spaced repetition**: Need more verses to advance
- **Category focus**: Encourages balanced learning (not just "Love")
- **Gameplay rewards**: Ammo/shields incentivize learning
- **Title prestige**: Show off expertise ("Master of Courage")

## Technical Implementation

### Database Schema
```
UserSkillTrees:
├─ userId
├─ categorySkillTrees: {
│    "Love": {
│      level: 5,
│      currentXP: 450/1000,
│      unlockedPerks: ["romance_music", "love_quotes"],
│      milestone: "DEEPENS",
│      versesLearned: 145,
│      dateFirstUnlocked: timestamp,
│      recentActivity: []
│    },
│    "Faith": {...},
│    ...22 total
├─ globalLevel: 25 (sum of all category levels)
└─ completionPercentage: 35% (how many max levels reached)
```

### API Endpoints
```
GET /api/skill-trees/user/:userId
GET /api/skill-trees/category/:category
GET /api/skill-trees/leaderboard/:category/:level
POST /api/skill-trees/claim-reward (claim perk on level-up)
GET /api/perks/unlocked (show active perks in HUD)
```

### UI Components

**Main Skill Tree View** (accessible from menu):
```
[WISDOM]  [FAITH]  [JOY]  [LOVE]  ... (22 tabs)

                    ┌─ Master ─┐
                    │  Lv 10   │
                    │ [LOCKED] │
                    └──────────┘
                         ↑
                    ┌─────────┐
                    │  Lv 9   │
                    │[LOCKED] │
                    └─────────┘
                         ↑
                    ┌─────────┐
                    │  Lv 5   │ ← You are here
                    │DEEPENS✓ │    450/1000 XP
                    └─────────┘    45% to next level

Reward: +20% ammo drops active
```

**HUD Progress** (top-left corner during game):
```
[Love Lv 5] ████░░░░░░ 45% [+10 XP]
```

**Category Selection Screen** (before game):
```
Categories by Level:
├─ Love          Lv 5 ████░░░░░░ [Master]
├─ Wisdom        Lv 3 ██░░░░░░░░ [Expert]
├─ Faith         Lv 1 █░░░░░░░░░ [Novice]
├─ Courage       Lv 0 ░░░░░░░░░░ [Start]
└─ ... (18 more)
```

## Perks System (Gameplay Benefits)

### Perk Types

**Ammo Perks**:
- +10% ammo drops (Lv 1)
- +20% ammo drops (Lv 4)
- +30% ammo drops (Lv 7)
- +50% ammo drops (Lv 10)

**Shield Perks**:
- +5% shield effectiveness (Lv 4)
- +10% shield effectiveness (Lv 7)
- Instant recharge on streak (Lv 10)

**Utility Perks**:
- Daily verse reminder (Lv 4)
- Category leaderboard (Lv 4)
- Expert quiz mode (Lv 7)
- Master tournament mode (Lv 10)

**Cosmetic Perks** (purely visual):
- Title: "Novice" (Lv 1), "Proficient" (Lv 4), "Expert" (Lv 7), "Master" (Lv 10)
- Color theme (purple for Lv 1, gold for Lv 10)
- Special effects (particles on correct answers)
- Name badge (category mastered)

## Engagement Loop

```
Day 1:  Player starts Love category (Lv 0)
        Learn 5 verses → +50 XP → Still Lv 0

Day 2:  Play again, get +50 XP → Still Lv 0
        Frustration: "When do I level?"

Day 3:  Reach 200 XP → DING! Lv 1 achieved!
        ✓ Unlock "AGAPE" perk: +10% ammo
        ✓ See new skill tree path opening
        ✓ Want to reach Lv 2 (20% ammo) → Intrinsic motivation

Week 1: Reach Lv 3 → Feels like real achievement
        Share: "Just reached Proficient in Love!"

Month 1: Lv 5 achieved → "Expert" title earned
         Deciding: "Should I master Love or focus on Courage?"
         → Variety keeps game fresh

Month 3: Reached 5 categories at max level
         Seeing path to "Master of All" → Long-term goal
```

## Balancing Concerns

### Avoid "Pay-to-Win"
- ✅ All perks earned through learning
- ✅ Premium cosmetics only (no gameplay advantage)
- ✅ No "double XP" for paid users

### Avoid "Grind Feel"
- ✅ XP gains meaningful (visible progress)
- ✅ Milestones frequent (level-up every 1-2 hours)
- ✅ Alternative paths (learn slowly or intensively)

### Avoid "Overwhelming"
- ✅ Focus on 1-2 categories initially
- ✅ Category tabs hide unstarted trees
- ✅ Clear path to next milestone

## Analytics & Iteration

### Metrics to Track
1. **Progression**: Average level per category, max level reached
2. **Engagement**: Time between level-ups, category switching frequency
3. **Retention**: Users returning after reaching Lv 5 (engagement inflection point)
4. **Balance**: Do all categories feel equally rewarding?

### Feedback Loop
- Month 1: Monitor if progression pace feels right
- Month 2: Adjust XP requirements if needed
- Month 3: Analyze category balance (are some too easy?)
- Month 4+: Add new perks or cosmetics based on feedback

## Conclusion

Skill trees create **visible, meaningful progression** that turns random Bible learning into a **structured journey**. Each category becomes a separate achievement path, encouraging players to explore all of Scripture while staying engaged for months.

**Estimated Implementation**: 2-3 weeks
**Expected Impact**: 50% increase in session length, 3x increase in total verses learned
