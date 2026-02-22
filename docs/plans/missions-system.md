# Missions System Implementation Plan

**Status:** Draft - Not Started  
**Created:** 2026-02-22  
**Last Updated:** 2026-02-22

---

## Executive Summary

Transform the fixed 5-level system into a chapter-based mission system with an overland map UI. Players unlock chapters sequentially, with multiple missions per chapter. Designed with ContentProvider abstraction to enable future database-driven user-created worlds.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Progression | Chapter-based (unlock sequentially) | Creates sense of progression and accomplishment |
| Overland UI | Map with themed nodes | Visual and engaging, supports future expansion |
| Config Storage | Mission files with ContentProvider | Easy transition to database later |
| Progress Persistence | Local browser storage | Simple, no auth required, can add server sync later |
| Initial Content | 3 chapters, 2 missions each | Manageable scope, proves the concept |
| Node Visual Style | Chapter-themed shapes | Each chapter has distinct visual identity |
| Rewards | XP multiplier on completion | Encourages mission completion |
| Study Flow | Both before and after mission | Maximum learning opportunity |

---

## Content Structure (3 Chapters, 6 Missions)

### Chapter 1: Foundations of Faith
- **Node shape:** Shield
- **Theme:** Stone terrain
- **Unlock:** Default (unlocked from start)
- **Missions:**
  - 1.1: "The Shield of Faith" - vs Fear, Doubt (Faith verses)
  - 1.2: "Standing Firm" - vs Confusion, Blindness (Courage verses)

### Chapter 2: Love in Action
- **Node shape:** Heart
- **Theme:** Earth terrain
- **Unlock:** Complete Chapter 1 (both missions)
- **Missions:**
  - 2.1: "The Greatest Command" - vs Strife, Unforgiveness (Love verses)
  - 2.2: "Healing Hands" - vs Infirmity, Deception (Healing verses)

### Chapter 3: Armed for Battle
- **Node shape:** Sword
- **Theme:** Crystal terrain
- **Unlock:** Complete Chapter 2 (both missions)
- **Missions:**
  - 3.1: "Sword of the Spirit" - vs Condemnation, Unbelief (Knowledge verses)
  - 3.2: "Final Victory" - vs Pride, Despair (Endurance verses)

---

## Future-Proof Architecture

### ContentProvider Abstraction Layer

The core design uses an abstract `ContentProvider` interface that can be swapped between implementations:

```
Current:  Frontend → MissionClient → FileContentProvider → JSON files
Future:   Frontend → MissionClient → DatabaseContentProvider → MongoDB API
```

### Terminology (Future-Compatible)

Use "world" terminology in code even though UI shows "chapter":

| Current UI | Code Variable | Future Meaning |
|------------|---------------|----------------|
| Chapter | `worldId` | User-created world |
| Mission | `missionId` | Mission within world |
| Level | (deprecated) | Replace with mission |

### JSON Schema (MongoDB-Compatible)

Design JSON files to mirror future MongoDB schema:

- `slug` - URL-friendly identifier
- `authorId` - Creator ID (system for built-in, userId for future)
- `visibility` - public/private/unlisted
- `tags` - For categorization and search

---

## Data Schemas

### `/missions/chapters.json`

```json
{
  "schemaVersion": 1,
  "chapters": [
    {
      "id": "chapter1",
      "slug": "foundations-of-faith",
      "name": "Foundations of Faith",
      "description": "Build your faith against the enemy's first attacks",
      "nodeShape": "shield",
      "theme": "stone",
      "authorId": "system",
      "visibility": "public",
      "missionIds": ["faith-01", "faith-02"],
      "unlockRequirement": null
    },
    {
      "id": "chapter2", 
      "slug": "love-in-action",
      "name": "Love in Action",
      "nodeShape": "heart",
      "theme": "earth",
      "authorId": "system",
      "visibility": "public",
      "missionIds": ["love-01", "love-02"],
      "unlockRequirement": { "chapterId": "chapter1", "missionsCompleted": 2 }
    },
    {
      "id": "chapter3",
      "slug": "armed-for-battle", 
      "name": "Armed for Battle",
      "nodeShape": "sword",
      "theme": "crystal",
      "authorId": "system",
      "visibility": "public",
      "missionIds": ["battle-01", "battle-02"],
      "unlockRequirement": { "chapterId": "chapter2", "missionsCompleted": 2 }
    }
  ]
}
```

### `/missions/chapter1-foundations.json`

