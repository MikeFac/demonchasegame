# Luna runbook: low-poly character generation, rigging, and validation

## Purpose

This is the operational handoff for continuing the project's 3D character work
with `gpt-5.6-luna`. The first human player pipeline is proven. Luna should
follow these exact gates and scripts instead of redesigning the workflow.

Use a stronger model only when a new failure mode appears, subtle visual
judgment is required, or renderer/gameplay integration becomes architecturally
complex.

## Workspace rules

- Work only inside `/home/michael/proj/dcgame`.
- The active branch is `low-poly-3d`.
- Every shell command must literally begin with `node -e`.
- Never print `TRIPO_API_KEY`; it is loaded from the project `.env`.
- Preserve the dirty worktree. Do not stage or modify unrelated files.
- Use `apply_patch` for text edits. Generated binary assets may be copied into
  the project with Node filesystem APIs.
- Do not integrate an asset into the game until its deformation report and
  visual contact sheet have passed.
- If client JavaScript is changed, follow `AGENT.md`: bump the version in
  `index.html` and restart `./restart-server.sh`. Asset generation and tests do
  not require a restart.

## Proven default-player result

Reference image:

```text
output/imagegen/player-rig-ready/player-default-a-pose.png
```

The exact image prompt is recorded in:

```text
output/imagegen/player-rig-ready/README.md
```

Tripo output root:

```text
output/tripo/player-default-p1-5000-2026-08-18
```

Task IDs:

| Stage | Task ID | Cost | Status |
|---|---|---:|---|
| P1 image-to-model | `b9a6cc4c-1da0-40d7-9fee-261f0ec9fe33` | 50 | success |
| free rig-check | recorded in `rigged-and-animated/source-rig-check.json` | 0 | success, biped |
| v2.5 biped rig | `2618eade-da14-463f-a4a0-60ead940087f` | 25 | success |
| five-clip retarget | `3e92bde4-630a-4406-b800-b9ba693e4f1c` | 50 | success |

Final animated asset:

```text
output/tripo/player-default-p1-5000-2026-08-18/rigged-and-animated/animations/model_url.glb
```

Measured result:

- 2.24 MB animated GLB;
- 4,976 triangles;
- one mesh, one primitive, one material, three embedded texture images;
- one skin, 28 joints;
- five embedded clips, 87 channels per clip;
- all 20 deterministic browser poses passed with no console errors.

Animation clips in the single GLB:

| Game role | Embedded clip | Duration |
|---|---|---:|
| idle | `preset:idle` | 15.375 s |
| walk | `preset:walk` | 2.375 s |
| attack | `preset:slash` | 6.625 s |
| hit | `preset:hurt` | 13.875 s |
| death | `preset:fall` | 3.0417 s |

Deformation artifacts:

```text
output/tripo/player-default-p1-5000-2026-08-18/rigged-and-animated/deformation-test/animated/report.json
output/tripo/player-default-p1-5000-2026-08-18/rigged-and-animated/deformation-test/animated/contact-sheet.png
```

Visual conclusion: no collapsed torso, detached limbs, exploding vertices, or
obvious shoulder/knee tearing. The `hurt` animation is visually dramatic and
airborne, and both `hurt` and `slash` are long. Deformation passes, but gameplay
integration should trim or speed these clips rather than playing their entire
durations for every hit/attack.

## The reliable body-generation recipe

Use GPT-Image-2 through the built-in image-generation skill to make a rigging
reference with:

- standard humanoid proportions;
- exact full body on a plain light-gray background;
- symmetrical A-pose, arms 35–45 degrees from the torso;
- visible gaps between arms/torso and both legs;
- straight elbows/knees and clearly visible hands, wrists, ankles, and groin;
- no weapon, shield, cape, wings, tail, floor, shadow, scenery, or text.

Keep equipment separate. A sword should later be attached to a hand bone. For
winged demons, rig the humanoid body first and attach wings afterward as rigid or
lightly skinned accessory meshes.

