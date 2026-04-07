# Game Improvements Roadmap

**Date**: April 7, 2026  
**Source**: Codebase analysis and exploration

---

## High Impact / Quick Wins

### 1. Sound Effects & Music ✅ PARTIALLY DONE
**Status**: Attack/damage SFX enhanced (see implementation below)  
**Remaining work**:
- Add ambient background music
- Add volume control sliders in settings menu
- Add music toggle button
- Add more variety for quiz sounds (correct/wrong answers)
- Add UI click sounds

**Files**: 
- `src/client/SoundEffects.js` (enhanced)
- `game.js` (updated to use new sounds)
- Future: `src/client/MusicManager.js`, settings UI

---

### 2. Mobile Responsiveness
**Current issues**:
- Canvas hardcoded to 400px width
- Text too small on mobile devices
- Touch controls need polish (no gestures, drag-to-move)
- Buttons feel small on touch screens
- Scrollbars on overland map feel clunky

**Solution**:
- Dynamic canvas sizing based on viewport
- Larger touch targets (min 44px)
- Swipe gestures for movement
- Responsive font sizes using viewport units
- Better scroll behavior on overland map

**Files**: `game.js`, `src/client/Renderer.js`, `src/client/InputHandler.js`, `index.html`

---

### 3. Remove Console Logs
**Issue**: 1500+ console.log statements in production code  
**Impact**: Performance degradation, unprofessional appearance

**Solution**:
- Create `Logger` utility with log levels
- Replace all `console.log` with `Logger.debug()` (disabled in production)
- Keep `console.error` and `console.warn` for critical issues
- Add build step to strip debug logs

**Files**: All `.js` files, create `src/shared/Logger.js`

---

### 4. Better Visual Feedback
**Current state**: Basic damage numbers, minimal particles, no screen shake

**Enhancements**:
- Particle effects on damage (burst/spark patterns)
- Screen shake on heavy hits
- Death animations with particle explosions
- Floating damage numbers with smoother animations
- Hit flash effects on monsters
- Collectible pickup animations

**Files**: `src/client/Renderer.js`, `game.js`

---

### 5. Polish Overland Map
**Current issues**:
- No tooltips on mission nodes
- Locked/unlocked states unclear
- Scrolling feels janky
- Mission info requires clicking

**Enhancements**:
- Hover tooltips showing mission details
- Better visual distinction for locked/completed/available nodes
- Pulsing glow on available missions
- Smooth scroll with momentum
- Mini-map or scroll indicator
- Mission preview cards on hover

**Files**: `src/client/OverlandRenderer.js`, `src/client/ProgressManager.js`

---

## Medium Impact

### 6. More Mission Content
**Current state**: 3 chapters, 6 missions total  
**Issue**: Feels incomplete, low replay value

**Solution**:
- Add 2-3 more chapters (10-15 new missions)
- Create boss battles at chapter ends
- Add secret/bonus missions
- Daily challenge missions
- User-generated content support (future)

**Files**: `missions/*.json`, `missions/chapters.json`

---

### 7. Achievement System
**Current state**: `ProgressManager.js` tracks XP/stars but no visual rewards

**Implementation**:
- Achievement definitions (e.g., "First Blood", "Verse Master", "Speed Demon")
- Achievement unlock notifications (toast notifications)
- Achievements gallery/screen
- Steam-style achievement icons
- Track: kills, verses learned, games won, speed runs, etc.

**Files**: Create `src/client/AchievementManager.js`, update `ProgressManager.js`

---

### 8. Better Tutorial Flow
**Current issues**: Text-heavy, players skip it, overwhelming for new users

**Solution**:
- Interactive tutorial (play through first mission with guidance)
- Progressive hints (only show when needed)
- Tutorial skip option with confirmation
- "Tips" system during gameplay
- Video tutorials option
- Tooltip glossary for game terms

**Files**: `game.js`, create `src/client/TutorialManager.js`

---

### 9. Multiplayer Lobby UX
**Current issues**:
- No room filtering
- Confusing room codes
- No friend invites
- Hard to find active games
- No player count indicators

**Enhancements**:
- Room browser with filters (difficulty, player count, region)
- 4-digit room codes (easier to share)
- Friend invite via shareable links
- Player count badges on rooms
- Quick match button
- Recent players list

**Files**: `src/server/RoomManager.js`, multiplayer UI components

---

### 10. Keyboard Controls
**Current state**: Click-to-move only

