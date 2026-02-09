# Enhancement Proposal 5: Spaced Repetition & Adaptive Difficulty

## Overview
Implement scientific spaced repetition (Leitner system) to optimize verse learning based on individual memory decay curves, automatically adjusting difficulty to maximize retention.

## The Problem

### Current System Issue
```
Players see random verses:
├─ Recently learned: "John 3:16" (already know it)
├─ Hard verse: "Revelation 22:13" (forget it repeatedly)
├─ Medium verse: "Romans 12:2" (learning)
└─ Too unpredictable → Learning efficiency poor
```

### Learning Science Background
```
Forgetting Curve (Ebbinghaus):
├─ After 1 hour: 50% memory
├─ After 1 day: 30% memory
├─ After 1 week: 15% memory
└─ UNLESS reviewed → Resets curve

Solution: Spaced Repetition
├─ Review day 1 (embed in memory)
├─ Review day 3 (prevent decay)
├─ Review day 7 (solidify)
├─ Review day 14 (long-term storage)
├─ Review day 30 (permanent storage)
└─ With each review, next review pushed back further
```

## Spaced Repetition System

### Leitner Box Implementation

```
Each verse moves through "boxes" based on performance:

BOX 1 (Learning)  →  BOX 2 (Familiar)  →  BOX 3 (Mastered)  →  BOX 4 (Expert)
    ↓                      ↓                      ↓                    ↓
Today             Every 3 days          Every 7 days           Every 30 days
+ Show daily      + Show frequently     + Show monthly         + Show rarely
+ High frequency  + Lower frequency     + Confidence building  + Maintenance

Movement Rules:
├─ Correct answer (3x in a row) → Move up one box
├─ Wrong answer → Move back to Box 1
├─ Stay in box until threshold reached
└─ Box 4 verses only shown on "review" days

Visual Representation:
User sees verse categories progress:
┌─────────────────────────────────────────┐
│ Love Category Progress:                 │
├─────────────────────────────────────────┤
│ Box 1 (Learning): 12 verses             │
│ Box 2 (Familiar): 28 verses             │
│ Box 3 (Mastered): 45 verses             │
│ Box 4 (Expert): 15 verses               │
├─────────────────────────────────────────┤
│ Total Learned: 100 verses               │
│ Review Score: 92% accuracy              │
└─────────────────────────────────────────┘
```

## Intelligent Verse Selection Algorithm

### Current (Random)
```
Game starts: Select 10 verses randomly
Result: Mix of easy/hard → Inconsistent difficulty
```

### Proposed (Smart)
```
Game starts: Assess skill level
├─ If new player: 70% Box 1 + 30% Box 2 (easier)
├─ If intermediate: 40% Box 1 + 40% Box 2 + 20% Box 3 (balanced)
├─ If advanced: 20% Box 1 + 30% Box 2 + 30% Box 3 + 20% Box 4 (hard)

Then, within game:
├─ If player doing well (>80% correct): Increase difficulty
├─ If player struggling (<50% correct): Decrease difficulty
├─ If perfect (100%): Add Box 4 verses
└─ Auto-difficulty creates optimal challenge zone

Performance-Based Adjustments:
├─ Excellent (90%+): Next game 80% Box 2+ / 20% Box 1
├─ Good (70-89%): Next game 50% Box 1 / 50% Box 2-3
├─ Average (50-69%): Next game 70% Box 1 / 30% Box 2
├─ Poor (<50%): Next game 100% Box 1 (build confidence)
└─ Resets after 3+ sessions with same pattern
```

## Adaptive Difficulty (Real-Time)

### In-Game Adjustment
```
During a game (10 verses):

Verses 1-3: Player gets 3/3 correct ✓✓✓
├─ System notes: "Player confident"
├─ Verses 4-10 should be harder

Verses 4-6: Introduce Box 3 verses
├─ Player gets 2/3 correct ✓✓✗
├─ System notes: "Good but challenging"
├─ Continue Box 3 level

Verses 7-10: If continuing strong, add Box 4 verse
├─ Final accuracy: 8/10 = 80%
└─ Next game: Same difficulty level (80% is optimal)

Goal: Keep player in "flow state"
├─ Not too easy (boring)
├─ Not too hard (frustrating)
├─ 70-80% success = optimal learning zone
```

### Difficulty Indicators (HUD)

```
Show player the difficulty level:
├─ "Current Difficulty: Medium 🟡"
├─ Verses remaining in category
├─ "Box" of current verse (Shows learning path)
├─ Estimated mastery %: "Love: 75% Mastered"

After game:
├─ "Difficulty adjusted: Was Medium, now Hard ⬆️"
├─ "Verses promoted: 3 moved to Familiar"
├─ "Next review: John 3:16 due in 3 days"
└─ "You're 92% accurate in Love category!"
```

