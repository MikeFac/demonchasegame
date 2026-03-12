# Content Production Page Spec

## Purpose

This page is an internal publishing tool for generating, reviewing, and approving long-form SEO content.

It should live under:

- `/content-maker`

It should not be indexable and should not be used as the public content surface.

Public content should be published under:

- `/resources/...`

## Access Control

Minimum requirement:

- the page must be protected from public access

Preferred requirement:

- require Clerk authentication
- allow access only if the current authenticated email is `michaelfackerell@gmail.com`

Reason:

- this is stronger and easier to audit than a simple password gate
- the project already uses Clerk auth
- the codebase already contains an email-based admin authorization pattern

Recommended implementation approach:

1. Require a valid Clerk session on the route or API endpoints.
2. Resolve the authenticated user's email.
3. Compare it against an allowlist containing `michaelfackerell@gmail.com`.
4. Return `403` for all non-allowed users.

Fallback option:

- a password gate may be added temporarily, but it should not be the main control if Clerk-based identity is available

## Existing Project Hooks To Reuse

- `requireAuth` middleware in [`src/server/middleware/clerkAuth.js`](/home/michael/proj/dcgame/src/server/middleware/clerkAuth.js)
- current-user profile endpoint in [`src/server/routes/users.js`](/home/michael/proj/dcgame/src/server/routes/users.js)
- admin-email pattern already used in [`src/server/routes/verseSong.js`](/home/michael/proj/dcgame/src/server/routes/verseSong.js)
- Clerk session state in [`src/client/AuthManager.js`](/home/michael/proj/dcgame/src/client/AuthManager.js)

## Page Goals

The page should let the authorized user:

- define a new content brief
- gather and store research inputs
- generate a draft with the approved writer prompt
- review citations and quotes
- add or select images
- edit metadata
- save drafts
- approve for publication
- publish into `/resources/...`

## Content Brief Fields

- audience
- cluster
- target keyword
- search intent
- article angle
- working title
- slug
- CTA
- VerseBattles product angle
- constraints
- notes

## Research Inputs

The page should support:

- source URL list
- short source notes
- extracted claims with attribution
- image ideas
- internal links to related VerseBattles pages

Each source should track:

- URL
- source title
- source type
- publication date if known
- why it is included
- notes on which claims are safe to use

## Generation Flow

1. Create or load a content brief.
2. Add source URLs and source notes.
3. Run outline generation.
4. Review outline before full draft generation.
5. Generate full draft.
6. Review factual claims, links, and quotes.
7. Add featured image and inline image plan.
8. Approve and publish.

## Quality Gate

The page should force a manual review checklist before publication:

- one audience only
- one search intent only
- real value beyond SEO
- no unsupported claims
- sourced claims attributed
- quotes used sparingly
- clear VerseBattles relevance
- distinct from existing published content
- clear CTA

The page should block publication if these checks are not completed.

## Draft Output Format

Each draft should store:

- title
- meta description
- slug
- summary
- markdown body
- source list
- internal link suggestions
- image plan
- review notes
- status

## Publishing Model

Status flow:

- `brief`
- `research`
- `outline`
- `draft`
- `review`
- `approved`
- `published`

Public output target:

- `/resources/<cluster>/<slug>.html`

Suggested clusters:

- `youth-pastors`
- `missions`
- `parents`
- `blog`

## SEO and Publishing Rules

- do not publish thin or repetitive pages
- do not auto-publish without manual approval
- update sitemap after publish
- require canonical URL per page
- include metadata and social image fields
- include internal links to relevant landing pages and the game

## Image Rules

Each page should have:

- one featured image concept
- optional product screenshots where relevant
- alt text

Images should be:

- relevant to the article
- specific to the audience
- not decorative filler

## Non-Indexing Rules For The Tool

The `/content-maker` page itself should:

- require auth
- return `X-Robots-Tag: noindex, nofollow` or equivalent
- avoid public links from indexable pages

## Recommendation

Use email-allowlisted Clerk auth as the primary gate.

That is the cleanest fit with the current codebase and is better than relying on a shared password alone.
