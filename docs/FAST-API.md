# How the FastAPI backend is put together

> Read `OVERVIEW.md` first. That explains how a client and a server talk.
> This file looks inside the server and shows how the backend code is organized.

The app is deliberately small and split into a handful of files, each with one
job. Knowing which file does what makes the code much easier to read.

## The file map

```
src/app/
  main.py                 the app + all routes (one function per URL)
  database.py             the database connection, session, and Base
  models.py               the data shapes: Game and Move
  service.py              the core "make a move" logic
  rules.py                win/draw decision logic
  rendering.py            draws the board as ASCII text
  helpers.py              small shared helpers (errors, lookup, markdown)
```

## What each file is for

### main.py — the front door

Creates the FastAPI app and defines every route. Each URL in the README maps to
one function here. A request comes in, FastAPI matches the path to a function,
and that function builds the text response.

### database.py — the connection

Sets up the connection to SQLite and provides `get_db()`, which gives each
request a database session and closes it when the request finishes.

### models.py — the data shapes

Defines the two tables: `Game` (a board, whose turn, status, winner) and `Move`
(one played move). These describe what the app stores.

### service.py — the business logic

Holds `apply_move()`, the one non-trivial piece of logic: it records the move,
updates the board, switches turns, checks for a win, and saves everything.

### rules.py — the decisions

Pure functions that decide the game outcome (win, draw, or still going) and
find the winning line. It has no database access — it just looks at a board.

### rendering.py — the drawing

Turns a 9-character board string into the ASCII grid you see in the terminal.

### helpers.py — the little extras

Small shared functions: turning an error into plain text, looking up a game (or
a 404), and rendering the markdown pages as HTML.

## The database tables

The app stores data in two SQLite tables. `games` holds one row per game; `moves`
holds one row per move played. They're linked by `game_id` — one game has many
moves.

### games

| id | board | current_turn | status | winner | created_at | updated_at |
|----|-------|--------------|--------|--------|------------|------------|
| 1  | `X   O    ` | X | in_progress | | 10:00 | 10:05 |
| 2  | `XXXOO    ` | O | x_wins | X | 10:10 | 10:12 |

The `board` is one 9-character string, a character per square read row by row; a
space is an empty square.

### moves

| id | game_id | player | position | created_at |
|----|---------|--------|----------|------------|
| 1 | 1 | X | 1 | 10:00 |
| 2 | 1 | O | 5 | 10:05 |
| 3 | 2 | X | 1 | 10:10 |
| 4 | 2 | O | 4 | 10:10 |
| 5 | 2 | X | 2 | 10:11 |
| 6 | 2 | O | 5 | 10:11 |
| 7 | 2 | X | 3 | 10:12 |

Game 1 is mid-game (X at square 1, O at 5). Game 2 is finished: the moves show X
filling the top row (positions 1, 2, 3), so `status` is `x_wins` and `winner` is X.
(For a finished game, `current_turn` no longer matters — the app still stores one.)

## The layering idea

The files work like a pipeline. A useful mental model, echoing "the client
asks, the server does":

```
routes ask  →  service does  →  rules decide  →  rendering draws  →  database stores
 (main.py)     (service.py)     (rules.py)        (rendering.py)     (models.py)
```

- `main.py` decides *what* to do for a URL.
- `service.py` does the actual work.
- `rules.py` makes the game decisions.
- `rendering.py` draws the result.
- `models.py` + `database.py` remember it.

## One request, end to end

Here is how a single move travels through the files. Say a player plays square 1
in game 1:

```
GET /games/1/player/X/move/1
            │
            ▼
   main.py      make_move()        the route for this URL
            │
            ▼
   helpers.py   get_game_or_404()  find game 1, or a 404
            │
            ▼
   service.py   apply_move()       record the move, update the board,
                                   switch turns, check the outcome
            │
            ▼
   rules.py     evaluate_board()   is this a win, draw, or still going?
            │
            ▼
   rendering.py render_board()     draw the result as ASCII text
            │
            ▼
   main.py      returns it         the plain-text response
```

Each file stays small and does one thing. That separation is the main idea of
this structure.
