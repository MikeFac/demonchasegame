# Learn Mode Deeplink Plan

## Goal

Add a direct URL entry into the existing verse-learning flow for audiences that care more about Scripture meditation and review than gameplay.

## URL contract

- `/?mode=learn`
- `/?mode=learn&quality=Faith`
- `/?mode=learn&category=Courage`

`quality` is the preferred parameter name. `category` is supported as an alias.

## Desired behavior

1. Skip the normal menu.
2. Start a standard solo game using the existing boot flow.
3. Immediately enter review/learn mode after initialization using the full verse set.
4. If a category parameter matches an available category, start review in that category.
5. If the category is missing or invalid, still enter review mode with the normal fallback category.
6. Exiting learn mode should return to Missions/overland, not gameplay.

## Constraints

- Reuse the existing `_enterReviewAfterInit` path.
- Do not change the `?play=1` ad flow.
- Do not change the normal Solo, Missions, or Learn buttons beyond keeping them compatible.
- Keep changes isolated to `game.js` plus a cache-bust bump.
- Clear mission/onboarding override state before the learn deeplink starts so review mode is not restricted to intro-mission categories.

## Implementation notes

- Detect `mode=learn` in startup URL parsing.
- Read `quality` or `category` from the query string.
- Normalize the requested category against `organizedVerses` case-insensitively after verse data is loaded.
- Allow `_enterReviewAfterInit` to hold either:
  - `true` for legacy behavior, or
  - an options object passed through to `ReviewMode.startReviewMode(options)`

## Validation

- `?mode=learn` opens review mode directly with all categories available.
- `?mode=learn&quality=Faith` opens review mode in Faith when available.
- Invalid categories fail soft and still open review mode.
- Standard menu flow still works.
- `?play=1` still behaves the same.
- Exiting from the deeplinked learn mode returns to Missions.
