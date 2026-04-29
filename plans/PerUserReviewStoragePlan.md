# Per-User Review Storage Plan

## Goal

Move from:
- one shared browser progress blob
- one shared sync queue
- simple learned-verse tracking

To:
- per-user local progress records
- per-user sync queues
- per-verse spaced-review records
- due/overdue review selection

This should be done before deeper review UX work so the scheduler is built on the correct identity model.

## Primary Files

- `src/client/ProgressManager.js`
- `src/client/SyncManager.js`
- `src/client/ReviewMode.js`
- `game.js`

## New Files Recommended

- `src/client/ReviewScheduler.js`
- `src/client/ReviewSelectors.js`

## Phase 1: User-Scoped Local Storage

Replace fixed storage keys with identity-aware keys.

Progress keys:
- guest: `missionProgress:guest`
- signed in: `missionProgress:user:<clerkId>`

Sync queue keys:
- guest: `syncQueue:guest`
- signed in: `syncQueue:user:<clerkId>`

Identity source:
- use authenticated Clerk user id when available
- fallback to guest

## Phase 2: Progress Switching On Auth Change

`ProgressManager` should support reloading when auth identity changes.

Behavior:
- on app boot, load guest progress unless auth is already known
- on sign-in, switch to `user:<clerkId>`
- on sign-out, switch back to guest

## Phase 3: Guest Import / Merge Policy

One-time import path so existing guest progress is not lost.

Rule:
- if user-scoped progress does not exist yet
- and guest progress does exist
- import guest progress into the user record once

Track import metadata in progress:

```js
migrationMeta: {
  importedGuestAt: "...",
  importedFromGuest: true
}
```

Do not merge guest into user on every login.

Merge policy:
- `completedMissions`: union
- `unlockedWorlds`: union
- `missionStars`: max per mission
- `totalXP`: recommend `max`
- `versesLearned`: union
- later `verseProgress.byRef`: merge per verse using the most advanced review state

## Phase 4: Progress Schema V2

New shape:

```js
{
  schemaVersion: 2,
  completedMissions: [],
  currentWorldId: 'chapter1',
  unlockedWorlds: ['chapter1'],
  missionStars: {},
  totalXP: 0,
  versesLearned: [],
  verseProgress: {
    byRef: {}
  },
  reviewStats: {
    dueCount: 0,
    overdueCount: 0,
    lastReviewAt: null
  },
  migrationMeta: {
    importedGuestAt: null,
    importedFromGuest: false
  },
  lastPlayedAt: null
}
```

Migration behavior:
- old schema with `versesLearned[]` should still load
- initialize missing `verseProgress.byRef`
- do not force-create verse records for every learned verse until review system is enabled, unless needed for due counts

## Phase 5: Review Scheduler Engine

Create `src/client/ReviewScheduler.js` as pure logic.

Responsibilities:
- create initial verse review record
- apply review outcome
- compute next due date
- compute mastery score

Per-verse record shape:

```js
{
  reference: "Romans 10:17",
  quality: "Faith",
  status: "learning",
  masteryScore: 0.58,
  easeFactor: 2.35,
  intervalDays: 3,
  repetition: 4,
  lapseCount: 1,
  totalReviews: 7,
  totalCorrect: 6,
  streak: 3,
  introducedAt: "...",
  lastReviewedAt: "...",
  dueAt: "...",
  lastOutcome: "good",
  lastPromptMode: "cloze"
}
```

Supported outcomes:
- `again`
- `hard`
- `good`
- `easy`

## Phase 6: Review Selectors

Create `src/client/ReviewSelectors.js`.

Responsibilities:
- `getDueVerseRefs(progress, now, options)`
- `getDueVerseRefsByQuality(progress, now)`
- `getOverdueVerseRefs(progress, now, options)`
- `getReviewSummary(progress, now)`
- `getNextReviewCandidate(progress, options)`

These should derive queues from `verseProgress.byRef`, not store separate queue blobs as source of truth.

## Phase 7: ProgressManager Review API

Extend `src/client/ProgressManager.js` with review-aware methods:
- `ensureVerseProgress(verseRef, quality, now)`
- `getVerseProgress(verseRef)`
- `recordVerseReview(verseRef, quality, outcome, meta)`
- `getDueVerseRefs(options)`
- `getDueVerseCount(now, quality)`
- `getReviewSummary(now)`

`recordVerseReview(...)` should:
- create record if missing
- apply scheduler update
- update cached `reviewStats`
- save progress
- queue sync change

## Phase 8: Sync Implications

Update `src/client/SyncManager.js` to sync:
- user-scoped progress only
- user-scoped queue only

Server merge path will need to preserve:
- `verseProgress`
- `reviewStats`
- `migrationMeta`

## Phase 9: ReviewMode Integration

Update `src/client/ReviewMode.js` to support queue sources:
- `due`
- `quality`
- `incorrect`

Add options to `startReviewMode(options)`:

```js
{
  returnTo: 'game' | 'overland',
  mode: 'due' | 'quality' | 'incorrect',
  vQuality?: 'Faith'
}
```

Behavior:
- `due` mode pulls due refs from `progressManager`
- `quality` mode remains category browsing
- `incorrect` remains immediate remediation

## Phase 10: Recording Review Outcomes

Where outcomes get recorded:
- in `src/client/ReviewMode.js`, when the user advances through a verse or explicitly grades it
- possibly later from gameplay if combat correctness should affect scheduling

Recommendation:
- only update schedule on explicit review outcomes first
- gameplay correctness can become a secondary signal later

## Phase 11: UI Exposure

After data foundation is in place, add minimal UI:
- due count in review entry points
- overdue count by category if useful
- `Due Now` launch option from overland / Learn button flows
- optional mission-complete CTA into due review

## Risks / Decisions

1. XP merge semantics on guest import
- safest: `max`

2. What counts as a review outcome
- explicit buttons are best

3. Whether old learned verses should become due immediately
- recommendation: yes, gently

4. Whether gameplay should write review outcomes
- not in phase 1

## Recommended Build Order

1. user-scoped `ProgressManager` keys
2. user-scoped `SyncManager` queue keys
3. auth-driven progress switching
4. guest import
5. schema v2
6. `ReviewScheduler.js`
7. `ReviewSelectors.js`
8. `ProgressManager` review API
9. `ReviewMode` due-queue integration
10. UI for due counts / launch points

## Definition Of Done

This is complete when:
- two users on one machine do not share review state
- guest progress can be imported once into a signed-in user safely
- each verse has a stable per-user review record
- due review is computed from stored verse records
- review mode can launch into a due queue
- sync preserves that data instead of flattening it away
