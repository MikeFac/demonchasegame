# Rig-ready low-poly character pipeline

## Decision

Generate the deforming humanoid body as a clean, wingless A-pose asset. Rig and
animate that body first. Treat large wings, tails, weapons, and similar pieces as
separate accessories attached after the body rig is proven.

This is a production constraint, not an artistic downgrade. The finished demon
can retain the same silhouette and materials while avoiding an ambiguous
six-limbed surface during automatic biped skeleton and skin-weight inference.

## Evidence from the Fear proof

- H3.1 produced a visually strong model, but the smart-retopology derivative had
  14,914 triangles, 31 disconnected surfaces, 131 boundary edges, and 22
  non-manifold edges.
- Legacy and v2.5 biped rig jobs both reached 99% and then hit Tripo error 2018 at
  the service's twenty-minute limit. Failed tasks consumed zero credits.
- Tripo documents error 2018 as "Model too complex" and recommends reducing
  model complexity or polycount.
- A locally cleaned derivative retained the appearance while reducing the model
  to one connected component, zero non-manifold edges, and 14,468 triangles.
- Adobe's official Mixamo requirements warn that wings, tails, large clothing,
  and other extra appendages can prevent humanoid auto-rigging. They recommend
  a clean, connected humanoid in a neutral pose with distinguishable and
  separated head, torso, arms, and legs.
- Tripo's official game-character recipe recommends P1 at a 5,000-face limit.

## Reference-image specification

Use the existing character candidate only as an identity/style reference. The
rigging reference must show:

- full body, centered, front view, orthographic or long-lens presentation;
- symmetrical neutral A-pose, arms 35–45 degrees from the torso;
- visible gaps between upper arms and torso and between both legs;
- straight elbows and knees, level shoulders, feet flat and shoulder-width;
- clear hands, wrists, ankles, head, neck, waist, and groin landmarks;
- plain light background and even studio lighting;
- no wings, tail, weapon, cape, floating armor, floor shadow, scenery, or text;
- the same face, horns, skin, proportions, colors, and material identity as the
  approved demon concept.

Suggested GPT-Image-2 edit prompt:

> Preserve this demon's exact visual identity, face, horns, muscular anatomy,
> dark charcoal skin, subtle purple accents, and realistic game-character
> finish. Convert it into a rigging reference: full-body centered front view in
> a symmetrical neutral A-pose, arms 40 degrees away from the torso, straight
> elbows, palms forward, legs slightly apart, feet flat, all joints clearly
> visible. Remove the wings, tail, props, scenery, floor shadow, and text. Plain
> light-gray background, even studio lighting, orthographic character-sheet
> presentation. No dramatic pose, no foreshortening, no occluded limbs.

Generate wing references separately. Each wing should be a clean low-poly game
accessory in a neutral open pose, with an obvious shoulder attachment root. Do
not bake the wings into the body mesh before the body deformation test passes.

## Tripo P1 body generation

Use `scripts/tripo-v3-image-to-model.mjs` with:

```text
TRIPO_MODEL=P1-20260311
TRIPO_FACE_LIMIT=5000
TRIPO_MAX_CREDITS=50
```

Required API parameters:

```json
{
  "model": "P1-20260311",
  "face_limit": 5000,
  "texture": true,
  "pbr": true,
  "texture_alignment": "original_image",
  "orientation": "align_image",
  "export_uv": true
}
```

P1 standard-textured image-to-model costs 50 credits. It replaces the previous
30-credit H3.1 generation plus 30-credit retopology pair and is specifically
designed for clean, mobile/game topology.

## Acceptance gates before paid rigging

1. Visual: identity is retained; no missing hands, feet, horns, or facial area.
2. Geometry: 4,000–6,000 triangles preferred; one principal body component; no
   invalid positions/indices, degenerate faces, or non-manifold edges.
3. Pose: both arms and legs remain visibly separated in front and side views.
4. Tripo rig-check returns `riggable: true` and `rig_type: biped`.
5. Static mobile budget: body GLB preferably under 5 MB with a 1024 texture set.

Do not submit a paid rig if these gates fail. Regenerate the P1 body or repair the
reference pose first.

## Rig and animation

- Rig with v2.5 biped and Tripo-native bone names first; Mixamo naming is an
  alternative if cross-tool compatibility is needed.
- Retarget in-place clips: idle, walk, slash/attack, hurt, and fall/death.
- Keep the downloaded rigged and animated GLBs immediately; signed URLs expire.
- A successful rig costs 25 credits. Five retargeted animations cost 50 credits.

For a ten-demon set, standardize the same skeleton specification. Test whether
one set of bone-name animation clips can be reused across the other nine rigs in
Three.js before buying duplicate retarget tasks. If reuse works, the rough Tripo
budget is 500 credits for ten P1 bodies + 250 for ten rigs + 50 for one five-clip
set = 800 credits. If reuse fails, animation costs must be budgeted per demon.

## Wings and other accessories

Start with rigid attachment: parent each separate wing mesh to an upper-spine or
shoulder attachment node and keep it static during body animation. This is cheap,
stable, and sufficient at typical phone gameplay distance.

Later quality tiers:

1. Rigid wings with a small idle sway around the attachment pivot.
2. Two or three authored wing bones with procedural fold/flap motion.
3. Fully skinned membrane deformation only for boss characters and close-ups.

Target combined body + wings at 7,000–9,000 visible triangles for ordinary
monsters and keep materials/draw calls consolidated.

## Deformation test

Use the deterministic Three.js viewer in the character output folder. Capture
0%, 25%, 50%, and 75% poses for every clip and record `render_game_to_text`.

Reject a result if any pose shows:

- collapsed or ballooned torso;
- detached hands, feet, head, or accessories;
- elbows/knees bending backward;
- vertices exploding outside normal character bounds;
- severe shoulder or groin tearing;
- persistent floor penetration in idle/walk;
- wings inheriting arm deformation unexpectedly.

Only after all five clips pass should the asset be added to the game manifest.

## Free/manual fallbacks

- Mixamo is free with an Adobe ID and supports browser-based marker placement,
  but only for clean humanoids; upload the wingless body, not the final combined
  demon. It accepts FBX, OBJ, or ZIP rather than GLB.
- AccuRIG is free for commercial use and supports A/T-pose humanoids with manual
  joint refinement, but the desktop application is Windows-only.
- Manual Blender cleanup remains a final fallback. It can be scripted for the
  user, but it is slower than proving the P1 body-first pipeline.
