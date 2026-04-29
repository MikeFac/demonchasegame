# Per-User Review Implementation Checklist

## 1. `src/client/ProgressManager.js`

Purpose:
- become the per-user local source of truth for all progress, including review scheduling

Changes:
- replace fixed storage key with identity-aware key resolution
- add schema v2
- add guest import support
- add verse-progress CRUD and due-query methods

New constants:

```js
const STORAGE_KEY_PREFIX = 'missionProgress';
const GUEST_STORAGE_ID = 'guest';
const SCHEMA_VERSION = 2;
```

New internal helpers:

```js
_getStorageIdentity()
_getStorageKeyForIdentity(identity)
_getCurrentStorageKey()
_loadProgressForIdentity(identity)
_saveProgressForIdentity(identity, progress)
_migrateProgress(data)
_importGuestProgressIfNeeded(identity)
_mergeProgress(baseProgress, incomingProgress)
_recomputeReviewStats(now = Date.now())
```

Recommended identity shape:

```js
{ type: 'guest' }
{ type: 'user', userId: '<clerkId>' }
```

New public methods:

```js
setIdentity(identity)
getCurrentIdentity()
reloadForIdentity(identity)
hasUserScopedProgress(identity)
hasGuestProgress()

ensureVerseProgress(verseRef, quality, now = Date.now())
getVerseProgress(verseRef)
getAllVerseProgress()
recordVerseReview(verseRef, quality, outcome, meta = {})
getDueVerseRefs(options = {})
getReviewSummary(now = Date.now())
getDueVerseCount(now = Date.now(), quality = null)
```

Progress shape to support:

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

## 2. `src/client/SyncManager.js`

Purpose:
- make the offline sync queue user-scoped as well

Changes:
- replace fixed `syncQueue` key with identity-aware key resolution
- operate only on the active identity’s queue

New constants:

```js
const SYNC_QUEUE_KEY_PREFIX = 'syncQueue';
```

New internal helpers:

```js
_getStorageIdentity()
_getQueueStorageKey()
_getQueueForIdentity(identity)
_clearQueueForIdentity(identity)
```

Possible new public method:

```js
setIdentity(identity)
```

Queue item types to support later:

```js
{ type: 'missionComplete', ... }
{ type: 'verseLearned', ... }
{ type: 'verseReview', verseRef, outcome, reviewedAt, ... }
```

## 3. `src/client/ReviewScheduler.js`

New file.

Purpose:
- pure spaced-repetition scheduling logic
- no DOM, no storage, no globals

Exports:

```js
createInitialVerseProgress({ reference, quality, now, status = 'learning' })
applyReviewOutcome(record, outcome, now = Date.now(), meta = {})
computeMasteryScore(record)
isDue(record, now = Date.now())
isOverdue(record, now = Date.now())
normalizeReviewOutcome(outcome)
```

Supported outcomes:

```js
'again' | 'hard' | 'good' | 'easy'
```

## 4. `src/client/ReviewSelectors.js`

New file.

Purpose:
- derive queues and summaries from stored verse progress

Exports:

```js
getDueVerseRefs(progress, now = Date.now(), options = {})
getDueVerseRefsByQuality(progress, now = Date.now())
getOverdueVerseRefs(progress, now = Date.now(), options = {})
getReviewSummary(progress, now = Date.now())
getNextReviewCandidate(progress, options = {})
sortReviewRefs(progress, refs, options = {})
```

Expected options:

```js
{
  quality: null,
  includeNew: true,
  includeNotDue: false,
  limit: null
}
```

Summary shape:

```js
{
  dueCount,
  overdueCount,
  dueByQuality: { Faith: 3, Courage: 2 },
  overdueByQuality: { Faith: 1 },
  totalTrackedVerses,
  totalMasteredVerses
}
```

## 5. `src/client/ReviewMode.js`

Purpose:
- consume due queues from progress instead of only category-linear traversal

Changes:
- support queue source selection
- record explicit review outcomes back into progress

New module-level state:

```js
let currentQueueMode = 'quality';
let currentReviewQueue = [];
```

