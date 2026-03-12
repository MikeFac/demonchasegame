# Onboarding Clarity Plan

## Purpose

Improve the first 30 to 120 seconds of VerseBattles so new players quickly understand:

- how to move
- how quizzes power combat
- how to damage and defeat demons
- how to heal
- how to make progress

This plan is focused on reducing early confusion and improving the odds that a new player stays long enough to experience the game loop properly.

## Main Problem

The game now has a stronger core identity, especially with:

- `FUN` mode
- optional `3d` mode
- affinity damage
- custom worlds

But a new player can still bounce early if they do not immediately understand:

- what to do first
- why Scripture matters to combat
- what the controls are in the selected mode
- what success looks like in the first minute

The first 2 minutes matter disproportionately. If players do not get through that window, deeper progression systems matter much less.

## Goals

- Reduce first-session confusion.
- Teach the core loop with minimal reading.
- Make the first correct answer feel important.
- Make movement and combat expectations clear in both 2D and 3D.
- Increase the number of players who:
  - move within the first 10 seconds
  - answer the first quiz
  - defeat the first demon
  - stay longer than 2 minutes

## Non-Goals

- Large lore-heavy tutorial screens
- Mandatory long text explanations before gameplay
- A single tutorial that ignores the difference between 2D and 3D controls
- Teaching every system up front

## Core Onboarding Principle

Show the player the loop through action, not explanation.

The intended first-session sequence is:

1. move
2. face a clear threat
3. answer a simple question
4. perform a powered attack
5. kill a demon
6. collect healing
7. feel progress

## Phase 1: First-Run Onboarding State

Add a lightweight first-run onboarding state.

### Requirements

- Track whether the player has completed the guided intro.
- Allow the intro to appear only for genuinely new players, or only once per mode if needed.
- Keep the state local at first:
  - local storage is sufficient initially
- Allow re-entry later through help/tutorial if desired.

### Suggested flags

- `hasCompletedIntro2D`
- `hasCompletedIntro3D`

This keeps onboarding mode-specific, which is important because the controls differ significantly.

## Phase 2: Scripted First Encounter

The first combat encounter should be more controlled than the normal game flow.

### Design

- Start with a safe opening area.
- Spawn one obvious demon at manageable distance.
- Give the player an easy first quiz.
- Place one healing pickup nearby.
- Avoid overwhelming spawns during the intro steps.

### Intro sequence

1. prompt movement
2. show first demon
3. show first quiz
4. require one correct answer
5. require one attack
6. reward first kill
7. direct the player to healing pickup

### Purpose

This makes the first minute feel authored instead of noisy.

## Phase 3: Mode-Specific Guidance

Do not use one generic tutorial for all play modes.

### 2D mode prompts

- `Tap or click to move`
- `Move toward the demon`
- `Answer correctly to power your attack`
- `Collect the cross to heal`

### 3D mode prompts

- `FORWARD moves`
- `LEFT and RIGHT turn`
- `Face the demon and press FIRE`
- `STOP pauses movement`
- `Collect the cross to heal`

### Rules

- Show only one prompt at a time.
- Remove each prompt immediately once the player succeeds.
- Keep prompts short and task-oriented.

## Phase 4: Stronger Cause-and-Effect Feedback

The first correct answer must produce a dramatic and obvious payoff.

### Needed feedback

- stronger hit effect
- more obvious flash text
- clearer audio cue
- stronger damage feedback
- satisfying first kill moment

### Candidate messages

- `Correct answer powers your attack`
- `Verse power unlocked`
- `Strong hit`

### Why this matters

This is the moment that explains what makes VerseBattles different.

## Phase 5: Beginner Objective Tracker

Add a very small onboarding checklist for first-time players.

### Suggested items

- `Move`
- `Answer correctly`
- `Defeat a demon`
- `Collect healing`

### Behavior

- Show it only during onboarding.
- Mark steps complete immediately.
- Remove it after onboarding ends.

### Purpose

This gives the player a clear short-term path without heavy tutorial copy.

## Phase 6: Reduce First-Minute Cognitive Load

Do not introduce too many concepts immediately.

### De-emphasize early

- advanced menu items
- full affinity depth
- complex custom-world concepts
- too many simultaneous demons

### Emphasize early

- movement
- quiz answer
- powered attack
- healing
- progress

### Rule

Teach depth after the player has already succeeded once.

### Implemented beginner recovery cue

A lightweight in-combat hint now appears when the player takes repeated hits from the same demon without dealing damage back:

- `Flee and Learn`
- `{best counter category}`

This is intentionally short, placed in-world above the player, and avoids introducing another blocking modal.

### Why this helps

- It gives beginners a next step at the exact moment they are overwhelmed.
- It connects failure in combat to the learning loop instead of making learning feel separate.
- It teaches the core idea that some demons are weaker against certain verse categories without requiring a full affinity explanation up front.

### Design implication

If affinity becomes a stronger damage multiplier over time, this hint becomes more valuable, not less:

- beginners get a readable recovery action
- category learning gains clear tactical value
- the Scripture loop and combat loop reinforce each other

## Phase 7: 3D Mini-Intro Overlay

The optional 3D mode needs its own short intro.

### Suggested pre-game overlay

- `FORWARD moves`
- `LEFT / RIGHT turns`
- `FIRE hits demons ahead`
- `STOP halts movement`

### Constraints

- keep it under a few lines
- dismiss quickly
- do not block the player for long
- remove after first success or first movement sequence

## Phase 8: Recovery Flow

Early failure should not feel punishing.

### If the player dies very early

- offer a quick retry
- optionally suggest switching views if 3D feels difficult
- do not replay a long tutorial

### Goal

Keep the player in the action loop rather than sending them back into friction.

## Recommended Implementation Order

1. first-run onboarding flags
2. scripted first encounter
3. mode-specific prompts
4. beginner objective tracker
5. stronger first-hit and first-kill feedback
6. 3D mini-intro overlay
7. retry/recovery flow

## Onboarding To-Do List

- Add instrumentation for first-session drop-off points.
- Track activation milestones:
  - first movement
  - first key action
  - first meaningful success
  - return visit
- Keep onboarding additive around the core loop instead of replacing core gameplay flows.
- Prefer lightweight guidance:
  - contextual hints
  - checklist steps
  - empty-state style prompts where relevant
- Optimize onboarding for time-to-value rather than full-system explanation.
- Ship onboarding changes behind a feature flag for gradual rollout and fast rollback.
- Compare onboarding cohorts against the current experience before making it default.
- Ensure experienced players can skip, dismiss, or stop seeing beginner guidance after first success.
- Avoid forced modal-heavy onboarding that blocks play.
- Protect the default workflow so onboarding changes do not break existing behavior.

## Minimum Viable Onboarding Pass

If only a small first pass is possible, implement:

1. scripted first encounter
2. one prompt at a time
3. stronger first correct-answer payoff

That alone should improve early clarity substantially.

## Suggested Telemetry

Track early funnel milestones:

- first movement
- first correct answer
- first attack
- first demon kill
- first healing pickup
- session reaches 2 minutes

This will make onboarding improvements measurable instead of guess-based.

## Success Criteria

The onboarding pass is working if:

- more new players move quickly after start
- more players answer the first quiz
- more players achieve the first kill
- more players stay longer than 2 minutes
- fewer players appear lost during the first session

## Notes

- The onboarding flow should be additive and low-risk.
- It should not disturb experienced players.
- It should remain compatible with both 2D and 3D modes.
- The first minute should feel clearer, easier, and more rewarding, not slower.
