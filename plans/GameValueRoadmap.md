# Game Value Roadmap

## Purpose

This document ranks the next improvements most likely to add real value to VerseBattles.

The focus is not "more features" in the abstract. The focus is:

- better first-session conversion
- better long-term memorization outcomes
- better retention and return behavior
- better mobile distribution and social spread
- better use of systems that already exist in the codebase

## Current Read

The game already has substantial depth:

- procedural combat and multiple map styles
- multiple quiz modes
- missions and chapter progression
- review / learn flows
- verse-song support
- verse of the day
- multiplayer rooms
- analytics hooks
- sync-ready progress architecture

Because of that, the highest-value next work is not another isolated game mechanic. The best gains now come from tightening the loop between:

1. first-time understanding
2. repeated learning
3. daily return
4. easy sharing

## Prioritization Method

Each item below is ranked using:

- `Impact`: expected effect on retention, learning, or growth
- `Effort`: rough implementation cost
- `Strategic Value`: how much it strengthens the core identity of the game

## Tier 1: Highest-Value Next Bets

### 1. Adaptive Mastery and Review Queue

**Priority:** Critical  
**Impact:** Very High  
**Effort:** Medium  
**Strategic Value:** Very High

#### Why this matters

This is the clearest step from "fun scripture game" to "serious memorization platform."

The game already contains:

- progress persistence
- review flows
- multiple quiz modes
- missions
- verse-song reinforcement

What is missing is a clear memory system that decides:

- what the player should review now
- what is nearly mastered
- what is decaying
- what should be introduced next

#### Player-facing outcome

Instead of random or loosely guided repetition, players get:

- `Due now` reviews
- `Almost mastered` verses
- `New verse recommended`
- `Strengthen weak category` prompts

#### Suggested scope

- add per-verse mastery state
- add review scheduling based on correctness and confidence proxy
- add a home-screen "Continue Learning" CTA
- add a small dashboard showing `Learning`, `Review Due`, `Mastered`
- feed mission rewards into mastery progression instead of only XP

#### Why now

This compounds almost every current feature:

- missions become more meaningful
- review mode becomes more useful
- songs gain measurable learning value
- analytics become more actionable

---

### 2. Strong FTUE and Scripted First Win

**Priority:** Critical  
**Impact:** Very High  
**Effort:** Low to Medium  
**Strategic Value:** Very High

#### Why this matters

If new players do not understand the loop in the first 30 to 120 seconds, deeper progression systems do not matter.

The most important job of the early game is to make these ideas obvious:

- movement matters
- answering correctly powers combat
- defeating demons is satisfying
- healing and progress are understandable

#### Player-facing outcome

A new player should experience:

1. one clear movement prompt
2. one controlled enemy
3. one easy question
4. one powerful hit
5. one visible reward
6. one strong prompt to continue

#### Suggested scope

- add first-run onboarding flags by mode
- create a scripted opening encounter
- show one prompt at a time
- make the first correct answer visually and audibly dramatic
- end with a clear branch: `Play mission`, `Review verse`, or `Daily verse`

#### Why now

This is likely the fastest route to better conversion and lower bounce.

---

### 3. Mobile-First Session Design

**Priority:** High  
**Impact:** Very High  
**Effort:** Medium  
**Strategic Value:** High

#### Why this matters

This game is unusually well-suited to mobile distribution:

- short sessions
- simple shareable concept
- link-based access
- scripture content that works well in bite-sized repetition

Basic mobile compatibility is not enough. The experience should feel built for phones.

#### Player-facing outcome

- one-thumb friendly controls
- larger answer buttons
- fast resume into the last learning task
- installable PWA behavior
- smoother portrait layout
- easy post-session sharing

#### Suggested scope

- complete touch and responsive UI work
- optimize canvas/UI layout for portrait phones first
- add resume state on return
- add install prompts at the right moment, not on first load
- reduce friction between share link and gameplay start

#### Why now

Mobile multiplies the value of social sharing, daily verse usage, and streak mechanics.

## Tier 2: Strong Retention and Social Multipliers

### 4. Lightweight Social Competition

**Priority:** High  
**Impact:** High  
**Effort:** Medium  
**Strategic Value:** High

#### Why this matters

Full cooperative multiplayer is expensive. Lightweight competition gives much of the retention benefit sooner.

#### Better first version than full co-op

- weekly challenge ladders
- category leaderboards
- friend challenge links
- "beat my score on these 5 verses"
- streak comparison cards

#### Player-facing outcome

Players get a reason to return and a reason to invite someone else without needing to coordinate live sessions.

#### Suggested scope

- weekly challenge object and reset logic
- simple leaderboard buckets
- shareable challenge URLs
- post-run summary cards that can be shared

#### Why now

This builds on existing analytics, rooms, and sharing without requiring a full group system first.

---

### 5. Category Mastery and Cosmetic Progression

**Priority:** High  
**Impact:** High  
**Effort:** Medium  
**Strategic Value:** High

#### Why this matters

Players need visible long-horizon progress. The best version is not raw power creep. It is mastery, identity, and status.

#### Player-facing outcome

- category mastery meters
- titles such as `Faith Apprentice` or `Wisdom Keeper`
- cosmetic unlocks tied to learning milestones
- visible completion map across categories

#### Suggested scope

- create a mastery model per category
- tie mission/review performance into mastery
- unlock cosmetic frames, badges, or HUD accents
- add a profile screen showing category coverage

#### Why now

This gives the game a durable meta loop without distracting from scripture memorization.

