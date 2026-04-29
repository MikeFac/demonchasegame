# Scripture Maze Mode Spec

## Working Title

`Verse Chase` or `Scripture Maze`

## Core Loop

The player moves through a maze collecting progress toward a scripture-learning objective while avoiding demons. Correct category/scripture answers grant bullets. Bullets create short offensive windows where the player can instantly kill demons. Outside those windows, any demon contact kills the player immediately.

## Player Fantasy

You are under pressure, constantly routing through the maze, choosing whether to risk one more learning objective for ammo or cash in the bullets to clear space. The mode should feel tense, fast, and readable.

## Win Condition

Clear the mission by finishing the required scripture objective for the level.

Examples:

- Complete a target number of correct category matches
- Complete one full verse through multiple prompts
- Clear all scripture nodes tied to a category set

## Loss Condition

Single-hit death on demon contact while unarmed.

Single-hit death keeps the mode clean and distinct from dungeon health attrition.

## Learning Loop

Prompts should be short and frequent so they fit chase gameplay.

Best candidates:

- “Which category does this verse belong to?”
- “Which of these references matches this verse?”
- “Finish the missing phrase”
- “Collect the correct scripture node for `Faith`”

Correct answers:

- Award bullets
- Optionally give score and brief safety spacing
- Advance mission scripture progress

Wrong answers:

- Award nothing
- Optionally trigger a brief slowdown or spawn pressure increase
- Never dump the player into a long modal that breaks pacing

## Combat Loop

Bullets are the earned power resource.

Rules:

- Player starts with zero or very low ammo
- Correct learning actions grant ammo
- Each shot kills one demon instantly
- Demons kill player instantly on contact unless a temporary empowered state is active
- Ammo should be intentionally limited so shooting is tactical, not default

Alternative variant:

A correct answer could briefly enable “power mode” where touching demons kills them for 5-8 seconds instead of using projectiles. That is closer to classic Pac-Man. The bullet idea is stronger if you want to preserve the existing shooting identity.

## Maze Structure

The map should be simpler and more legible than the dungeon mode.

Needs:

- Clear lanes and corners
- A few loops for escape options
- Predictable choke points
- Spawn zones for demons
- Scripture/prompt nodes placed to force route decisions

The maze should support reading enemy motion at a glance. This mode lives or dies on clarity.

## Demon Roles

Reuse existing demon visuals, but assign ghost-like behaviors.

Examples:

- Chaser: directly pursues the player
- Ambusher: aims ahead of player path
- Wanderer: less predictable roaming pressure
- Flanker: prefers side routes and cutoffs
- Fast but fragile variant: high pressure, easy to clear
- Slow heavy variant: area denial around key corridors

The key is behavioral contrast, not raw stat inflation.

## Mission Structure

A mission should specify:

- Maze layout
- Demon roster
- Learning content source
- Ammo reward rules
- Win target
- Difficulty pacing

Example authored mission:

- Learn one `Faith` verse
- Four demons active
- Each correct category answer gives 2 bullets
- Finish after 6 correct prompt clears

## Difficulty Axes

Difficulty can scale through:

- More aggressive demon behaviors
- More simultaneous demons
- Lower ammo rewards
- Harder prompt mix
- Tighter mazes
- Less recovery time after prompt completion

Avoid scaling mainly through speed alone. That tends to feel cheap.

## UI/HUD

Keep it sparse:

- Current scripture/category objective
- Ammo count
- Progress toward mission completion
- Optional small danger indicator for nearby demons
- Score only if you want replay/challenge value

No health bar needed if the mode is sudden death.

## Session Rhythm

A good round should alternate between:

- Calm route planning
- Pressure while evading
- Quick learning decision
- Reward spike from earned bullets
- Short burst of control while clearing demons
- Return to vulnerability

That rhythm is the heart of the mode.

## What Makes It Distinct

This should not feel like dungeon mode in a maze. It should feel like:

- tighter map readability
- sudden-death stakes
- enemy-pattern mastery
- learning prompts as power economy
- short, repeatable, arcade-style runs

## Recommendation

Keep the first version very small:

- One maze
- Three demon behaviors
- One prompt type
- Bullets only, no extra power systems
- One authored mission

That will tell you quickly whether the chase-learning loop is actually fun.
