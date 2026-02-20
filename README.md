# VerseBattles: Demon Chase

A multiplayer Bible verse quiz game with top-down dungeon combat. Fight demons (Fear, Doubt, Condemnation) by answering Bible verse quizzes to earn ammo and deal damage.

## Quick Start

```bash
npm install
node server.js
```

Visit http://localhost:3500

## License

This project is **dual-licensed**:

| Use Case | License |
|----------|---------|
| Non-commercial, open source | **GNU AGPL v3** (see [LICENSE](LICENSE)) |
| Commercial use, proprietary mods | **Commercial license required** |

### Commercial Use

If you want to:
- Use this software commercially (charge for access, paid programs)
- Keep modifications proprietary
- Remove attribution or rebrand
- Get warranty/support

**Contact:** michaelfackerell@gmail.com for commercial licensing.

### Trademark

"VerseBattles" is a trademark of Michael Fackerell. Use of the name requires permission regardless of license.

## Features

- **5 procedurally generated map styles** - Classic dungeon, narrow paths, labyrinth, open plains, grid city
- **18 demon types** with special abilities - Fear freezes, Pride has armor, Strife charges
- **4 quiz modes** - First letter, missing word, category match, true/false
- **Verse memorization** - Learn verses with progressive hints
- **Armor of God collectibles** - Sword, Shield, Helmet, Belt, Sandals, Breastplate
- **Single-player offline mode** - No internet required after first load
- **Multiplayer rooms** - Host or join games with friends
- **Verse of the Day** - Daily verse with damage bonus

## Self-Hosting

You are free to host your own instance under AGPL v3.

### Requirements
- Node.js 16+
- npm

### Environment Variables (optional)

Create a `.env` file for optional features:

```
MONGODB_URI=mongodb://...
OPENROUTER_API_KEY=sk-...
```

### What You Can Do

- Set up your own server
- Generate your own language/translation files
- Create custom verses and quiz content
- Modify the codebase

**Note:** If you modify and host publicly, AGPL v3 requires you to share your modifications with users.

## Architecture

```
src/
  client/     - Browser-only code (Renderer, InputHandler, Network)
  server/     - Node.js-only code (Game, RoomManager)
  shared/     - Code that runs in both environments (GameEngine, entities)
```

The shared `GameEngine` enables offline single-player mode by running the full game logic client-side.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

All contributors must sign our CLA (handled automatically via CLAassistant on first PR).

## Contact

- **General:** michaelfackerell@gmail.com
- **Commercial licensing:** michaelfackerell@gmail.com

## Legal

- **License:** GNU AGPL v3 (open source) / Commercial (by request)
- **Trademark:** "VerseBattles" is a trademark of Michael Fackerell
- **Jurisdiction:** Queensland, Australia