```json
{
  "schemaVersion": 1,
  "id": "chapter1",
  "missions": [
    {
      "id": "faith-01",
      "name": "The Shield of Faith",
      "description": "Defeat Fear and Doubt with the shield of faith",
      "mapStyle": "classic",
      "qualities": ["Faith", "Courage"],
      "monsters": ["Fear", "Doubt", "Confusion"],
      "monsterDamageFactor": 1.0,
      "monsterSpeed": 5,
      "playerSpeed": 5,
      "maxMonsters": 20,
      "monstersToKill": 12,
      "spawnRate": 18000,
      "xpMultiplier": 1.0
    },
    {
      "id": "faith-02",
      "name": "Standing Firm",
      "description": "Stand firm against confusion and spiritual blindness",
      "mapStyle": "narrow",
      "qualities": ["Courage", "Knowledge"],
      "monsters": ["Blindness", "Confusion", "Ignorance"],
      "monsterDamageFactor": 1.2,
      "monsterSpeed": 6,
      "playerSpeed": 5,
      "maxMonsters": 25,
      "monstersToKill": 15,
      "spawnRate": 15000,
      "xpMultiplier": 1.2
    }
  ]
}
```

### Local Storage Schema

```javascript
// Key: 'missionProgress'
{
  "schemaVersion": 1,
  "completedMissions": ["faith-01", "faith-02", "love-01"],
  "currentChapterId": "chapter2",
  "unlockedChapters": ["chapter1", "chapter2"],
  "missionStars": {
    "faith-01": 3,  // 1-3 stars based on performance
    "faith-02": 2
  },
  "totalXP": 450,
  "lastPlayedAt": "2026-02-22T15:30:00Z"
}
```

---

## Game Flow State Machine

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  MENU   │───▶│OVERLAND │───▶│ MISSION │───▶│COMPLETE │──┘
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │                              │
                    │                              ▼
                    │                        ┌─────────┐
                    └───────────────────────▶│  REVIEW │
                                             │ (verses)│
                                             └─────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `/missions/chapters.json` | Chapter index with slugs, unlock requirements |
| `/missions/chapter1-foundations.json` | Chapter 1 mission definitions |
| `/missions/chapter2-love.json` | Chapter 2 mission definitions |
| `/missions/chapter3-battle.json` | Chapter 3 mission definitions |
| `/src/shared/ContentProvider.js` | Abstract interface for content loading |
| `/src/shared/FileContentProvider.js` | File-based implementation |
| `/src/client/MissionClient.js` | Frontend API client |
| `/src/client/ProgressManager.js` | Local progress persistence |
| `/src/client/OverlandRenderer.js` | Overland map drawing |
| `/src/client/OverlandInputHandler.js` | Overland click handling |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/shared/GameLifecycle.js` | Mission complete → overland (not auto-level-up), add XP multiplier |
| `src/shared/GameEngine.js` | Accept mission config, emit `missionComplete` |
| `src/shared/MonsterManager.js` | Use mission config instead of levelData |
| `src/server/RoomManager.js` | Store `worldId`/`missionId` in room settings |
| `src/client/Network.js` | Add `sendSelectMission()`, `sendMissionComplete()` |
| `src/client/LocalNetwork.js` | Implement mission selection methods |
| `game.js` | Add overland state machine, integrate all new modules |
| `index.html` | Add overland container, mission select UI |
| `public/locales/en.json` | Add mission UI strings |
| `public/locales/es.json` | Add Spanish mission UI strings |

---

## Implementation Phases

### Phase 1: Foundation (Data Layer)
1. Create ContentProvider abstraction
2. Create FileContentProvider implementation
3. Create mission JSON files (3 chapters)
4. Create MissionClient frontend wrapper

**Complexity:** Medium  
**Notes:** New abstraction layer, 6 JSON files

### Phase 2: Progress System
5. Create ProgressManager (localStorage)
6. Add unlock logic based on requirements
7. Test chapter unlocking flow

**Complexity:** Low  
**Notes:** Simple localStorage logic

### Phase 3: Overland UI
8. Create OverlandRenderer (map drawing)
9. Create OverlandInputHandler (click handling)
10. Add chapter-themed node shapes
11. Integrate into game.js state machine

**Complexity:** High  
**Notes:** New renderer, new input handler

### Phase 4: Game Integration
12. Modify GameEngine to accept mission config
13. Modify GameLifecycle for mission flow
14. Add XP multiplier on completion
15. Add "Study First" and post-mission review

**Complexity:** High  
**Notes:** Core game loop changes

### Phase 5: Multiplayer
16. Update RoomManager for mission selection
17. Add socket events for mission sync
18. Host selects mission, all players follow

**Complexity:** Medium  
**Notes:** Extending existing room system

### Phase 6: Polish
19. Add i18n strings (EN/ES)
20. Add mission completion stars
21. Add sound effects for overland
22. Testing and bug fixes

**Complexity:** Low  
**Notes:** UI strings, minor features

---

## Future Expansion (Post-Launch)

### Database-Driven Worlds
- Replace FileContentProvider with DatabaseContentProvider
- Add `/api/worlds` endpoints for CRUD operations
- User authentication for world ownership
- World sharing and discovery

### Additional Features
- World ratings and reviews
- World search and filtering
- Co-author collaboration
- World templates
- Seasonal/event worlds

---

## Open Questions

None at this time. All major decisions have been made.

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-22 | Claude | Initial plan creation |
