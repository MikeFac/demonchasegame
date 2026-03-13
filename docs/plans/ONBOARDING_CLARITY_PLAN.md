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

## Phase 8: Guided Demo World

The current onboarding problem is not just comprehension. It is also conversion.

A first-time player needs to leave the first session believing:

- `I understand what to do`
- `This is actually fun`
- `There is more here to come back for`

So the first-run experience should not be a neutral tutorial. It should be a short guided demo world that teaches, proves, and sells the loop.

### Primary goal

Increase first-session retention and second-session intent by delivering one short, authored run that:

- teaches the controls
- creates one clean early win
- shows that learning verses makes combat easier
- hints at deeper progression and ministry value

### Target length

- `60` to `120` seconds
- hard cap around `2` minutes before the player is sent into the normal game or menu

### Design rules

- no large walls of text
- no generic sandbox opening
- no normal chaotic spawn pacing during the guided sequence
- no requirement to understand the full game before getting a win

## Exact Demo Sequence

### Step 1: Safe Spawn

Player starts in a small authored area with no nearby threats.

Prompt:

- `Move to begin`

Success condition:

- player moves a short distance

What this proves:

- immediate control understanding

### Step 2: First Threat

Spawn one weak demon at a visible distance in front of the player.

Prompt:

- `A demon is coming`
- `Answer correctly to fight back`

Requirements:

- demon should move slowly
- player should not be overwhelmed

What this proves:

- threat is readable
- the game has a clear objective

### Step 3: First Easy Quiz

Show a very easy, curated question.

Preferred mode:

- simple multiple choice or cloze

Avoid:

- tricky first-letter edge cases
- hard distractors

Prompt:

- `Tap the right answer`

What this proves:

- Scripture interaction is simple, not intimidating

### Step 4: Powered Hit

On correct answer:

- visibly empower the player
- make the next hit obviously stronger than a normal attack

Feedback:

- flash text
- stronger hit effect
- obvious damage response

Suggested message:

- `Correct answer powers your attack`

What this proves:

- learning is directly tied to action

### Step 5: First Kill

The first demon should die quickly after the correct answer.

Feedback:

- dramatic kill effect
- brief celebratory message

Suggested message:

- `First demon defeated`

What this proves:

- the core loop works
- the player can succeed quickly

### Step 6: Healing Pickup

Place one cross or healing pickup slightly ahead of the player.

Prompt:

- `Collect the cross to heal`

What this proves:

- pickups matter
- the player can recover

### Step 7: Affinity Reveal

Spawn a second, tougher demon that resists easy brute force.

The player should receive a short in-world hint:

- `Flee and Learn {category}`

Then give the player a short safe route or pause moment to reach a guided Learn flow.

What this proves:

- some demons are beaten more easily by learning the right category
- the Learn loop is strategically useful, not separate

### Step 8: Short Learn Moment

Do not open a long study screen.

Instead, give the player one compact learn interaction:

- one category
- one verse or one very short sequence
- one clear outcome

Prompt:

- `Learn this verse to fight stronger demons`

What this proves:

- the game is not just combat
- learning has gameplay payoff

### Step 9: Stronger Return Fight

Bring the player back into combat against the second demon.

The result should be clearly easier or more powerful than before.

Feedback:

- `Stronger vs {demon}`
- or visible combat bonus

What this proves:

- category learning creates tactical advantage

### Step 10: Exit Sell

After the second success, do not just drop the player silently into normal play.

Show a short “why come back” bridge.

Suggested messages:

- `Unlock more categories`
- `Fight stronger demons`
- `Play missions and discipleship tracks`
- `Use this with a group`

Then give two clear choices:

- `Continue to the full game`
- `Learn verses first`

## First-Session Conversion Goals

This demo world should explicitly optimize for:

- first movement within `10s`
- first correct answer within `30s`
- first kill within `45s`
- first clear understanding of “learn to get stronger” within `90s`
- increased likelihood of a second visit

## Ministry-Leader Layer

The player onboarding world also needs a lightweight proof layer for adult evaluators.

Without turning it into a pitch deck, it should quietly signal:

