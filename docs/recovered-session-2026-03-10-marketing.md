# Recovered Session: March 10, 2026 Marketing Discussion

- Session ID: `019cd404-2808-7c81-9427-5c57bee2c0cc`
- Source: `/home/michael/.codex/sessions/2026/03/10/rollout-2026-03-10T05-12-48-019cd404-2808-7c81-9427-5c57bee2c0cc.jsonl`
- Reconstructed on: `2026-03-10`

## User

Let's talk about marketing this system. We have a /youth-pastors page and a couple of other pages. Please relist those URLs for me. In terms of strategic spending of ad money on reddit or elsewhere, would you recommend promoting to youth pastors rather than simply to players?

## Assistant

The audience pages currently wired in the app are `/youth-pastors`, `/parents`, and `/players`, with the main game at `/`. Those routes are defined in [server.js](/home/michael/proj/dcgame/server.js#L28) and [server.js](/home/michael/proj/dcgame/server.js#L40).

If you're spending ad money, I would bias toward `youth pastors` over raw `players`. The reason is simple: youth pastors are the buyer/distributor, while players are usually the end users but not the ones deciding to bring the product into a group. If one pastor adopts it, you can get repeated use and multiple players from one conversion. Paid traffic to players is more likely to be curiosity-driven, lower-intent, and harder to monetize unless the game is already strong enough to spread organically.

My practical recommendation:
- Put most paid budget on `youth pastors`.
- Keep a smaller test budget for `players` only to learn what messaging gets the highest CTR and sign-up rate.
- Use `parents` as a secondary audience, not the primary paid target.

If you want, I can sketch a concrete channel plan next: Reddit vs Meta vs Google, with message angles for each landing page.

## User

Yes, do that.

## Assistant

I'd run paid acquisition in this order: `Google Search` first for high-intent demand capture, `Reddit` second for niche community discovery, and `Meta` third for broad adult audience testing plus retargeting. I would not lead with `players` as the main paid audience.

Why:

- `Youth pastors` are the distribution lever. One conversion can bring a whole group.
- `Google Search` is best when someone already has intent like `Bible memory game for youth group` or `youth group game scripture`.
- `Reddit` is unusually good for niche interest targeting because Reddit lets you target by `community audiences`, `interest groups`, and `keywords` in saved audiences.
- `Meta` is still useful, but it has moved harder toward AI/broad delivery. Manual targeting is less central than before, and teen targeting is limited, so Meta is better for reaching adults such as youth pastors and parents, not minors directly.

A practical starting mix for a small test budget:
- `50% Google Search`
- `30% Reddit`
- `20% Meta`

If the budget is very small, I'd do:
- `70% Google Search`
- `30% Reddit`
- `0% Meta` until you have better conversion data

## Channel Plan

`Google Search`
- Objective: capture people already looking for a solution.
- Send traffic mostly to `/youth-pastors`, secondarily to `/parents`.
- Keyword themes:
  - `youth group bible game`
  - `scripture memory game`
  - `bible trivia game for youth group`
  - `christian games for teens church`
  - `youth ministry game ideas`
- Exclude weak traffic with negatives like `free coloring`, `printable`, `VBS` if those don't convert.
- Best offer angle: `engaging Bible memory game for youth groups`

`Reddit`
- Objective: find church/ministry decision-makers inside relevant communities and adjacent interest contexts.
- Send traffic to `/youth-pastors`.
- Targeting approach:
  - `community audiences` around youth ministry, church leadership, Christian parenting, homeschooling, Christian education
  - `keywords` around youth group, discipleship, Bible memory, sermon prep, small groups, church games
- Creative needs to feel native and practical, not polished-corporate.
- Best angle: `Looking for a youth-group activity that is fun but still obviously Scripture-centered?`

`Meta`
- Objective: broad adult prospecting and retargeting.
- Send pastors to `/youth-pastors`, parents to `/parents`.
- Use broad or lightly guided adult audiences, let Advantage+ do delivery, and rely more on creative than hyper-specific audience setup.
- Best use case: short video clips or static screenshots showing actual gameplay plus a ministry outcome.

## Messaging By Page

`/youth-pastors`
- Lead with group outcomes, not game features.
- Headline angles:
  - `A Bible game your students will actually want to play`
  - `Turn Scripture memory into a youth-group activity`
  - `Competitive gameplay, real verse recall`
- Proof points to emphasize:
  - group use
  - repeatable weekly activity
  - discussion / discipleship tie-in
  - low prep

`/parents`
- Angle: screen time with spiritual value.
- Headline angles:
  - `A game that reinforces Bible memory`
  - `Something better than passive screen time`
- Proof points:
  - safe framing
  - educational/spiritual benefit
  - replayable at home

`/players`
- I would mostly use this for organic traffic, creator/influencer links, or retargeting.
- Paid player traffic is likely to be weaker unless the game is already highly viral.

## Recommendation

Promote to `youth pastors` first, `parents` second, and `players` last. If you only have one paid landing page to push for the next month, use `/youth-pastors`.

## What To Measure

- landing page CTR
- email/signup/demo/contact rate
- click-to-play rate
- return visit rate
- cost per qualified lead, not just cost per click

Because you already emit `landing_page_view` and `landing_cta_click`, I'd add one deeper event next: a real success event like `signup`, `request_demo`, or `start_game_after_landing`. Without that, ad optimization will stay too shallow.
