# Modular City Asset Kit Plan

Status: Proposed for the `low-poly-3d` branch

## Goal

Replace the visually plain dungeon walls with a reusable city/neighborhood environment that works in both 2.5D Adventure and 3D First Person, without changing combat, movement, mission logic, or the existing 2D Classic mode.

## Design principles

- Keep the server's rectangular obstacle/collision contract unchanged.
- Use a small number of reusable meshes rather than one asset per building.
- Make every asset readable from above and at street level.
- Prefer shared materials, texture atlases, merged geometry, and instancing for phones.
- Keep the current dungeon theme available as a selectable environment theme.
- Use generated image assets for materials and decals, not for collision-critical geometry.

## Initial visual kit

### Building modules

- Straight wall/facade section
- Window facade section
- Door/entrance section
- Outside corner
- Inside corner or alley end
- Flat roof
- Pitched roof
- Roof trim/parapet

### Street modules

- Asphalt road
- Sidewalk
- Grass/yard
- Road intersection
- Crosswalk or lane marking
- Curb and drain

### Props

- Tree and bush
- Fence segment and gate
- Streetlight
- Parked car
- Sign/shop board
- Bench, bin, or mailbox

The first kit should stay below roughly 20 mesh types and use a small shared material set.

## Asset production

1. Build the base meshes procedurally or as simple Blender-authored low-poly modules.
2. Create shared texture atlases and façade/decal variations with GPT Image-2 where useful.
3. Export optimized GLB assets only when a module needs authored geometry or animation.
4. Validate triangle count, texture dimensions, materials, and file size before integration.
5. Add authored assets to the existing 3D manifest with explicit orientation and scale values.

## Map generation

Add a `city` environment generator alongside the current maze generator.

- Generate a connected road grid first.
- Place building footprints inside blocks.
- Leave roads, sidewalks, and yards walkable as appropriate.
- Mark buildings and solid props in the same wall/collision representation already used by the game.
- Add deterministic seeds so missions and regression tests can reproduce layouts.
- Reserve clear spawn areas and combat arenas.

The first map should be a suburban neighborhood: broad roads, small houses, a park, and a few sightline-breaking structures. Later themes can reuse the kit for downtown, school, church, and industrial areas.

## Renderer integration

### Shared world data

Extend wall/environment records with a visual type and optional style seed while preserving `x`, `y`, `width`, and `height` collision fields.

### 2.5D Adventure

- Show roofs, footprints, roads, sidewalks, and prop silhouettes clearly.
- Use slightly exaggerated colors and roof shapes for readability.
- Keep building detail simple at distance.

### 3D First Person

- Show façades, doors, windows, streetlights, alleys, and close props.
- Use fog and distance culling to preserve suspense and performance.
- Keep line-of-sight occlusion based on the existing wall grid.

### 2D Classic

- Do not change the existing renderer.

## Mobile performance budget

Initial target for a loaded level:

- 20–40 visible building/prop material groups
- Preferably fewer than 100 draw calls for environment geometry
- Approximately 25,000–60,000 visible environment triangles, depending on device tier
- 512–2048px shared atlases, avoiding one texture per object
- No unnecessary per-object dynamic lights
- Distance culling and simpler distant variants

Measure on a real mid-range Android phone, not only desktop SwiftShader.

## Delivery phases

### Phase 1 — Renderer-ready city test scene

- Add a city theme flag and deterministic sample layout.
- Render modular buildings using existing wall rectangles.
- Add roads, sidewalks, grass, and two props.
- Confirm both 2.5D and first-person camera readability.

### Phase 2 — Production modular kit

- Replace placeholder geometry with authored modules.
- Add texture atlas, façade variations, roofs, doors, windows, and props.
- Add asset manifest entries and validation rules.

### Phase 3 — Gameplay integration

- Generate city maps on selected missions.
- Verify spawn safety, path connectivity, wall collision, shooting, and monster occlusion.
- Preserve dungeon maps as a selectable fallback.

### Phase 4 — Mobile optimization

- Merge or instance repeated modules.
- Add distance culling and low-detail variants.
- Test performance, loading time, memory, and context recovery on a phone.

### Phase 5 — Visual polish

- Add lighting presets, weather, fog, signage, decals, and themed landmarks.
- Add interiors only after exterior city navigation is stable.

## Acceptance criteria

- The same city map renders coherently in 2.5D and first-person modes.
- Building footprints remain collision-correct and reachable roads remain navigable.
- Monsters can hide behind buildings and remain blocked from shots through walls.
- No regression in 2D Classic mode.
- The scene remains within the mobile performance budget on a real phone.
- A city theme adds visual variety without requiring Tripo for ordinary buildings.