- this is browser-based
- this teaches Scripture, not just trivia
- students can grow through repeated use
- there is enough structure here for ministry use

Best place for that signal:

- a short post-demo card
- a landing page immediately before the demo
- or a menu panel after the demo

## Implementation Notes

The easiest first implementation is:

- add a dedicated `onboarding` world or mission
- trigger it only for first-time solo players
- store completion in local storage
- allow replay from Help / Tutorial later

Do not try to solve all onboarding inside the normal procedural start. The current balance work helps, but an authored first session is a better conversion tool than more tuning alone.

## Onboarding Mission Spec

This onboarding experience should be implemented as a dedicated authored mission, not a hidden one-off state inside the normal game.

### Access requirements

The onboarding mission should be available in two ways:

1. `Auto-launch for first-time solo players`
2. `Always visible at the top of Missions`

### Why it must stay visible in Missions

- it allows repeated testing and tuning without clearing local storage
- it is easy to demo to other people on demand
- it turns onboarding into a reusable “guided sample” rather than a fragile one-time event
- it gives ministry leaders and evaluators a predictable place to start

## Mission Placement

### Missions menu behavior

Add a dedicated onboarding/demo chapter that appears before the normal chapters.

Suggested chapter metadata:

- `id`: `chapter0`
- `slug`: `chapter0-onboarding`
- `name`: `Start Here`
- `description`: `Learn the basics, defeat your first demons, and see how verse learning makes you stronger`
- `nodeShape`: something simple and welcoming, such as `star` or `path`
- `theme`: `stone` or another bright easy-to-read theme
- `unlockRequirement`: `null`

Suggested first mission:

- `id`: `intro-01`
- `name`: `First Steps`

Optional second mission later:

- `id`: `intro-02`
- `name`: `Learn to Fight Stronger Demons`

## First Mission Design

### Mission identity

This mission is not a normal grind mission.

It is a guided conversion mission whose purpose is:

- teach the loop
- create confidence
- create curiosity
- create return intent

### Mission constraints

- short map
- low chaos
- controlled enemy pacing
- highly readable terrain
- no random armor pickups at start
- low punishment for mistakes

### Recommended technical settings

- `mapStyle`: easiest readable map, likely `classic` or a custom open layout
- `qualities`: limit to `Faith` and one support category
- `monsters`: limit to `Fear` and maybe one second readable demon later
- `maxMonsters`: very low during the onboarding flow
- `randomSpawnsEnabled`: ideally `false` for the first version
- `fixedMonsters`: yes
- `monstersToKill`: low, probably `2`

## Mission Flow Spec

### Segment 1: Learn to Move

Environment:

- safe spawn
- no active threat

Prompt:

- `Move to begin`

Completion:

- player moves a minimum distance

### Segment 2: First Demon

Environment:

- one fixed demon appears ahead
- slow movement

Prompt:

- `A demon is coming`
- `Answer correctly to fight back`

Completion:

- player reaches combat range or the demon becomes visible

### Segment 3: First Easy Question

Question style:

- simple multiple choice or easy cloze

Prompt:

- `Tap the right answer`

Completion:

- correct answer submitted

### Segment 4: First Kill

Requirements:

- first demon should die quickly after the correct answer
- make the first win feel strong and clean

Feedback:

- `Correct answer powers your attack`
- `First demon defeated`

Completion:

- demon dies

### Segment 5: Healing

Environment:

- place one healing pickup along the obvious next path

Prompt:

- `Collect the cross to heal`

Completion:

- pickup collected

### Segment 6: Stronger Demon + Learn Hook

Environment:

- second demon appears
- this demon should survive longer or pressure the player more

Prompt:

- `Some demons are easier to beat after learning`
- then the in-world cue:
- `Flee and Learn {category}`

Completion:

- player opens or is guided into a short learn step

### Segment 7: Mini Learn Step

Requirements:

- brief
- focused on one category
- not a long reading wall

Prompt:

- `Learn this verse to fight stronger demons`

Completion:

- player completes one short learn interaction

### Segment 8: Return Fight

