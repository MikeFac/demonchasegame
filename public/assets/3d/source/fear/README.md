# Fear — Character Source Brief

Status: concept-turnaround preview queued; image-to-3D generation requires a
Tripo or Meshy account/API key.

This folder holds the reproducible source brief for the first authored monster.
The generated preview is a selection aid; only an optimized, validated GLB is
allowed in the runtime manifest.

## Art direction

Fear is a readable storybook adversary, not a realistic horror creature. Its
silhouette should communicate hesitation and intimidation at phone size:

- hunched, forward-leaning torso with a high faceted shoulder mantle
- long forearms and claw-like hands, but sturdy legs suitable for a biped rig
- two swept-back asymmetric horns framing a small hooded head
- deep violet body, muted indigo armor plates, warm amber eyes and chest rune
- large planar shapes and deliberate hard edges; almost no surface noise
- no weapon, cape, loose chains, smoke, transparent parts, or separate debris

Target runtime contract: 2,500–4,000 triangles, one material, one 512px atlas,
Y-up, feet at Y=0, facing +Z, and clips named `idle`, `walk`, `attack`, `hit`,
and `death`.

## Turnaround prompt

```text
Use case: stylized-concept
Asset type: game character concept turnaround for image-to-3D generation
Primary request: one consistent low-poly monster named Fear, shown in four
orthographic views: front, three-quarter front, exact side, and rear
Scene/backdrop: clean warm light-gray studio sheet, four evenly spaced views
Subject: hunched biped with a high faceted shoulder mantle, long forearms,
sturdy riggable legs, claw-like hands, two swept-back asymmetric horns, a small
hooded head, warm amber eyes, and one simple amber chest rune
Style/medium: polished low-poly 3D character render, large planar facets,
storybook spiritual-battle tone, game-ready silhouette
Composition/framing: full body and feet visible in every view, identical neutral
A-pose and proportions in every view, orthographic camera, generous padding
Lighting/mood: neutral soft studio lighting that preserves shape and color
Color palette: deep violet body, muted indigo armor planes, restrained amber
eyes and chest rune
Constraints: exactly one character repeated as four consistent views; no text;
no labels; no weapon; no cape; no smoke; no floor plane; no cast shadow; no
extra props; no cropped feet or horns; no logos; no watermark
Avoid: realistic gore, high-frequency skin detail, fur, cloth simulation,
transparent parts, dramatic perspective, different poses or designs per view
```

## Four image-to-3D candidates

Generate all four from the same selected turnaround so selection measures mesh
quality rather than concept drift.

| Candidate | Generation intent | Selection signal |
|---|---|---|
| A — faithful | Default image-to-model, preserve the complete silhouette | Best reference match and horn/hand separation |
| B — clean | Geometry-focused generation, simple material, reduced detail | Fewest floating parts and easiest joint cleanup |
| C — mobile | Low-detail generation or immediate Smart LowPoly pass at ~3k tris | Strongest silhouette at 160px screen height |
| D — riggable | Preserve limb gaps, neutral A-pose, symmetric joint regions | Best shoulders, elbows, hips, knees, and ankle loops |

Do not rig the raw winner. First remove floating geometry, close holes, repair
normals, simplify hidden faces, keep limb gaps open, unwrap/atlas, and validate
the cleaned mesh. Remeshing after rigging destroys or invalidates the skeleton.

## Selection scorecard

Score each item 0–2; select only candidates scoring at least 10/12.

- recognizable Fear silhouette at 160px tall
- both arms, legs, hands, horns, and feet are separate and complete
- no large holes, interior shells, or disconnected floating islands
- elbows, shoulders, hips, knees, and ankles can deform cleanly
- decimation to 4,000 triangles preserves the face, rune, and outline
- one 512px atlas remains legible under neutral mobile lighting