## Review Days & Maintenance

### Automatic Spaced Review Schedule

```
Players see calendar:

This Week:
├─ Monday: Learn new verses (Box 1)
├─ Tuesday: Review familiar verses (Box 2)
├─ Wednesday: Learn new verses (Box 1)
├─ Thursday: Review recently-mastered (Box 3)
├─ Friday: Learn new verses (Box 1)
├─ Saturday: General review (all boxes)
└─ Sunday: Expert maintenance (Box 4)

Example: "John 3:16 Learning Path"
├─ First play: Correct ✓ (Box 1)
├─ 1 day later: Review required
├─ Second play: Correct ✓ (Box 1 → Box 2)
├─ 3 days later: Due for review
├─ Third play: Correct ✓ (Box 2 → Box 3)
├─ 7 days later: Due for review
├─ Fourth play: Correct ✓ (Box 3 → Box 4)
├─ 30 days later: Maintenance (stays in Box 4)
└─ Total to mastery: ~6 weeks with regular play
```

## Technical Implementation

### Database Schema

```
VerseBox (extends VerseSong):
├─ userId, verseReference
├─ currentBox: 1-4
├─ lastReviewedDate: Date
├─ nextReviewDate: Date
├─ correctCount: number (for promotion)
├─ incorrectCount: number (for demotion)
├─ accuracyRate: number (0-1)
├─ daysSinceLearned: number
├─ reviewHistory: [
│    { date, correct, rttl: 3 (days until next) }
│  ]
├─ easyFactor: number (Sm-2 algorithm value)
├─ interval: number (days until next review)
└─ lastPromotionDate: Date

UserAdaptiveStats:
├─ userId
├─ optimalDifficulty: 'easy' | 'medium' | 'hard'
├─ sessionAccuracy: number (rolling average)
├─ recommendedBoxMix: { box1: 0.7, box2: 0.3, ... }
├─ learningVelocity: number (verses per week)
└─ memoryStrength: number (1-100, aggregate)
```

### SM-2 Algorithm (SuperMemo-2)

```javascript
// Professional spaced repetition algorithm
function calculateNextReview(quality, easyFactor, interval) {
  // quality: 0-5 (0=complete failure, 5=perfect)
  // easyFactor: starts at 2.5, adjusted based on performance

  let newEasyFactor = easyFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEasyFactor = Math.max(1.3, newEasyFactor);

  let newInterval;
  if (interval === 0) {
    newInterval = 1;
  } else if (interval === 1) {
    newInterval = 3;
  } else {
    newInterval = Math.round(interval * newEasyFactor);
  }

  return { newEasyFactor, newInterval };
}

// Example: John 3:16
let verse = {
  easyFactor: 2.5,
  interval: 0
};

// First review (perfect answer, quality=5)
let result1 = calculateNextReview(5, 2.5, 0);
// → newInterval: 1 day, easyFactor: 2.6

// Second review after 1 day (near-perfect, quality=4)
let result2 = calculateNextReview(4, 2.6, 1);
// → newInterval: 3 days (1 * 2.6), easyFactor: 2.5

// Third review after 3 days (perfect, quality=5)
let result3 = calculateNextReview(5, 2.5, 3);
// → newInterval: 8 days (3 * 2.5), easyFactor: 2.6

// Fourth review after 8 days (forgot, quality=2)
let result4 = calculateNextReview(2, 2.6, 8);
// → newInterval: 1 day (back to Box 1), easyFactor: 2.1

// Result: Long intervals for easy verses, short for hard ones
```

### API Endpoints

```
GET /api/spaced-repetition/status
→ Returns: { box1Count, box2Count, box3Count, box4Count, accuracy }

GET /api/spaced-repetition/next-verses?difficulty=medium&count=10
→ Returns: 10 verses optimized for current level

POST /api/spaced-repetition/review/:verseId
→ Request: { quality: 0-5, timeTaken: ms }
→ Returns: { boxMoved, nextReviewIn: days, newAccuracy }

GET /api/spaced-repetition/review-schedule
→ Returns: { dueToday: [verses], dueThisWeek: [verses], ... }

GET /api/spaced-repetition/learning-curve/:category
→ Returns: { box1%, box2%, box3%, box4%, estimatedMasteryDate }
```

## Learning Benefits

### Science-Backed Improvement
```
Without Spaced Repetition:
├─ 7-day retention: 15% (forgetting curve)
├─ 30-day retention: 3%
└─ Verses stick if only reviewed randomly

With Spaced Repetition:
├─ 7-day retention: 85% (with reviews)
├─ 30-day retention: 70%
├─ Verses become permanent memory
└─ 5-10x more effective learning
```

