# GPT-Image-2 demon reference candidates

Generated on 2026-08-18 with `gpt-image-2` at medium quality and 1024x1024.
The folder contains two candidates for each of the 18 enemy types currently
listed in `game.js`, for a total of 36 PNG reference images.

These are concept/reference images, not shipping game textures. They are
designed as isolated, full-body, three-quarter views on a neutral background so
that selected candidates can be evaluated in Tripo's image-to-3D workflow.

## Contact sheets

- `contact-sheet-1.jpg`: Fear through Strife
- `contact-sheet-2.jpg`: Confusion through Pride
- `contact-sheet-3.jpg`: Temptation through Goliath

## First-pass Tripo shortlist

This shortlist favours a strong silhouette, separated limbs, limited loose
parts, and practical mobile-game animation. It is not a final art-direction
decision.

| Type | First candidate to test | Note |
| --- | --- | --- |
| Fear | `fear-b.png` | Clearest classic threat and body structure; wings still require careful topology. |
| Condemnation | `condemnation-b.png` | More conventionally riggable; A is the more distinctive heavy variant. |
| Unbelief | `unbelief-b.png` | Clean drake anatomy and readable tail. |
| Ignorance | `ignorance-a.png` | Stronger rocky silhouette and material identity. |
| Depression | `depression-a.png` | Strong silhouette with fewer protrusions than B. |
| Strife | `strife-b.png` | Distinct fast silhouette; A is better if a heavy brawler is preferred. |
| Confusion | `confusion-b.png` | Clear biped with controlled asymmetry. |
| Infirmity | `infirmity-a.png` | Simple skeletal biped and readable joints. |
| Doubt | `doubt-b.png` | More distinctive armor language and strong rigging stance. |
| Deception | `deception-a.png` | Clear spider-centaur structure; expect custom rig work. |
| Despair | `despair-a.png` | Cleaner biped and tail than B. |
| Pride | `pride-a.png` | Strong regal silhouette with symmetrical armor. |
| Temptation | `temptation-b.png` | More demonic while retaining clean humanoid rigging. |
| Poverty | `poverty-a.png` | Memorable chest motif and sturdy riggable anatomy. |
| Shame | `shame-b.png` | Cleaner quadruped proportions and separated legs. |
| Blindness | `blindness-a.png` | Most distinctive eyeless silhouette; requires a hovering animation set. |
| Swarm | `swarm-a.png` | Compact representative unit suitable for duplication. |
| Goliath | `goliath-a.png` | Clean humanoid body with no cloak or weapon fused into the mesh. |

## Validation

- 36/36 requested PNGs generated successfully.
- Every PNG decodes correctly and is exactly 1024x1024.
- Total PNG size is approximately 52 MB.
- The exact API prompt and execution fields for every image are preserved in
  `prompts.jsonl`.

Before spending Tripo credits across the whole roster, generate one model from
the shortlisted Fear reference, inspect the GLB from all angles, and verify
retopology, rigging, animation deformation, and phone performance in the game.
