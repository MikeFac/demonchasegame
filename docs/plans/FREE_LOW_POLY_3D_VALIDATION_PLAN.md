# Free Low-Poly 3D Validation Plan

Status: approved for implementation on `low-poly-3d`.

Implementation checkpoint (2026-08-16): continuous keyboard/mouse/touch turning
and the first authored Fear asset are complete. The selected CC0 Ghost Skull
passes the desktop asset/runtime gates. Real-phone profiling and the first
20–30-player cohort remain outstanding.

## Decision

Do not purchase generated 3D assets or paid advertising yet. Use CC0 assets to
make the current 3D mode credible enough to test the value and retention
hypotheses. Invest in custom assets only after real players demonstrate that
they complete the core loop and return.

This is a learning milestone, not a final art-production milestone.

## What we need to learn

The riskiest assumption is not whether VerseBattles can display attractive 3D
characters. It is whether the intended players enjoy the learn-aim-fight loop
enough to finish a mission and voluntarily return.

Primary hypothesis:

> With readable low-poly characters and responsive controls, new players will
> defeat a monster, complete a mission, and return within seven days because
> the Bible-learning combat loop is enjoyable and memorable.

Secondary hypotheses:

- Players understand that learning verses earns combat effectiveness.
- Players can move, continuously turn, aim, and fire without instruction from
  another person.
- The 3D presentation adds clarity and appeal without making phone performance
  unacceptable.
- Some players voluntarily ask to play again or invite another player.

## MVP scope

### Build now

- Retain the working low-poly 3D renderer and procedural fallbacks.
- Add smooth, press-and-hold rotation for keyboard, mouse, and touch controls.
- Import one CC0 animated monster as the complete asset-pipeline proof.
- If that proof passes the technical gates, map a maximum of five CC0 monsters
  to the initial demon roster using palette, scale, accessories, and effects.
- Preserve the existing 2D game and instant fallback when an authored asset
  cannot load.
- Capture the activation, mission-completion, retention, learning, and referral
  measures described below.

### Do not build yet

- Paid Tripo, Meshy, or commissioned character sets.
- A bespoke character for every demon.
- High-resolution PBR texture sets, real-time shadows, cinematic shaders, or
  other expensive phone rendering features.
- A large marketing campaign.
- Additional game modes whose purpose is not required for this validation.

## Free asset stack

Primary library: [Quaternius Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html).
It contains 50 animated monsters in glTF, FBX, OBJ, and Blend formats and is
released under CC0 for personal and commercial use.

Supporting tools and libraries:

- Blender for cleanup, decimation, clip naming, texture resizing, and GLB
  packing.
- Blockbench for approachable low-poly edits and simple animation work.
- Mixamo for no-cost humanoid auto-rigging or replacement clips when a source
  monster has a compatible biped shape.
- Kenney CC0 animated characters as a secondary source when the art direction
  needs a human or blockier silhouette.

Record the source URL and license beside every imported asset even when
attribution is not required.

## Asset integration gates

The first candidate replaces only `monster.fear` and must satisfy the existing
manifest contract before any additional character is imported:

- GLB/glTF loads through the manifest without renderer changes.
- Required clips resolve to `idle`, `walk`, `attack`, `hit`, and `death`.
- At most 4,000 triangles after optimization.
- One material where practical and no more than a 512px texture atlas.
- Feet at Y=0, stable scale, readable front and side silhouette.
- No embedded cameras, lights, unused clips, or hidden geometry.
- Procedural Fear remains the fallback for every load or validation failure.
- The phone profile remains within 100 draw calls, 150,000 visible triangles,
  and the sustained-frame criteria in `LOW_POLY_3D_PHONE_PROFILE.md`.

Do not import the whole 50-model pack into the shipped public directory. Keep
the downloaded pack outside runtime assets, select deliberately, and ship only
optimized models actually used by the game.

## Player experiment

### Cohort

Recruit 20–30 target players through direct, no-cost outreach: existing
contacts, parents, church or youth leaders, and supervised play sessions where
appropriate. Do not use paid advertisements for this cohort.

Record each participant's first-play date and acquisition source. Observe
behavior without coaching unless the player is completely blocked; record the
point where help was required.

### Actionable measures

- **Activation:** player reaches combat and defeats the first monster.
- **Core completion:** player completes the first mission.
- **Learning:** player correctly recalls or reconstructs a tested verse in a
  later interaction.
- **D7 retention:** player starts another meaningful session within seven days.
- **Referral intent shown by behavior:** player sends an invitation, shares the
  game, or independently asks another person to join.
- **Control friction:** player mis-turns, misses the fire control, requires help,
  or abandons while trying to move and aim.

Total registrations, page views, and compliments about the graphics are
diagnostic only; they are not success measures.

### Pre-committed decision gates

For a cohort of at least 20 first-time players:

- at least 60% defeat the first monster;
- at least 40% complete the first mission;
- at least 25% return within seven days;
- at least three players voluntarily ask to replay, invite, or share;
- no recurring control failure blocks more than 20% of the cohort;
- the real-phone performance profile passes.

These are product decision gates selected for this experiment, not claimed
industry benchmarks.

## Pivot or persevere

- **Meet most gates:** import up to five monsters, improve the weakest funnel
  step, and run a second cohort. A small paid-asset experiment is then allowed.
- **Strong activation but weak retention:** do not buy art. Investigate mission
  length, replay value, learning payoff, and reasons for returning.
- **Weak activation or control success:** fix onboarding and controls, then
  rerun the same cohort design.
- **Players enjoy learning but not combat:** test a zoom-in pivot around the
  most valued learning interaction.
- **Two cohorts miss the gates without meaningful improvement:** pause 3D asset
  expansion and reassess the customer segment or core loop.

Paid acquisition begins only after retention is credible. Marketing should
amplify demonstrated value, not purchase more first sessions that immediately
churn.

## Two-week execution sequence

1. Implement and verify continuous turning on keyboard, mouse, and touch.
2. Select and optimize one CC0 Fear candidate; validate and load it through the
   manifest.
3. Run desktop and real-phone technical gates.
4. Confirm analytics can distinguish activation, mission completion, D7
   return, learning, referral, and acquisition cohort.
5. Recruit the first 20–30 players through direct outreach.
6. Review the cohort after seven days and record a pivot/persevere decision.

## Spending rule

Until the first cohort has been reviewed:

- asset-generation budget: $0;
- paid-advertising budget: $0;
- allowable investment: development time limited to the MVP scope above.

After a passing cohort, approve only the smallest next experiment rather than
a complete asset library or broad advertising campaign.

## Lean assessment

Before this plan, the low-poly effort scored 5/10: a credible technical MVP was
being built without a defined retention experiment. This plan scores 10/10 on
experiment design because it names the riskiest assumption, limits the build,
uses behavioral cohort measures, pre-commits decision gates, and defines what
happens if the hypothesis fails. Execution earns that score only if the gates
remain fixed and the resulting evidence changes the next investment decision.
