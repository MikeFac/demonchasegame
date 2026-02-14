# Demon Chase Game - Project Overview

## Introduction
Demon Chase Game is a multiplayer web-based game where players fight against "demons" representing negative concepts (Fear, Doubt, etc.) using "Bible verses" as ammunition. It features a top-down view, multiplayer lobbies, and real-time combat.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Database (Content)**: PHP scripts connecting to a MySQL database (for fetching verses).

### Frontend
- **Language**: HTML5, JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Styling**: CSS
- **Communication**: Socket.IO Client

## Directory Structure

- **root**:
    - `server.js`: Main entry point for the Node.js server.
    - `game.js`: Main client-side game logic entry point.
    - `index.html`: Game page.
    - `lobby.html`: Multiplayer lobby page.
    - `database.php`, `get_verses.php`: PHP scripts for fetching content.
    - `bible-verses.js`: Fallback/local content.
    - `src/`: Source code organized by modules.
        - `server/`: Server-side logic (`Game.js`, `RoomManager.js`, entities).
        - `client/`: Client-side modules (`Renderer.js`, `InputHandler.js`, `Network.js`).
        - `shared/`: Shared constants and configuration (`Constants.js`, `LevelConfig.js`).
    - `assets`: Images and audio files (in root).

## Key Features
- **Multiplayer Support**: Players can create and join rooms.
- **Real-time Combat**: Latency-compensated multiplayer movement and shooting.
- **Level System**: 5 levels with server-detected completion, scaling monster HP, and configurable kill targets.
- **5 Map Styles**: Classic Dungeon, Narrow Paths, Complex Labyrinth, Open Plains, Grid City — selectable per game.
- **Demon Special Abilities**: Freezing Aura, Armored Shell, Spirit Drain, Dash Attack, Erratic Movement.
- **Educational Aspect**: Integration of Bible verses and 5 quiz modes.
- **Armor of God Collectibles**: 6 item types with active abilities (Sword, Belt, Helmet, Breastplate, Sandals, Shield).
- **Verse-to-Song Learning**: Optional music-based verse memorization via Suno API.