Changes to `startReviewMode(options)`:

```js
{
  returnTo: 'game' | 'overland',
  mode: 'due' | 'quality' | 'incorrect',
  vQuality?: string
}
```

New internal helpers:

```js
buildReviewQueue(options = {})
getCurrentQueueReference()
recordCurrentVerseOutcome(outcome, meta = {})
advanceReviewQueue(direction = 1)
```

## 6. `game.js`

Purpose:
- connect auth state, progress identity, and review launch points

Changes:
- on auth state changes, switch `progressManager` and `syncManager` identities
- when a verse becomes learned, initialize verse progress if missing
- use `mode: 'due'` where appropriate for post-mission review launches

New helper ideas:

```js
getProgressIdentityFromAuth()
refreshProgressIdentityFromAuth()
```

## 7. `src/client/Analytics.js`

Optional additions:

```js
trackReviewQueueOpened(mode, dueCount)
trackReviewOutcome(outcome, verseRef, quality)
trackReviewDueCountSeen(dueCount, overdueCount)
```

## 8. Server Sync Path

Need to inspect/update the server route that merges progress from `/api/progress/sync`.

Expected server requirements:
- store `verseProgress`
- store `reviewStats`
- preserve user-scoped sync semantics
- merge progress safely

Merge rules to define on server:
- `completedMissions`: union
- `unlockedWorlds`: union
- `missionStars`: max by mission
- `versesLearned`: union
- `verseProgress.byRef`: per-reference merge by freshest or strongest state
- `reviewStats`: recompute rather than trust blindly

## 9. Local Storage Migration Checklist

Cases `ProgressManager` must handle:

1. no existing data
- create fresh guest v2 progress

2. existing old global `missionProgress`
- migrate to guest-scoped v2

3. guest-scoped exists, user-scoped missing, user signs in
- import guest once into user-scoped

4. both guest and user-scoped exist
- do not re-import automatically

5. existing user-scoped v1/v2 data
- load and migrate in place

## 10. Method Signature Summary

`ProgressManager`

```js
setIdentity(identity)
reloadForIdentity(identity)
ensureVerseProgress(verseRef, quality, now = Date.now())
recordVerseReview(verseRef, quality, outcome, meta = {})
getVerseProgress(verseRef)
getAllVerseProgress()
getDueVerseRefs(options = {})
getReviewSummary(now = Date.now())
getDueVerseCount(now = Date.now(), quality = null)
```

`SyncManager`

```js
setIdentity(identity)
queueChange(change)
sync()
```

`ReviewScheduler`

```js
createInitialVerseProgress({ reference, quality, now, status })
applyReviewOutcome(record, outcome, now = Date.now(), meta = {})
computeMasteryScore(record)
isDue(record, now = Date.now())
isOverdue(record, now = Date.now())
```

`ReviewSelectors`

```js
getDueVerseRefs(progress, now = Date.now(), options = {})
getDueVerseRefsByQuality(progress, now = Date.now())
getOverdueVerseRefs(progress, now = Date.now(), options = {})
getReviewSummary(progress, now = Date.now())
getNextReviewCandidate(progress, options = {})
```

`ReviewMode`

```js
startReviewMode({
  returnTo,
  mode,
  vQuality
})
```

## 11. Implementation Order Checklist

1. add identity model to `ProgressManager`
2. add identity model to `SyncManager`
3. hook auth-driven identity switching in `game.js`
4. implement guest import
5. bump progress schema to v2
6. add `ReviewScheduler.js`
7. add `ReviewSelectors.js`
8. add `ProgressManager` review APIs
9. integrate `ReviewMode` queue selection
10. add due-count UI and launch points
11. update server sync merge path

## 12. Acceptance Criteria

This plan is complete when:
- local progress is isolated per guest vs signed-in user
- shared machines do not mix review schedules
- guest progress imports once into the user account
- per-verse review records exist in progress
- due review can be derived without a separate source-of-truth queue
- review mode can open a due queue cleanly
- sync can preserve that data model
