# [Dynamic Splash Screen Implementation]

Introduce a high-impact, 2-second dynamic splash screen to VerseBattles. This will feature a cinematic animation of a man striking a demon, with flashing scripture and branding, before transitioning to the main menu.

## Proposed Changes

### [Web App]

#### [MODIFY] [index.html](file:///home/michael/proj/dcgame/index.html)

- Add a new `#splashScreen` element at the top of the body.
- Include the generated splash image and text overlays.
- Add CSS animations for the "strike" effect, flashing text, and fade-out transition.

#### [MODIFY] [game.js](file:///home/michael/proj/dcgame/game.js)

- Update the initial loading logic to show the splash screen first.
- Handle the timed transition from the splash screen to the menu screen.
- Ensure the splash screen only plays once per session (optional, but requested for "2 seconds" usually implies a startup intro).

## Verification Plan

### Manual Verification

1. Load the game?
2. Verify that the splash screen appears immediately.
3. Observe the "strike" animation (image zoom/shake + flash).
4. Verify the text "Resist the devil and he will flee from you" flashes onto the screen.
5. Verify "VerseBattles.com" is visible.
6. Confirm the splash screen fades out after approximately 2 seconds, revealing the main menu.
7. Ensure performance is smooth and "loads quickly".
