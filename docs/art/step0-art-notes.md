# Step 0 art pass — player + all 18 demon types

Reference sheets:

- Focus cast (player / Fear / Doubt / Condemnation):
  [`step0-cast-reference.png`](step0-cast-reference.png)
- Full demon cast (all 18):
  [`demon-cast-reference.png`](demon-cast-reference.png)
- Silhouette tests: `output/step0/art/silhouettes-64.png` and
  `output/step0/art/demon-silhouettes-64.png`.

## Scope

Step 0 is a drop-in art pass only. Sprite **destination** sizes are unchanged, so
collision and spawning are untouched:

- Player: 96×96 sprite sheet, 2×2 frames of 48×48 (`PLAYER_WIDTH/HEIGHT = 48`).
- All 18 demon types: 128×128 transparent PNGs, drawn at the existing
  `monster.width/height` (48 by default, scaled by `MonsterManager`).
- Goliath: 192×192 source (drawn at the boss size), same palette/outline.

The renderer draws the sources down to the gameplay size at runtime. This keeps
the source art crisp at device pixel ratios of 2 without changing gameplay sizes.

## Style targets

- 3/4 / front-readable character view, light from the top-left.
- One shared dark outline (`#07070c`).
- One shared 16-colour palette (see below), no dithering.
- Transparent background, clean alpha.
- Silhouette must read at 64 px; 32 px is a stress test.
- Colour identity:
  - **Player** — warm blue-grey tunic with gold cross/belt.
  - **Fear / Condemnation / Pride / Despair** — cold violet, blood red or iron.
  - **Doubt / Blindness** — desaturated blue-grey.
  - **Depression / Temptation** — near-black robes.
  - **Swarm / Shame / Infirmity** — red or ember accents.
  - **Goliath** — bronze/iron armour, human silhouette.

## Palette

| Hex | Use |
|---|---|
| `#07070c` | shared outline |
| `#12101a` | near-black |
| `#231b28` | deep violet |
| `#3b2238` | Fear dark |
| `#5d2b35` | Fear mid |
| `#8a3d3c` | Fear red |
| `#b85f4f` | Fear light |
| `#d99a7a` | skin / warm light |
| `#1b2733` | deep blue |
| `#2d4054` | slate blue |
| `#4f6272` | mid blue-grey (player tunic) |
| `#8a95a3` | pale blue-grey |
| `#c9d1da` | light steel |
| `#d9a441` | gold / ember |
| `#8a5a2b` | leather / iron warm |
| `#ff7a1a` | ember orange |

## Source and processing

The demon sources are the existing AI-generated concept candidates in
`output/imagegen/demon-reference-candidates-gpt-image-2/`. One candidate per type
was chosen by 64 px silhouette readability:

| Type | Candidate | Output file |
|---|---|---|
| Fear | `fear-a.png` | `images/monsters/fear_demon.png` |
| Doubt | `doubt-a.png` | `images/monsters/doubt_spirit.png` |
| Condemnation | `condemnation-b.png` | `images/monsters/condemnation_demon.png` |
| Unbelief | `unbelief-a.png` | `images/monsters/unbelief_demon.png` |
| Ignorance | `ignorance-a.png` | `images/monsters/ignorance_spirit.png` |
| Depression | `depression-a.png` | `images/monsters/depression_spirit.png` |
| Strife | `strife-a.png` | `images/monsters/strife_spirit.png` |
| Confusion | `confusion-b.png` | `images/monsters/confusion_spirit.png` |
| Infirmity | `infirmity-a.png` | `images/monsters/infirmity_spirit.png` |
| Deception | `deception-a.png` | `images/monsters/DECEPTION_SPIRIT1.png` |
| Despair | `despair-b.png` | `images/monsters/DISCOURAGEMENT.png` |
| Pride | `pride-a.png` | `images/monsters/PRIDE.png` |
| Temptation | `temptation-a.png` | `images/monsters/JEZEBEL.png` |
| Poverty | `poverty-a.png` | `images/monsters/DEMON-OF-POVERTY.png` |
| Shame | `shame-a.png` | `images/monsters/SHAME-ACCUSATION.png` |
| Blindness | `blindness-a.png` | `images/monsters/SPIRITUALBLINDNESS.png` |
| Swarm | `swarm-a.png` | `images/monsters/DEMON-SWARM.png` |
| Goliath | `goliath-b.png` | `images/monsters/goliath_giant.png` |

They were processed locally with Pillow:

1. Connected background removal from the studio backdrop.
2. Keep the main alpha component (removes detached background islands).
3. Per-type pale-background stripping for dark characters. The baked studio
   shadow is kept as a soft grounding shadow; stripping it removed dark legs on
   several types. Pale characters such as Doubt keep their highlights.
4. Crop to alpha bounds and fit to a 128 px canvas (Goliath 192), bottom-aligned.
5. Colour-boost, then map to the shared 16-colour palette with no dithering.
6. Add a 2 px shared dark outline from the alpha silhouette.

The player sheet keeps the existing gameplay-readable poses and sword, then
applies the same palette, plus a gold cross and belt accent.

No image-generation API or local diffusion model was available in the build
environment, so the pass reuses the existing AI candidates rather than generating
new variants. **No verse text is present in any generated or processed image.**

## VFX set

`images/effects/step0-*.png` (64×64, transparent):

- `step0-spark.png` — hit spark / muzzle flash overlay.
- `step0-ring.png` — spawn and impact ring.
- `step0-smoke.png` — death burst / dust puff.
- `step0-holy.png` — correct-answer / soul-wisp glow.

`VisualJuice.js` + `Renderer.drawEffects()` still draw procedural fallbacks, so
the effects work if these textures fail to load.

## Review notes

- Check generated art for doctrinal/visual issues before shipping.
- Keep `PLAYER_WIDTH/HEIGHT` and `MONSTER_WIDTH/HEIGHT` independent from source
  image dimensions.
- Do not add Scripture text to generated images.
- The source candidates are untracked in `output/imagegen/`; back them up if the
  pass needs to be regenerated.
