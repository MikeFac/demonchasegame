# Low-Poly 3D Technical Design

Status: Phase 0 contract for the `low-poly-3d` prototype branch.

## Outcome

Prove that one complete solo combat level can run as readable, stylized low-poly
3D at 30 fps on a mid-range Android phone without changing the shared game
rules. The 2D renderer remains the default and the existing ray-cast/billboard
renderer remains the fallback.

## Decisions

- Renderer: Three.js/WebGL2, selected only for `viewMode=3d` when WebGL and the
  Three.js runtime are available.
- Camera: elevated third-person chase camera. This shows the player silhouette,
  makes melee distance readable, and is more comfortable on phones than free
  look.
- Coordinates: game `(x, y)` maps to Three.js `(x, 0, z)`, with game `y`
  becoming world `z`. Entity positions are centers; wall positions are converted
  from top-left rectangles to mesh centers.
- Canvas: WebGL world canvas below the existing transparent 2D game canvas. The
  existing HUD, quiz, menus, and modal code stays on the 2D canvas.
- First asset milestone: procedural faceted player, demons, pickups, bullets,
  walls, and props. Generated GLB assets replace these through a manifest later.
- Fallback: if Three.js/WebGL initialization fails, use the existing
  `Renderer3D` billboard implementation. The 2D path is not changed.
- Asset format: GLB/glTF 2.0, one material atlas per character family, baked
  animations, no embedded cameras or lights.

## Runtime Budgets

These are hard prototype acceptance limits, not stretch goals.

| Budget | Mid-range phone target |
|---|---:|
| Frame rate | 30 fps sustained for 10 minutes |
| Render resolution | 0.75 device-pixel ratio, max 800x600 internal |
| Visible triangles | 100k target, 150k hard maximum |
| Draw calls | 75 target, 100 hard maximum |
| GPU texture memory | 48 MB target, 64 MB hard maximum |
| Materials | 1 per character, shared environment atlas |
| Dynamic lights | 0; hemisphere + one directional light |
| Real-time shadows | none; blob decals only |
| Simultaneous animated rigs | 12 target, 20 hard maximum |

Per-asset budgets:

- normal demon: 2,500-4,000 triangles, one 512px texture set
- boss demon: 6,000-8,000 triangles, one 1024px texture set
- player: 4,000-6,000 triangles, one 1024px texture set
- prop: 100-1,000 triangles; instance repeated props
- wall module: 12-100 triangles; instance all repeated walls
- animation clips: idle, walk, attack, hit, death; 20-30 fps baked keys

## Asset Pipeline

Use image-to-3D, not unconstrained text-to-3D, for production candidates:

1. Create a front/three-quarter concept sheet with one art direction, neutral
   lighting, a plain background, and an A-pose for humanoids.
2. Generate four image-to-3D candidates and select by silhouette and topology,
   not texture detail.
3. Run low-poly remesh/decimation before rigging.
4. Repair silhouette, joints, normals, UV seams, and disconnected geometry in
   Blender.
5. Rig and retarget only after mesh cleanup.
6. Bake a small animation set, atlas textures, export GLB, and run the asset
   validator before adding the file to the manifest.

Recommended prototype service: **Tripo image-to-model + Smart LowPoly + Tripo
rig/retarget**. Its current API explicitly supports low-poly remeshing, GLB
rigging, biped/quadruped rig types, and retargeted animation. Mesh editing must
come before rigging because remeshing strips skeleton data.

Recommended alternative: **Meshy 6** for the simplest all-in-one workflow and
for props. It supports image/text generation, remesh, texturing, rigging, and
animation. Use a paid plan for shipped assets so ownership does not depend on
CC BY attribution.

Open/local experiments: **TRELLIS.2** is a strong MIT-licensed image-to-3D
option for static props and high-fidelity source meshes, but its 4B model and
H100-oriented reference timings make it a workstation/cloud pipeline, not a
phone runtime or the simplest character-rig pipeline. Do not standardize on
Hunyuan3D 2.0 without a license review because its community license has
territory and scale conditions.

Primary references:

- Tripo animation API: https://platform.tripo3d.ai/docs/animation
- Meshy documentation: https://docs.meshy.ai/en
- Meshy commercial asset terms: https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained
- Adobe Mixamo FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Microsoft TRELLIS.2: https://github.com/microsoft/TRELLIS.2
- Tencent Hunyuan3D 2.0 license: https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE

## Visual Direction

Target a bright, faceted "storybook spiritual battle" rather than generic dark
horror. Interest should come from silhouette, color, movement, and atmosphere,
not expensive effects:

- distinct demon silhouettes by vice/category: horn shape, posture, limb ratio,
  armor language, and one dominant accent color
- chunky architecture with arches, broken columns, rune stones, banners, and
  sparse instanced debris
- vertex-color variation and one small texture atlas rather than unique 4K maps
- emissive eyes/runes, fog planes, particles, hit flashes, rim-light colors, and
  blob shadows
- authored color scripts per terrain theme: daylight stone, violet crystal,
  warm earth, furnace, storm, and garden variants
- bosses reuse a family rig but add scale, silhouette attachments, color phase,
  and attack effects

Avoid real-time shadows, post-processing stacks, transparent full-screen fog,
unique materials per monster, high-frequency PBR detail, and simulated cloth.

## Renderer Contract

`RendererThreeJS.drawGame(...)` keeps the existing renderer signature. It owns:

- Three.js scene, camera, lights, fog, wall instances, entity mesh pools
- mapping current state into transforms and cheap effect parameters
- projected positions needed by 2D world-space feedback

The inherited 2D renderer owns:

- top bar, HUD, quiz, inventory, menus, goals, mission/story overlays
- accessibility/readability and all input hit rectangles

Generated asset loading will use a manifest keyed by semantic role rather than
file names, for example `monster.fear`, `monster.doubt`, `player.default`, and
`prop.healing`. A missing or failed GLB always falls back to procedural geometry.

## Prototype Gates

1. Procedural slice: walls, floor, player, three demon silhouettes, bullets,
   pickups, chase camera, HUD, quiz, and fallback all work.
2. Combat slice: play level 1 through victory with correct movement, firing,
   damage, death, and modal behavior.
3. Asset slice: replace one player and one demon family with validated GLBs;
   verify idle/walk/hit/death clips.
4. Phone gate: sustain 30 fps for 10 minutes on a Snapdragon 6xx-class device,
   stay below draw/texture budgets, and record battery/thermal behavior.
5. Art gate: three demon families read clearly at normal phone size and look
   cohesive beside the player and environment.

Only after gates 3-5 should the project generate the full monster inventory.