Environment:

- player returns to defeat the second demon

Feedback:

- visible stronger effect
- category advantage should be obvious

Completion:

- second demon dies

### Segment 9: Exit Choice

After the second success, show a short completion bridge.

Suggested text themes:

- `You are ready for the full game`
- `Learn more verses to grow stronger`
- `Try missions, categories, and group play`

Buttons:

- `Continue to Full Game`
- `Learn Verses`
- optional: `Replay Demo`

## Triggering Rules

### Auto-launch rule

When a player starts solo for the first time:

- if `hasCompletedOnboardingWorld !== true`
- offer the onboarding mission first

Best UX:

- either auto-launch directly
- or show a light choice:
  - `Start Here`
  - `Skip to Full Game`

### Persistence

Use local storage for:

- `hasCompletedOnboardingWorld`
- `hasSkippedOnboardingWorld`

Do not hide the mission from the Missions list after completion.

## Success Metrics

Track these separately from normal missions:

- onboarding mission started
- onboarding mission completed
- first correct answer
- first demon kill
- learn step reached
- exit choice selected
- later return session after onboarding completion

## Non-Goals For V1

- a fully cinematic tutorial
- dynamic branching narrative
- multiple onboarding chapters
- teaching every mechanic
- multiplayer onboarding

## Recommended First Build

Build the smallest useful version first:

- one onboarding chapter at the top of Missions
- one mission
- first-time solo launch hook
- two demons
- one healing pickup
- one short learn step
- one end-of-demo choice

That is enough to test whether an authored first session improves retention before building a larger tutorial campaign.

## Phase 9: Guided Onboarding Mission V2

The first pass onboarding mission solves entry chaos, but it still asks the player to infer too much.

The next version should be more explicit.

### V2 goal

Make the mission teach the loop without relying on player guesswork.

The player should clearly understand:

- where their health and progress are
- that quiz answers power combat
- where to go to learn verses
- that some demons should be planned around, not rushed

## V2 design rules

- keep the mission short
- do not add long text blocks
- each prompt should explain one action only
- use arrows and highlights more than extra words
- do not pause the player constantly with full-screen modals
- the second encounter should teach planning, not panic

## V2 mission structure

### Encounter 1: Fast Understanding

Purpose:

- teach movement
- teach answer-to-attack loop
- deliver a quick win

Recommended enemy:

- one weak chaser

Recommended guidance:

- short prompt above player:
  - `Move to begin`
- then:
  - `Tap the right answer`

UI help:

- pulse/highlight the answer area
- optional arrow from center screen down toward the answer buttons

Success outcome:

- first demon dies quickly
- player sees an obvious win state fast

### Encounter 2: Planned Victory

Purpose:

- teach that harder demons should be handled through learning
- introduce a more intentional loop

Recommended enemy:

- one tougher guard-style mini-boss

Why guard behavior is right here:

- it gives the player time to think
- it reduces panic during the teaching moment
- it creates a clearer “retreat, learn, return” structure

Recommended traits:

- noticeably more health than the first demon
- larger sprite or clear label
- slower than a normal boss
- territorial / guard behavior
- not required to chase the player across the map

Suggested label:

- `Fear Guard`
- or category-specific variant if needed

## Guided prompt sequence

### Prompt 1: HUD orientation

Timing:

- immediately on mission start or after first movement

Text:

- `This is your health`
- `Defeat demons to finish the mission`

UI treatment:

- short arrow to the top bar
- pulse highlight around the health / ammo / demons-to-defeat row

Goal:

- player understands that the top HUD matters

### Prompt 2: First combat instruction

Timing:

- when first demon becomes active or visible

Text:

- `Answer correctly to fight back`

UI treatment:

- arrow or pulse on answer buttons
- keep duration short

Goal:

- connect quiz and combat immediately

### Prompt 3: First win reinforcement

Timing:

- after first demon dies

Text:

- `Correct answers make you stronger`

UI treatment:

- no modal
- small celebratory overlay or toast in the safe lower-middle band

Goal:

- reinforce cause and effect

### Prompt 4: Learn location explanation

