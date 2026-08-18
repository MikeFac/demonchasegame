# Low-Poly 3D Assets

Runtime assets are GLB/glTF 2.0 files referenced by `manifest.json`. Keep source
art and Blender working files outside `public`; only optimized runtime files
belong here.

The runtime now includes seven authored, self-contained animated GLBs under
`models/`: the default player plus Fear, Doubt, Condemnation, Confusion,
Deception, and Ignorance. Their source
images, Tripo task records, rigging evidence, and deformation contact sheets
remain under `output/tripo` and `output/imagegen`.

## Character export contract

- Y-up, character feet at Y=0, facing +Z in the source file
- one skinned mesh and one material per character where practical
- base color plus optional ORM and normal textures; no 4K textures
- baked clips named `idle`, `walk`, `attack`, `hit`, and `death`
- no cameras, lights, environment maps, or unused animation takes
- apply transforms and remove hidden geometry before export
- use mesh compression only after verifying the browser loader and offline cache

`source: null` means the renderer must use its procedural fallback. Authored
assets are only enabled after passing the triangle, texture, animation,
silhouette, and browser deformation gates. The Fear asset is a featured/boss
tier model at 14,468 triangles; profile it on a real phone before displaying
several copies simultaneously.

Run `npm run validate:3d` after adding a source. To make a missing authored
asset fail CI, use `node scripts/validate-low-poly-assets.mjs --require-source
--key monster.fear`. The validator checks GLB structure, triangle/material and
texture budgets, a skin, required clip names, and unwanted embedded lights or
cameras.

The runtime files are copied from the accepted animated outputs after the
deformation gate. To add another character, follow:

```sh
docs/plans/LUNA_3D_ASSET_PIPELINE_RUNBOOK.md
```