Generate the body directly with Tripo P1. Do not use H3.1 followed by smart
retopology for routine mobile characters.

```bash
node -e "process.env.TRIPO_INPUT_IMAGE='output/imagegen/<character>/<a-pose>.png';process.env.TRIPO_OUTPUT_DIR='output/tripo/<character>-p1-5000-<date>';process.env.TRIPO_MODEL='P1-20260311';process.env.TRIPO_FACE_LIMIT='5000';process.env.TRIPO_MAX_CREDITS='50';import('./scripts/tripo-v3-image-to-model.mjs')"
```

Expected cost is 50 credits for P1 image-to-model with standard PBR textures.
Expected body size is around 5,000 triangles and roughly 1 MB.

## Pre-rig gates

Inspect the Tripo preview and run both analyzers:

```bash
node -e "const{spawnSync}=require('child_process');const x=spawnSync(process.execPath,['scripts/analyze-tripo-animation-glbs.mjs','output/tripo/<character>-p1-5000-<date>'],{encoding:'utf8'});console.log(x.stdout);console.error(x.stderr);process.exitCode=x.status||0"
```

```bash
node -e "const{spawnSync}=require('child_process');const x=spawnSync(process.execPath,['scripts/diagnose-glb-topology.mjs','output/tripo/<character>-p1-5000-<date>/model_url.glb'],{encoding:'utf8'});console.log(x.stdout);console.error(x.stderr);process.exitCode=x.status||0"
```

Required:

- recognizable, complete character with correct pose and no fused limbs;
- preferably 4,000–6,000 triangles;
- no invalid positions/indices, degenerate triangles, or duplicate triangles;
- free Tripo rig-check must return `riggable: true`, `rig_type: biped`.

Do not over-reject a P1 mesh solely for disconnected/open/non-manifold edges.
The successful player had five surface components, 23 boundary edges, and 47
non-manifold edges. Low complexity, clear pose, and the biped rig-check were more
predictive than watertightness.

## Rig and animate

The rig script performs/resumes the free rig-check, v2.5 biped rig, five-clip
retarget, immediate downloads, task records, and credit caps:

```bash
node -e "process.env.TRIPO_LOW_POLY_DIR='output/tripo/<character>-p1-5000-<date>';process.env.TRIPO_RIG_MODEL='v2.5-20260210';process.env.TRIPO_RIG_SPEC='tripo';import('./scripts/tripo-v3-rig-and-animate.mjs')"
```

Expected additional cost:

- rig-check: free;
- successful rig: 25 credits;
- five animations: 50 credits;
- total after generation: 75 credits;
- full generated + animated character: 125 credits.

The retarget endpoint returns one `animations/model_url.glb` containing all five
clips. Do not assume there will be five separate GLBs.

## Recovery and credit safety

- Task IDs are written to `request.json` immediately after submission.
- If connectivity or a local poller stops, rerun the identical command. The
  script resumes saved task IDs rather than submitting duplicates.
- Tripo download URLs expire quickly. Keep the resumable poller running when a
  successful task is near completion so it downloads immediately.
- A queued or running task freezes credits. Do not infer cost from the available
  account balance while concurrent tasks exist.
- The rig script must use each task's `credits_consumed` value. It was patched
  after a shared-balance delta falsely included concurrent demon work.
- Failed error-2018 rig attempts consumed zero credits, but always verify the
  task record and `/account/balance`.
- Never repeat an identical task after two error-2018 failures. Change the
  source pose, lower complexity, use P1, or separate appendages.

Safe balance check:

```bash
node -e "import('dotenv/config').then(async()=>{const r=await fetch('https://openapi.tripo3d.ai/v3/account/balance',{headers:{Authorization:'Bearer '+process.env.TRIPO_API_KEY}});const j=await r.json();console.log(JSON.stringify(j.data,null,2))})"
```

## Deformation validation

The local server must already be available at `http://127.0.0.1:3500`. Run:

