# fast-ttt

A simple ASCII tic-tac-toe game that can be played by 2 players using `curl`.

The goal is a clean demonstration of client-server principles without HTML,
JavaScript, CSS, or even JSON. The server responds in plain text, rendering the
board as an ASCII grid. (The only exception is `/docs`, FastAPI's built-in
Swagger UI, which is auto-generated HTML for browsing the API.)

New to client-server concepts? Read `OVERVIEW.md` first — it explains how the
client and server talk, then come back to the commands below. Want to understand
how the backend is put together? See `FAST-API.md`.

## Features

You don't need every feature listed here to get started. The Usage section
shows real commands with their real output — run them and you'll see the app
working.

- Create a game, view the board, play moves, and auto-play over plain HTTP
- Pure-text responses: no HTML/JS/CSS or JSON
- Game state persisted in SQLite via SQLAlchemy
- Atomic move application: board, turn, status, and move history commit together
- First-player rule: odd-numbered games start with `X`, even-numbered with `O`
- Auto-move: make one random move for the current player
- Winning lines highlighted with `[X]` / `[O]`; finished games show blank cells
- Home page with game statistics
- Move history per game
- Plain-text error messages rendered alongside the board
- An introduction to how a client and a server talk to each other: `OVERVIEW.md`

## Requirements

- Python 3.12
- Dependencies listed in `requirements.txt` (FastAPI, uvicorn, SQLAlchemy,
  pydantic, markdown)

## Install & Run

```bash
./install.sh    # create .venv and install deps
./run.sh        # start the server on 0.0.0.0:8000
```

The SQLite database (`src/data.db`) is created automatically the first time the
server starts.

Useful script:

```bash
./reset.sh      # delete data.db (wipe all game state; recreated on next start)
```

`run.sh` starts uvicorn with `--reload` on port `8000`. Verify it is up:

```bash
curl http://localhost:8000/health
```

## Usage

### Home page

```bash
curl http://localhost:8000/
```

```
[ Tic-Tac-Toe ]

Total Games: 0
Won by X: 0
Won by O: 0
Open Games: 0

Next: /games/new
Guide: /OVERVIEW.md
Help: /README.md
Docs: /docs
Structure: /FAST-API.md
```

### Create a game

```bash
curl http://localhost:8000/games/new
```

```
[ Tic-Tac-Toe ]
Game 1 created.

   1 | 2 | 3 
  ---|---|---
   4 | 5 | 6 
  ---|---|---
   7 | 8 | 9 

=== Game 1 ===
Turn: X
Next: /games/1/player/X/move/{number}
```

### View the board

```bash
curl http://localhost:8000/games/1
```

### Make a move

```bash
curl http://localhost:8000/games/1/player/X/move/1
```

```
[ Tic-Tac-Toe ]
Move 1: X at 1

   X | 2 | 3 
  ---|---|---
   4 | 5 | 6 
  ---|---|---
   7 | 8 | 9 

=== Game 1 ===
Turn: O
Next: /games/1/player/O/move/{number}
```

### Auto move

Make one random move for the player whose turn it is:

```bash
curl http://localhost:8000/games/1/auto
```

```
[ Tic-Tac-Toe ]
Auto move: O at 5

   X | 2 | 3 
  ---|---|---
   4 | O | 6 
  ---|---|---
   7 | 8 | 9 

=== Game 1 ===
Turn: X
Next: /games/1/player/X/move/{number}
```

### List games

```bash
curl http://localhost:8000/games
```

```
[ Tic-Tac-Toe ]

/games/1 -> In Progress
```

Game statuses are shown as `In Progress`, `X Wins`, `O Wins`, or `Draw`.

### Move history

```bash
curl http://localhost:8000/games/1/moves
```

```
[ Tic-Tac-Toe ]
Moves for game 1

   X | 2 | 3 
  ---|---|---
   4 | 5 | 6 
  ---|---|---
   7 | 8 | 9 

=== Game 1 ===
Turn: O
Next: /games/1/player/O/move/{number}

Move 1: X at 1
```

## API Reference

Base URL: `http://localhost:8000`

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/` | Home page with game statistics |
| `GET` | `/games/new` | Create a game; returns the rendered board (201) |
| `GET` | `/games` | List all games and their status |
| `GET` | `/games/{id}` | View a game's board |
| `GET` | `/games/{id}/auto` | Make one random move for the current player (201) |
| `GET` | `/games/{id}/player/{X\|O}/move/{N}` | Play a move (201) |
| `GET` | `/games/{id}/moves` | List a game's move history |
| `GET` | `/README.md` | This documentation as plain text |
| `GET` | `/OVERVIEW.md` | Introduction to how a client and a server talk (plain text) |
| `GET` | `/FAST-API.md` | How the FastAPI backend is structured (plain text) |
| `GET` | `/docs` | Swagger UI (HTML) |
| `GET` | `/health` | Health check |

The markdown pages (`/README.md`, `/OVERVIEW.md`, `/FAST-API.md`) accept a bare
`?pretty` flag to render as a styled HTML page in the browser instead of plain
text, e.g. `/README.md?pretty`.

### Path parameters for making a move

- `{X|O}` — the player's symbol; lowercase `x`/`o` are also accepted and
  normalized. It must match the current turn.
- `{N}` — an integer `1`–`9` (see board notation below).

### Errors (plain text body)

Move errors render the game board with the error appended on the final line.

- `404` — game not found.
- `409` — game already finished, wrong player's turn, or cell already occupied.
- `422` — invalid player symbol (not `X`/`O`) or position out of range.

## Board notation

Positions are numbered `1`–`9`, mapping to the 3×3 grid row by row:

```
 1 | 2 | 3
 4 | 5 | 6
 7 | 8 | 9
```

Game status values: `in_progress`, `x_wins`, `o_wins`, `draw`.

- Empty cells show their position number while the game is in progress.
- On a finished game, empty cells are left blank and the winning line is
  highlighted, e.g. `[O]|[O]|[O]`.
- The first player is `X` for odd-numbered games and `O` for even-numbered games.

## Project structure

```
src/app/
  main.py                 Route functions, one per URL
  database.py             SQLAlchemy engine, session, Base, and get_db() dependency
  models.py               SQLAlchemy models (Game, Move)
  rendering.py            Render a 9-char board as an ASCII grid + status line
  rules.py                Win/draw evaluation logic and winning-line detection
  service.py              apply_move(): atomic move business logic
  helpers.py              Error handling, markdown rendering, game lookup
```

Docs live at the repo root: `README.md`, `OVERVIEW.md`, and `FAST-API.md` (all
served by the app, too).
