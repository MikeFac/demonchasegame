# Step 0 art pass — player, Fear, Doubt, Condemnation

Reference sheet: [`step0-cast-reference.png`](step0-cast-reference.png)  
Silhouette test: `output/step0/art/silhouettes-64.png` (generated, not required at runtime).

## Scope

Step 0 is a drop-in art pass only. Sprite **destination** sizes are unchanged, so
collision and spawning are untouched:

- Player: 96×96 sprite sheet, 2×2 frames of 48×48 (`PLAYER_WIDTH/HEIGHT = 48`).
- Fear / Doubt / Condemnation: 128×128 transparent PNGs, drawn at the existing
  `monster.width/height` (48 by default, scaled by `MonsterManager`).

The renderer draws the 128 px demon sources down to 48 px at runtime. This keeps
the source art crisp at device pixel ratios of 2 without changing gameplay sizes.

## Style targets

- 3/4 / front-readable character view, light from the top-left.
- One shared dark outline (`#07070c`).
- One shared 16-colour palette (see below), no dithering.
- Transparent background, clean alpha.
- Silhouette must read at 64 px; 32 px is a stress test.
- Colour identity:
  - **Player** — warm blue-grey tunic with gold cross/belt.
  - **Fear** — cold violet / blood red, wide wings.
  - **Doubt** — desaturated blue-grey, tall horns.
  - **Condemnation** — iron / ochre, heavy bulk and horns.

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
`output/imagegen/demon-reference-candidates-gpt-image-2/`:

- Fear: `fear-a.png`
- Doubt: `doubt-a.png`
- Condemnation: `condemnation-b.png`

They were processed locally with Pillow:

1. Connected background removal from the studio backdrop (including the soft
   ground shadow).
2. Crop to alpha bounds and fit to a 128 px canvas, bottom-aligned.
3. Colour-boost, then map to the shared 16-colour palette with no dithering.
4. Add a 2 px shared dark outline from the alpha silhouette.

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
