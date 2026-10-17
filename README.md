# 🖥️ Fast TTT — Plain-Text HTTP Tic-Tac-Toe

> **Look Ma, No Browser!** Two-player ASCII Tic-Tac-Toe played entirely over curl and plain-text HTTP—zero HTML, zero CSS, zero JavaScript, and zero JSON.

---

## ⚡ Quickstart (Play in 30 Seconds from Two Terminals)

```bash
# Terminal 1: Install and run the server
./install.sh && ./run.sh
```

```bash
# Terminal 2: Play a game via curl!
curl http://localhost:8000/games/new
curl http://localhost:8000/games/1/player/X/move/1
curl http://localhost:8000/games/1/player/O/move/5
curl http://localhost:8000/games/1/auto
curl http://localhost:8000/games/1/moves
```

### 📋 Sample ASCII Board Output

```
[ Tic-Tac-Toe ]

 X | 2 | 3 
---+---+---
 4 | O | 6 
---+---+---
 7 | 8 | 9 

Turn: O | Status: in_progress
```

---

## 🏛️ The Tic-Tac-Toe Architecture Trilogy Table

| Act | Project & URL | Architecture & Tech Stack | Description |
| :-- | :-- | :-- | :-- |
| **Act I** | [vibe-tic-tac-toe](https://github.com/jpeckenpaugh/vibe-tic-tac-toe) <br>([v-ttt.livive.net](https://v-ttt.livive.net/)) | Zero-dependency single HTML file (`13 KB`, built in 33m for `$0.15` of AI tokens) | Ephemeral in-memory JS array, local pass-and-play. |
| **Act II** | **[fast-ttt](https://github.com/jpeckenpaugh/fast-ttt)** *(You Are Here)* | Python **FastAPI** + SQLAlchemy + SQLite | Server-side relational SQLite (`games` & `moves` tables), plain-text `curl` HTTP requests & ASCII grid responses. |
| **Act III** | [p2p-ttt](https://github.com/jpeckenpaugh/p2p-ttt) <br>([p2p-ttt.livive.net](https://p2p-ttt.livive.net/)) | Serverless **WebRTC DataChannels** + Web Worker **WASM SQLite** (`sql.js` + OPFS) | Client-side persistent SQLite, P2P Deflate-compressed URL hashes & QR codes. |

---

## 🛠️ API Reference & Developer Notes (The Other 10%)

### Endpoints
- `GET /` — Home page with server stats.
- `GET /games/new` — Create a new game and return ASCII board.
- `GET /games` — List all games.
- `GET /games/{id}` — Get game status and board.
- `GET /games/{id}/auto` — Let the server make a random valid move for the current player.
- `GET /games/{id}/player/{X|O}/move/{N}` — Make a move (`1-9`) for player `X` or `O`.
- `GET /games/{id}/moves` — View full move history.
- `GET /health` — Health check endpoint.
- `GET /docs` — Interactive OpenAPI Swagger UI.
- `GET /README.md`, `GET /OVERVIEW.md`, `GET /FAST-API.md` — Documentation endpoints (supports `?pretty=true` for Markdown rendering).

### Board Notation (1–9)
```
 1 | 2 | 3 
---+---+---
 4 | 5 | 6 
---+---+---
 7 | 8 | 9 
```

### Error Status Codes
- `404 Not Found` — Game ID does not exist.
- `409 Conflict` — Invalid move, cell already taken, game already finished, or wrong player turn.
- `422 Unprocessable Entity` — Move out of range (`1-9`).

### Project Structure
- `src/app/` — FastAPI application source code (`main.py`, `models.py`, `database.py`, `service.py`, `rendering.py`, `helpers.py`).
- `docs/` — Documentation files (`OVERVIEW.md`, `FAST-API.md`, `concept.md`).
- `test-runner/` — Automated test suite and validation scripts.
- `demos/latest/` — Recorded terminal recordings and showcases.

### Showcase Command
To run the end-to-end automated showcase test runner:
```bash
./test-runner/run.sh --showcase
```