Timing:

- when the second demon or mini-boss is introduced

Text:

- `This demon is harder`
- `Learn verses here to beat it`

UI treatment:

- arrow to `Learn Verses Here`
- pulse highlight on that button

Goal:

- remove ambiguity about where the learning action lives

### Prompt 5: Retreat message

Timing:

- when player takes pressure from the second demon

Text:

- `Flee and Learn {category}`

UI treatment:

- in-world message above player
- same style as the existing combat hint

Goal:

- teach the intended response under pressure

### Prompt 6: Return message

Timing:

- after the short learn step is completed

Text:

- `Now return and fight`
- or
- `You are stronger now`

UI treatment:

- short center-screen message
- optional brief arrow back toward the demon if readable

Goal:

- complete the loop cleanly

## Arrow and highlight spec

Arrows and highlights should be lightweight and temporary.

### Elements to support

1. `Top HUD`
- highlight bar area
- optional short arrow from center-top toward it

2. `Answer buttons`
- pulse border or glow around answer region
- optional downward arrow from verse/question area

3. `Learn Verses Here`
- pulse the button
- arrow from demon or center-screen cue toward the button

4. `Healing pickup`
- optional only if pickup understanding is still weak

### Visual rules

- use one accent color consistently
- keep arrows large and obvious
- animate with pulse or bounce
- auto-dismiss once the required action is completed

### Interaction rules

- do not leave arrows on screen after the player understands the step
- do not stack multiple arrows at once
- only one primary teaching cue should be active at a time

## Mini-boss spec for onboarding

The second demon should be stronger than the first, but not oppressive.

### Behavior

- `guard`

### Purpose

- create a visible obstacle
- encourage learning before brute force
- give the player a stable target for the “return and beat it” moment

### Tuning

- more health than the first demon
- slightly larger body
- enough damage to feel threatening
- not fast enough to create panic
- no permanent immobilization or unfair trap loop

### Success condition

- mission can still complete at `2` kills total
- the mini-boss should strongly imply “beat me with learning”

## Implementation approach

This should still avoid deep rewrites to core gameplay.

### Preferred implementation

1. extend the onboarding mission data
- define the second demon as a stronger fixed `guard`

2. add a small onboarding mission UI state
- keyed to `chapter0/intro-01`
- only active inside the onboarding mission

3. drive cues from simple triggers
- mission started
- first movement
- first demon visible
- first correct answer
- first demon death
- second demon visible
- learn button opened
- learn step completed

4. render arrows/highlights in UI layer
- do not mix this deeply into combat logic

## Minimal V2 build

If implemented in the smallest useful way, V2 should include:

- one short HUD explanation
- one answer-area highlight
- one `Learn Verses Here` arrow/highlight
- second demon converted into a guard-style mini-boss
- one brief “return and fight” cue after learning

That is enough to make the onboarding mission far more explicit without turning it into a long tutorial.

## Phase 7: Level Bosses As Readable Goals

Each level should include one clearly stronger demon that acts as an optional focal encounter.

### Boss rules

- exactly one boss per level
- boss is not required for level completion
- boss gives a large reward when killed
- boss uses `guard` behavior so it feels territorial rather than randomly roaming
- boss is visibly larger and more dangerous than normal demons of the same type

### Spawn approach

- spawn the boss in one of the four map corners
- prefer the closest valid point that fully fits in the corner region
- if the exact corner is blocked, fall back to the nearest safe point inside that corner search area

### Stats

- `3x` normal hit points for that monster type
- `1.5x` normal damage
- `1.5x` width
- `1.5x` height

### Why this helps onboarding and retention

- it gives each level a memorable “main threat”
- it creates a stronger reason to understand affinity and category counters
- it adds optional mastery without turning level completion into a hard wall
- it gives advanced players a bonus objective while beginners can still finish the level normally

### Reward guidance

Boss kills should provide a visible bonus, such as:

- bonus XP
- a large flash message
- stronger kill feedback than normal enemies

The reward should feel worth chasing, but the boss should remain optional until the wider progression loop is balanced around it.

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
