# Product Marketing Context

## Product

- Product name: `VerseBattles`
- Category: browser-based Scripture engagement and discipleship game
- Core loop: players answer Bible questions to power up combat and progress through the game
- Distinctives:
  - Browser-based, so there is no app-install barrier
  - Supports solo play, multiplayer, missions, learning/review flows, and custom worlds
  - Includes discipleship-track missions around the commandments and promises of Jesus
  - Designed to connect Scripture memory with gameplay rather than bolting learning on afterward

## Primary Audiences

Prioritize audiences in this order for paid acquisition unless current data proves otherwise:

1. `Youth pastors`
2. `Parents`
3. `Players`
4. `Missions leaders`

Reasoning:

- Youth pastors are the strongest distributor/buyer proxy. One conversion can influence a whole group.
- Parents are a viable secondary audience because they control family screen-time choices.
- Players are usually the end users, not the decision-makers, so cold paid traffic is likely lower intent.
- Missions leaders are promising but should be treated as a narrower decision-maker segment, not the default broad campaign audience.

## Current Landing Pages

- `/youth-pastors`
  - Message: turn weekly Scripture engagement into something students actually want to open
  - Emphasizes repeatable discipleship touchpoints, custom worlds, multiplayer, and browser access
- `/parents`
  - Message: give screen time a better purpose
  - Emphasizes short sessions, browser access, repetition, and family routines
- `/missions`
  - Message: worth testing in real ministry conditions
  - Emphasizes lower-resource access, multilingual potential, honest pilot framing, and local ministry realities
- `/players`
  - Exists as a route and should be treated primarily as an organic or retargeting destination unless paid data proves otherwise
- `/`
  - Main game entry
- `/?play=1`
  - Fast test / quick-play style CTA used on the audience pages

## Positioning

Use outcome-led positioning, not "Christian game" positioning by itself.

Best framing by audience:

- Youth pastors:
  - A repeatable discipleship tool, not just a novelty game
  - Reinforces the week's teaching between gatherings
  - Helps students return to Scripture during the week
- Parents:
  - Better-purpose screen time
  - Short repeatable sessions tied to Bible memory
  - Easy to test quickly in the browser
- Missions leaders:
  - Worth piloting on real devices and real bandwidth
  - Lower friction because it is browser-based
  - Useful where language flexibility and low setup matter

## Paid Channel Bias

Default channel order:

1. `Google Search` for high-intent demand capture
2. `Reddit` for niche community discovery and discussion-context traffic
3. `Meta` for adult prospecting and retargeting

If the user says they are already running Reddit ads, optimize Reddit first before recommending expansion.

## Reddit-Specific Guidance For This Product

### Best audience priority

1. Youth pastor / church leader communities
2. Christian parenting / homeschooling audiences
3. Bible study / discipleship / ministry resource audiences
4. Missions / ministry training audiences

### Best landing-page mapping

- Send ministry decision-makers to `/youth-pastors`
- Send family-oriented traffic to `/parents`
- Send missions/ministry-operations traffic to `/missions`
- Avoid sending most cold Reddit traffic directly to `/` unless the campaign is explicitly optimized for immediate play

### Recommended Reddit structure

- Split ad groups by `community cluster` or `keyword theme`, not mixed together
- Keep `youth pastors`, `parents`, and `missions` in separate campaigns or at minimum separate ad groups
- Separate `community targeting` from `keyword targeting` so performance is diagnosable
- Track device and placement performance separately early

### Reddit creative stance

- Native, practical, and specific beats polished promotional language
- Lead with one concrete ministry or family problem:
  - students disengage from Scripture between gatherings
  - parents want better-purpose screen time
  - leaders want a low-friction tool to test quickly
- Use real product screenshots and plain language
- If comments are enabled, treat comment handling as part of campaign performance

## Tracking State

Current known tracking from repo:

- GA4 via `public/landing-analytics.js`
- Existing events:
  - `landing_page_view`
  - `landing_cta_click`

Current gap:

- No Reddit Pixel or Reddit Conversions API implementation is present in the repo
- No deeper success event is obvious yet for paid optimization such as:
  - `start_game_after_landing`
  - `signup`
  - `request_demo`
  - `return_visit`

For paid-ads guidance, recommend fixing measurement before scaling spend aggressively.

## KPI Priorities

Prefer these metrics over shallow CTR-only reporting:

- Cost per qualified landing CTA
- Cost per game start after landing
- Cost per returning visitor
- Cost per ministry lead or qualified contact, if that flow exists
- Landing-page-to-CTA conversion rate by audience page

## Default Recommendations

When asked for advice and there is no contradictory performance data:

- Put most paid budget on `/youth-pastors`
- Use `/parents` as the secondary paid test
- Keep `/players` mostly for organic traffic, creator traffic, or retargeting
- Treat `/missions` as a narrower but high-quality decision-maker campaign, especially on Reddit

## Constraints And Assumptions

- Product appears early-stage from the current analytics depth
- Optimization should assume limited conversion data unless the user provides stronger downstream metrics
- Avoid recommending minor-targeted ad strategies; target adults who choose tools for players