### Psychological Benefits
- **Confidence**: See verses progressing through boxes (visual progress)
- **Autonomy**: Choose difficulty (player control)
- **Competence**: Optimal challenge keeps player in flow zone
- **Variety**: Different verses each session (not repetitive)

### Time Efficiency
```
Traditional Random Learning:
├─ 1 hour study → Learn 10 verses
├─ 7 days later → Remember 1-2 verses (80% forgotten)
└─ Total time wasted: 40+ hours to memorize 100 verses

With Spaced Repetition:
├─ 1 hour study → Learn 10 verses
├─ Follow review schedule (3 days = 15 min, 7 days = 15 min)
├─ 7 days later → Remember 8-9 verses (20% forgotten)
└─ Total time: 12 hours to memorize 100 verses
```

## UI Components

### Main Screen: Learning Dashboard

```
┌─────────────────────────────────────────┐
│        LEARNING DASHBOARD               │
├─────────────────────────────────────────┤
│ Today's Review Schedule:                │
│ ├─ Box 1 (New): 5 verses ready         │
│ ├─ Box 2 (Due): 8 verses due today     │
│ └─ Box 3 (Review): 3 verses ready      │
│                                         │
│ Total: 16 verses to review today       │
│                                         │
│ [Play Today's Session] ▶               │
├─────────────────────────────────────────┤
│ Category Progress:                      │
│ Love:     ██████░░░░ 67% mastered      │
│ Wisdom:   ████░░░░░░ 42% mastered      │
│ Faith:    ███░░░░░░░ 31% mastered      │
│ Courage:  █░░░░░░░░░ 8% mastered       │
└─────────────────────────────────────────┘
```

### During Game: Verse Information

```
Current Verse: John 3:16

This is your:
├─ 1st time learning this verse
├─ Part of "Love" category
├─ Currently in: Box 1 (Learning)
└─ Next review: Tomorrow

Category Mastery: 67% complete
```

### After Game: Review Results

```
Game Complete!

John 3:16 (Love):
├─ Your answer: Correct ✓
├─ Promoted: Box 1 → Box 2
├─ Next review: In 3 days
└─ Your accuracy in Love: 73%

Proverbs 22:6 (Wisdom):
├─ Your answer: Wrong ✗
├─ Demoted: Box 2 → Box 1
├─ Next review: Tomorrow
└─ Tips: Focus on key words

Overall Session:
├─ Accuracy: 8/10 = 80% ✓ (Optimal!)
├─ Difficulty next time: Same
├─ New verses mastered: 2
└─ Total mastered (all-time): 234
```

## Gamification Integration

### Spaced Repetition Achievements

```
Badges earned:
├─ "First Master" → Complete Box 4 for first verse
├─ "Perfect Memory" → 30 days in Box 4 without error
├─ "Speedster" → Master 5 verses in one week
├─ "Dedicated" → Daily reviews for 30 days
├─ "Resilient" → Get back to Box 2 after failing
└─ "Scholar" → Master 50+ verses across all categories

Streaks:
├─ Review Streak: "23-day review streak 🔥"
├─ Perfect Day: "Got every review correct today"
└─ Box 4 Champion: "Currently maintaining 12 expert verses"
```

## Phased Rollout

### Phase 1 (Week 1): Basic Spaced Repetition
- Implement 4-box system
- Auto schedule reviews
- Database tracking

### Phase 2 (Week 2): Adaptive Difficulty
- Real-time difficulty adjustment
- SM-2 algorithm
- Performance tracking

### Phase 3 (Week 3): Smart Selection
- Intelligent verse selection per session
- Optimal challenge zone
- Difficulty indicator UI

### Phase 4 (Week 4+): Advanced Features
- Learning curves/projections
- Detailed analytics
- Community comparisons

## Success Metrics

### Learning Effectiveness
- **Retention Rate**: 80%+ for Box 2+, 90%+ for Box 4
- **Mastery Time**: Average 6 weeks to Box 4 per verse
- **Verses Retained**: 80%+ of learned verses retained 1 year later

### Engagement
- Session accuracy: 70-80% (flow zone maintained)
- Session length: 15-30 min (optimal practice duration)
- Daily engagement: 60% play on review-required days

### User Satisfaction
- "Learning feels efficient" rating: 4.5+/5
- "I'm improving" rating: 4.7+/5
- Feature usage: 70%+ use scheduled reviews

## Conclusion

Spaced repetition isn't new—it's been used in education for 100+ years. By implementing SM-2 algorithm with adaptive difficulty, dcgame transforms from random practice into **scientifically optimized learning**. Players study smarter, not harder, and verses become permanent memory rather than temporary.

**Estimated Implementation**: 2-3 weeks
**Expected Impact**:
- 10x improvement in retention rate
- 50% reduction in study time needed
- 90%+ mastery rate vs 30% baseline
