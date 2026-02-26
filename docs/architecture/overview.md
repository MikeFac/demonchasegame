# Demon Chase Game - Project Overview

**Last Updated:** 2026-02-27

## Introduction
Demon Chase Game is a multiplayer web-based Bible verse quiz game with top-down dungeon combat. Players fight demons representing negative concepts (Fear, Doubt, Condemnation, etc.) by answering Bible verse quizzes to earn ammo and deal damage. Features a chapter-based mission system with overland campaign map, AI devotional sermons, and progressive verse memorization.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Database**: MongoDB (optional, for verse songs and sermon caching)

### Frontend
- **Language**: HTML5, JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Styling**: CSS
- **Communication**: Socket.IO Client + local emitter for offline solo play

### Shared
- **Game Engine**: Environment-agnostic modules in `src/shared/` run on both server and client
- **Content System**: JSON-based mission definitions with provider abstraction

## Directory Structure

- **root**:
    - `server.js`: Main entry point for the Node.js server
    - `game.js`: Main client-side game logic and state machine
    - `index.html`: Game page (canvas + UI)
    - `lobby.html`: Multiplayer lobby page
    - `bible-verses.js`: 1618+ verses with pre-generated quiz data (1.4MB)
    - `missions/`: Chapter and mission JSON content files
    - `src/`: Source code organized by modules
        - `server/`: Server-side logic (`Game.js`, `RoomManager.js`, entities, routes, services)
        - `client/`: Client-side modules (`Renderer.js`, `InputHandler.js`, `Network.js`, `OverlandRenderer.js`, `ProgressManager.js`, `SermonViewer.js`, `VotdLearningMode.js`)
        - `shared/`: Environment-agnostic modules (`GameEngine.js`, `GameLifecycle.js`, `GameConfig.js`, `ContentProvider.js`, `MissionClient.js`, `Constants.js`, `LevelConfig.js`, `WallGrid.js`)

## Key Features
- **Chapter-Based Missions**: 3 chapters with 6 missions, overland campaign map, chapter unlocking, star ratings, XP rewards
- **Multiplayer Support**: Players can create and join rooms with configurable difficulty
- **Real-time Combat**: Server-authoritative movement and shooting with client prediction
- **Level System**: 5 levels with server-detected completion, scaling monster HP, and configurable kill targets
- **5 Map Styles**: Classic Dungeon, Narrow Paths, Complex Labyrinth, Open Plains, Grid City — selectable per game
- **Demon Special Abilities**: Freezing Aura, Armored Shell, Spirit Drain, Dash Attack, Erratic Movement
- **5 Quiz Modes**: First Letter, Missing Word, Category Match, True/False, Cloze — with configurable balance
- **Armor of God Collectibles**: 6 item types with active abilities (Sword, Belt, Helmet, Breastplate, Sandals, Shield)
- **AI Devotional Sermons**: Per-verse AI-generated devotional content with paginated viewer
- **Verse of the Day Learning**: Progressive memorization mode that hides words incrementally
- **Verse-to-Song Learning**: Optional music-based verse memorization via Suno API
- **Shared Game Engine**: Runs on both server (multiplayer) and client (offline solo missions)