```bash
node -e "const{spawnSync}=require('child_process');const x=spawnSync(process.execPath,['scripts/test-tripo-animation-deformation.mjs','output/tripo/<character>-p1-5000-<date>/rigged-and-animated'],{encoding:'utf8',timeout:180000});console.log(x.stdout);console.error(x.stderr);process.exitCode=x.status||0"
```

This uses the standard web-game Playwright client and the deterministic Three.js
viewer. It captures 0%, 25%, 50%, and 75% of idle, walk, attack, hit, and death.

All 20 tests must report `PASS`. Then build a visual contact sheet:

```bash
node -e "const{spawnSync}=require('child_process'),path=require('path');const base='output/tripo/<character>-p1-5000-<date>/rigged-and-animated/deformation-test/animated';const roles=['idle','walk','attack','hit','death'],times=['00','25','50','75'];const files=roles.flatMap(r=>times.map(t=>path.join(base,r+'-'+t,'shot-0.png')));const x=spawnSync('montage',[...files,'-tile','4x5','-geometry','320x240+4+4','-background','#1b1f2a',path.join(base,'contact-sheet.png')],{encoding:'utf8'});console.log(x.stdout);console.error(x.stderr);process.exitCode=x.status||0"
```

Visually reject:

- collapsed/ballooned torso;
- detached head, hands, feet, or clothing;
- backward elbows/knees;
- extreme shoulder/groin tearing;
- exploding vertices or huge bounds;
- unexpected appendage deformation;
- persistent floor penetration in idle/walk.

Also judge whether clip semantics and duration suit gameplay. Passing geometry is
not enough.

## Demon lesson and current state

The first Fear demon used H3.1 + smart retopology:

```text
output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000
```

Its original retopology was 14,914 triangles with 31 surface components and 22
non-manifold edges. Three rig attempts timed out with Tripo error 2018 and cost
zero. The repair script created `rig-source-cleaned.glb` with one connected
component, zero non-manifold edges, and 14,468 triangles while preserving its
appearance.

The cleaned/direct-upload demon rig task
`ae8ac0e9-3da8-46d2-921c-09de558ee1e3` succeeded and downloaded a 3.30 MB
rigged GLB. Animation task `22117474-d1d8-4205-a63a-58459d80fe17` also
succeeded. Its final animated GLB is 6.95 MB with 14,468 triangles, one skin, 88
joints, and five clips with 267 channels each.

All 20 deterministic demon poses passed. Contact-sheet review found coherent,
substantial wing folding/sweeping during attack and death without exploding
vertices, detached geometry, or obvious membrane collapse:

```text
output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/rigged-and-animated/deformation-test/animated/report.json
output/tripo/fear-b-v3.1-standard-2026-08-18/low-poly-10000/rigged-and-animated/deformation-test/animated/contact-sheet.png
```

The result is visually successful, but 14,468 triangles, 88 joints, and a 6.95
MB animated file are a boss/featured-monster tier rather than the ordinary
mobile-monster target. Profile it on a real phone before shipping several such
characters simultaneously.

For subsequent demons, prefer the documented body-first P1 pipeline in
`docs/plans/RIG_READY_CHARACTER_PIPELINE.md` instead of relying on repairs.

## Integration boundary

Do not change `public/assets/3d/manifest.json` or replace `player.default` merely
because an asset passes deformation. Integration needs a separate task that:

1. copies/optimizes the accepted GLB into the shipping asset folder;
2. maps canonical roles to embedded clip names;
3. trims/speeds long attack and hit clips;
4. attaches the sword to the correct hand bone;
5. validates third-person display and first-person local-player hiding;
6. profiles file size, draw calls, visible triangles, memory, and FPS on a phone;
7. runs all three-view regressions before committing.

## Model allocation

Use Luna for repeated generation orchestration, task recovery, diagnostics,
browser matrices, reports, and mechanical integration following this runbook.
Escalate to Terra/Sol for novel failures, major renderer changes, difficult git
conflicts, or final close visual review. GPT-Image-2 and Tripo costs are
independent of the Codex model used to orchestrate them.