**Add**:
- WASD movement
- Arrow keys for movement
- Space bar for attack
- Number keys for abilities
- Tab for inventory/stats
- ESC for pause/menu

**Files**: `src/client/InputHandler.js`, `game.js`

---

## Polish Items

### 11. Leaderboards
**Current state**: Missing server-side implementation

**Implementation**:
- Global leaderboards (kills, XP, speed runs)
- Weekly/daily challenges with leaderboards
- Per-chapter leaderboards
- Friends-only leaderboards
- Leaderboard API endpoints

**Files**: Create `src/server/LeaderboardService.js`, database schema

---

### 12. Accessibility
**Current issues**: No color-blind support, poor contrast, no screen reader support

**Enhancements**:
- Color-blind mode (patterns instead of colors)
- High contrast mode
- Screen reader ARIA labels
- Keyboard navigation for all menus
- Adjustable text size
- Reduced motion mode

**Files**: All UI files, `index.html`, `src/client/Renderer.js`

---

### 13. Internationalization (i18n)
**Current state**: English + partial Spanish

**Enhancements**:
- Complete Spanish translation
- Add: Portuguese, French, German, Korean, Chinese
- Language selector in settings
- RTL language support
- Localized date/time formats

**Files**: `locales/*.json`, create `src/shared/i18n.js`

---

### 14. Error Handling
**Current issues**: Many try-catch blocks just log errors without user feedback

**Solution**:
- User-friendly error messages
- Toast notification system
- Retry mechanisms for network failures
- Graceful degradation when assets fail to load
- Error reporting to server (opt-in)

**Files**: Create `src/client/ErrorHandler.js`, all async functions

---

## Technical Debt

### 15. Code Cleanup
- Remove unused variables and functions
- Standardize naming conventions
- Add JSDoc comments to public APIs
- Refactor large functions (e.g., `game.js` is 6000+ lines)
- Split `game.js` into modules

### 16. Performance Optimizations
- Implement object pooling for particles/bullets
- Reduce garbage collection (reuse objects)
- Lazy load assets
- Optimize canvas rendering (layers, dirty rectangles)
- Profile and optimize hot paths

### 17. Testing
- Add unit tests for game logic
- Add integration tests for multiplayer
- Add E2E tests for critical paths
- Set up CI/CD pipeline

---

## Future Features

### 18. Power-ups & Buffs
- Temporary speed boost
- Damage multipliers
- Shield pickups
- Ammo types (holy water, lightning, etc.)
- Cooldown display

### 19. Boss Battles
- Unique monster types at chapter ends
- Special attack patterns
- Multiple phases
- Boss-specific achievements

### 20. Social Features
- Friends list
- Guild/clan system
- Chat system
- Share progress on social media
- Spectator mode

### 21. Daily Challenges
- Unique mission each day
- Special modifiers (e.g., "One-hit kills")
- Daily leaderboards
- Streak bonuses

### 22. Custom Content
- Mission editor
- Custom verse packs
- Shareable missions via codes
- Community content hub

---

## Implementation Notes

### Sound System Enhancement (Completed April 7, 2026)

**What was done**:
1. Enhanced `src/client/SoundEffects.js` with procedural sound generation:
   - `playAttack()` - Randomizes between sword whoosh, punch impact, energy blast
   - `playDamage()` - Randomizes between heavy hit, gritty impact
   - `playBullet()` - Fast projectile sound
   - `playMonsterDeath()` - Explosion with noise + oscillator
   - `setMasterVolume()` - Volume control support

2. Updated `game.js` to use sound variety system:
   - Loaded 4 unused MP3s from `/sounds/` directory
   - Created sound pools that cycle through variations
   - Mixed procedural (40-50%) and file-based (50-60%) sounds
   - Each attack/damage event now has 3-4 different sounds

3. Sound sources:
   - **Existing files**: 19 MP3s already in `/sounds/` directory
   - **Procedural**: Web Audio API (no external dependencies)

**Result**: Richer, more varied audio feedback for combat actions.

---

## Priority Order for Next Sprint

1. Mobile responsiveness (highest user impact)
2. Remove console logs (quick win, performance)
3. Better visual feedback (juice/polish)
4. Achievement system (engagement)
5. Keyboard controls (accessibility + power users)

---

## Metrics to Track

- Player retention (day 1, day 7, day 30)
- Average session length
- Mission completion rates
- Multiplayer engagement
- Achievement unlock rates
- Performance metrics (FPS, load times)
