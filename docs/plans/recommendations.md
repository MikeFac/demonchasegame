# Architectural Recommendations

## Executive Summary
To improve maintainability, deployment ease, and future extensibility for "different learning materials," we recommend **consolidating the backend into a single Node.js application**. This removes the dependency on a separate PHP/Apache environment and unifies the game logic with the content delivery system.

## 1. Unified Node.js Backend
**Current State**:
- Node.js/Express for Game Logic & WebSocket.
- PHP for Database access (Verses).
- Clients fetch static content or hit PHP endpoints.

**Recommendation**:
- Move the database interaction logic directly into the Node.js `server.js` (or a new module `src/server/ContentManager.js`).
- **Benefit**: Single runtime (Node.js). Easier to deploy (one container/process). Better performance (no HTTP overhead between game server and content server if they were separate; though currently client calls PHP directly).

## 2. Database Strategy
You mentioned wanting to support "different learning materials" in the future. The current `bible-verses.js` structure is essentially a document (Verse + Metadata + Quiz).

### Option A: SQLite (Recommended for Simplicity)
- **Why**: Zero-configuration, serverless, stored as a single file (`game.db`). Perfect for read-heavy, low-write game content.
- **Implementation**: Use `better-sqlite3` or `sqlite3` package.
- **Migration**: Convert your existing MySQL data or JSON files into a SQLite file.
- **Portability**: The entire database is just a file you can commit to the repo or manage as a simple asset.

### Option B: MongoDB (Recommended for Flexibility)
- **Why**: Your data format (Verses with arrays of Options, nested questions) maps 1:1 to JSON documents.
- **Implementation**: Use `mongoose` for schema definition.
- **Pros**: Easy to add new fields (e.g. `difficulty`, `tags`) without complex migrations.
- **Cons**: Requires running a separate MongoDB process/service.

### Option C: PostgreSQL/MySQL (Recommended for Scale/Strictness)
- **Why**: You already have MySQL. Good if you plan to have managing user accounts, leaderboards, and relational data (User <-> Progress).
- **Implementation**: Use an ORM like `Prisma` or `Sequelize`.

## 3. Data Schema Recommendations
Regardless of the DB choice, your data model needs to support generic "Learning Items".

**Proposed Schema (Conceptual)**:
```json
{
  "id": "unique_id",
  "packId": "bible_verses_v1",
  "category": "Faith",
  "type": "verse_quiz", 
  "content": {
    "text": "Verse text...",
    "reference": "John 3:16",
    "lie": "The lie associated with this truth..."
  },
  "quiz": {
    "question": "What does this say?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A"
  },
  "metadata": {
    "difficulty": 1,
    "tags": ["new_testament"]
  }
}
```
*By abstracting `content` and `quiz`, you can later add History facts, Math problems, etc., without breaking the game engine.*

## 4. API Layer
Create dedicated routes in `server.js` to serve this content.

**New Endpoints**:
- `GET /api/content/packs`: List available learning packs (Bible, Math, etc.).
- `GET /api/content/:packId`: Get all items for a pack.
- `GET /api/content/random?category=Faith`: Get random items for the game.

## 5. Workflow for "Different Learning Material"
To enable easy addition of new material:
1.  **JSON-first approach**: Start by defining new content in JSON files (`math-data.js`).
2.  **Import Script**: Write a utility to ingest these JSON files into your chosen DB (SQLite/Mongo).
3.  **Admin UI**: Eventually build a simple web page (`/admin`) to edit/add questions without touching code.

## Proposed Next Steps
1.  **Select a Database**: We recommend **SQLite** for now to keep the architecture simple and self-contained.
2.  **Migrate Logic**: Write a `Database.js` module in Node.js to replace `get_verses.php`.
3.  **API Routes**: Implement `/api/verses` in Express.
4.  **Frontend Update**: Update `game.js` to fetch from `/api/verses` instead of `get_verses.php`.
