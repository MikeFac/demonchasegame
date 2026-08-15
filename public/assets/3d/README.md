# Low-Poly 3D Assets

Runtime assets are GLB/glTF 2.0 files referenced by `manifest.json`. Keep source
art and Blender working files outside `public`; only optimized runtime files
belong here.

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

