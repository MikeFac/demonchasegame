# Low-Poly 3D Phone Profile

Status: desktop budget proxy passes; real Android gate is waiting for a device.

## Required device run

Use a mid-range Android phone representative of the lower target, preferably a
Snapdragon 6xx-class device with Chrome current enough for WebGL2.

1. Serve the branch over HTTPS or expose the local server to the phone on a
   trusted LAN.
2. Open `/?viewMode=third-person`, start `chapter0/intro-01`, dismiss the speed
   prompt, and play continuously for ten minutes. Repeat the full run at
   `/?viewMode=first-person`; the legacy `/?viewMode=3d` alias is not the
   canonical profile URL.
3. Record `window.lowPoly3DStats` at minute 1, 5, and 10 from Chrome remote
   debugging. Capture draw calls, triangles, entity counts, authored/fallback
   assets, renderer errors, and internal canvas size.
4. Record Chrome Performance traces for the first and final 30 seconds. Note
   median FPS, worst sustained one-second FPS, long tasks, and GPU raster load.
5. Record starting/ending battery percentage, device temperature if available,
   visible thermal throttling, input latency, tab reloads, and memory warnings.
6. Repeat once with battery saver enabled. This run is diagnostic, not a pass
   requirement.

## Pass criteria

- 30 FPS sustained target; no interval below 24 FPS for more than two seconds
- at most 100 draw calls and 150,000 visible triangles
- no WebGL context loss, page errors, tab reload, or out-of-memory event
- no input freeze during combat or quiz overlays
- temperature and battery drain recorded, with no severe thermal throttle
- Fear remains readable at normal phone size in idle, walk, attack, hit, death

## Desktop proxy

With the local server running, `npm run test:three-views` verifies all three
mode paths, FPS movement/turning, wall-aware combat, and view-correct WebGL
recovery. `npm run test:3d-runtime` retains the legacy alias and 2.5D runtime
budget regression. The tests fail on renderer fallback, asset-load errors,
browser errors, more than 100 draw calls, or more than 150,000 triangles, and
record screenshots and diagnostics. Software-rendered desktop FPS is
informational and must not be reported as the phone result.
