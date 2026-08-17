# Low-Poly 3D Assets

Runtime assets are GLB/glTF 2.0 files referenced by `manifest.json`. Keep source
art and Blender working files outside `public`; only optimized runtime files
belong here.

The first authored monster is Quaternius's CC0 `Ghost_Skull.gltf`, converted
into a single self-contained GLB. Its original file, license, and source notes are in
`resources/3d-source/quaternius-ultimate-monsters`.

## Character export contract

- Y-up, character feet at Y=0, facing +Z in the source file
- one skinned mesh and one material per character where practical
- base color plus optional ORM and normal textures; no 4K textures
- baked clips named `idle`, `walk`, `attack`, `hit`, and `death`
- no cameras, lights, environment maps, or unused animation takes
- apply transforms and remove hidden geometry before export
- use mesh compression only after verifying the browser loader and offline cache

`source: null` means the renderer must use its procedural fallback. Generated
assets should not replace a fallback entry until they pass the triangle,
texture, animation, silhouette, and phone-performance gates in the technical
design.

Run `npm run validate:3d` after adding a source. To make a missing authored
asset fail CI, use `node scripts/validate-low-poly-assets.mjs --require-source
--key monster.fear`. The validator checks GLB structure, triangle/material and
texture budgets, a skin, required clip names, and unwanted embedded lights or
cameras.

Rebuild the current Fear runtime asset with:

```sh
node scripts/convert-embedded-gltf-to-glb.mjs \
  resources/3d-source/quaternius-ultimate-monsters/Ghost_Skull.gltf \
  public/assets/3d/models/quaternius-ghost-skull.glb
```