---

### 6. Better Post-Mission Reflection

**Priority:** Medium-High  
**Impact:** High  
**Effort:** Low to Medium  
**Strategic Value:** High

#### Why this matters

A mission completion screen should not only say "you won." It should clarify what was actually learned.

#### Player-facing outcome

After a run, the player sees:

- verses strengthened
- verses missed
- category accuracy
- what is due for review next
- one-tap actions: `Review now`, `Replay`, `Save for later`

#### Suggested scope

- add a learning summary layer after missions
- highlight one verse as the key takeaway
- show whether mastery increased
- prompt immediate review while memory is fresh

#### Why now

This is relatively cheap and makes missions feel educational, not just arcade-like.

## Tier 3: Product Expansion Bets

### 7. Daily Habit Loop: Streaks, Return Rewards, and Daily Assignments

**Priority:** Medium-High  
**Impact:** High  
**Effort:** Low to Medium  
**Strategic Value:** Medium-High

#### Why this matters

If the game wants daily use, it needs a compact and emotionally legible return loop.

#### Better version of this feature

Not just a streak counter. Pair it with meaningful learning structure:

- `3 reviews due today`
- `1 new verse available`
- `Daily verse active`
- `Weekly challenge progress`

#### Suggested scope

- streak count with forgiving recovery rules
- small daily reward layer
- daily assignment card
- "return after absence" recovery messaging

#### Why not Tier 1

This helps retention, but it works much better after adaptive review and onboarding are improved.

---

### 8. Church and Group Study Mode

**Priority:** Medium  
**Impact:** High  
**Effort:** Medium to High  
**Strategic Value:** Very High

#### Why this matters

This opens a distinct institutional use case:

- churches
- youth groups
- schools
- Bible studies

#### Best first version

Not full live synchronized co-op. Start with:

- leader-created study sessions
- shared verse packs
- room codes
- group challenge summaries
- projector-friendly recap screens

#### Player-facing outcome

The game becomes usable as a group learning tool, not only a solo app.

#### Why later

This is valuable, but it should build on a stronger solo retention loop first.

---

### 9. Content Authoring and Admin Tools

**Priority:** Medium  
**Impact:** Medium-High  
**Effort:** Medium  
**Strategic Value:** High

#### Why this matters

More content systems are arriving:

- verse songs
- discipleship missions
- multiple packs
- future custom worlds

Manual content operations will become the bottleneck.

#### Suggested scope

- internal admin UI for verse pack management
- song quality review and archive flow
- featured content curation
- mission authoring and preview tooling

#### Why later

This improves team speed more than player value in the immediate term, but it becomes increasingly important as content volume rises.

## Tier 4: Enablers That Increase the Value of Everything Else

### 10. Learning Funnel Analytics and Experimentation

**Priority:** High  
**Impact:** Indirect but Very High  
**Effort:** Low to Medium  
**Strategic Value:** Very High

#### Why this matters

The current event layer is useful, but the most important product questions still need clearer answers.

#### Questions the product should answer quickly

- what percentage of new users move within 10 seconds?
- what percentage answer the first quiz?
- what percentage get a first kill?
- which quiz modes correlate with return after 1 day and 7 days?
- do verse songs improve later recall or only same-session delight?
- where do mobile players bounce?

#### Suggested scope

- define a canonical FTUE funnel
- define a canonical learning funnel
- instrument mission completion to review follow-through
- add experiment flags for onboarding and review variations
- create one simple weekly product report

#### Why this matters even without new UI

This prevents wasted effort and makes roadmap decisions evidence-based.

---

### 11. Resume and Personal Recommendation Layer

**Priority:** Medium-High  
**Impact:** High  
**Effort:** Low to Medium  
**Strategic Value:** High

#### Why this matters

When a returning player opens the game, the product should know what to suggest next.

#### Player-facing outcome

Instead of landing in a generic menu, the player sees:

- `Resume mission`
- `3 verses due for review`
- `Continue learning Courage`
- `Today's verse is ready`

#### Suggested scope

- add last-active task tracking
- add recommendation ranking rules
- expose one primary CTA and two secondary CTAs on return

#### Why now

This is a low-cost bridge between current systems and a more personalized product.

## Recommended Roadmap

### Next 2 Weeks

- scripted FTUE and first-win onboarding
- adaptive review data model
- resume / continue-learning entry point
- core analytics funnel definition

### Next 4 to 6 Weeks

- full adaptive review queue and mastery UI
- mobile-first UI pass
- post-mission reflection summaries
- lightweight weekly challenges

### Next 2 to 3 Months

- category mastery cosmetics and profile
- streaks and daily assignment loop
- church / leader session prototype
- content admin tooling

## Recommended Order of Execution

1. Fix first-session clarity.
2. Make repeat learning smarter.
3. Make return behavior easier.
4. Make mobile sessions feel native.
5. Add social pressure and identity loops.
6. Expand to group and institutional use cases.

## What Not to Prioritize Yet

These may still be good ideas, but they should not displace the roadmap above:

- more enemy variety without stronger retention systems
- large-scale lore or narrative writing
- visually ambitious but low-utility UI overhauls
- complex real-time co-op before lightweight social competition works
- major content expansion before the learning loop is measurably stronger

## Summary

If only three things are funded next, they should be:

1. adaptive mastery and review
2. first-session onboarding and first-win clarity
3. mobile-first session design

Those three improvements most directly strengthen the product's core promise:

`learn scripture effectively through a game people actually want to return to`
