import random
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .helpers import (
    get_game_or_404,
    move_error,
    plain_text_exception_handler,
    render_markdown_html,
)
from .rendering import render_board
from .service import apply_move

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ttt", version="0.1.0")
app.add_exception_handler(HTTPException, plain_text_exception_handler)

HEADER = "[ Tic-Tac-Toe ]"

README_PATH = Path(__file__).resolve().parent.parent.parent / "README.md"
OVERVIEW_PATH = Path(__file__).resolve().parent.parent.parent / "OVERVIEW.md"
FASTAPI_PATH = Path(__file__).resolve().parent.parent.parent / "FAST-API.md"


@app.get("/", response_class=PlainTextResponse, include_in_schema=False)
def home(db: Session = Depends(get_db)) -> PlainTextResponse:
    """Return the home page with game statistics."""
    total = db.query(func.count(models.Game.id)).scalar() or 0
    won_x = db.query(func.count(models.Game.id)).filter(models.Game.status == "x_wins").scalar() or 0
    won_o = db.query(func.count(models.Game.id)).filter(models.Game.status == "o_wins").scalar() or 0
    open_games = db.query(func.count(models.Game.id)).filter(models.Game.status == "in_progress").scalar() or 0
    body = (
        f"{HEADER}\n"
        f"\n"
        f"Total Games: {total}\n"
        f"Won by X: {won_x}\n"
        f"Won by O: {won_o}\n"
        f"Open Games: {open_games}\n"
        f"\n"
        f"Next: /games/new\n"
        f"Guide: /OVERVIEW.md\n"
        f"Help: /README.md\n"
        f"Docs: /docs\n"
        f"Structure: /FAST-API.md\n"
    )
    return PlainTextResponse(body)


@app.get("/README.md", response_class=PlainTextResponse, include_in_schema=False)
def readme(pretty: str | None = None):
    """Serve the README as plain text (or styled HTML with ?pretty)."""
    if pretty is not None:
        return render_markdown_html(README_PATH, "fast-ttt README")
    return PlainTextResponse(README_PATH.read_text())


@app.get("/OVERVIEW.md", response_class=PlainTextResponse, include_in_schema=False)
def overview(pretty: str | None = None):
    """Serve the OVERVIEW as plain text (or styled HTML with ?pretty)."""
    if pretty is not None:
        return render_markdown_html(OVERVIEW_PATH, "Client and Server")
    return PlainTextResponse(OVERVIEW_PATH.read_text())


@app.get("/FAST-API.md", response_class=PlainTextResponse, include_in_schema=False)
def fastapi_doc(pretty: str | None = None):
    """Serve FAST-API.md as plain text (or styled HTML with ?pretty)."""
    if pretty is not None:
        return render_markdown_html(FASTAPI_PATH, "FastAPI App Structure")
    return PlainTextResponse(FASTAPI_PATH.read_text())


@app.get("/health", response_class=PlainTextResponse)
def health(db: Session = Depends(get_db)) -> PlainTextResponse:
    """Report server status, a DB connectivity check, and the current time."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    body = (
        "[ Health ]\n"
        f"Status: ok\n"
        f"Database: {db_status}\n"
        f"Time: {now}\n"
    )
    return PlainTextResponse(body)


@app.get("/games/new", response_class=PlainTextResponse)
def create_game(db: Session = Depends(get_db)) -> PlainTextResponse:
    """Create a new game (first player is X for odd ids, O for even ids)."""
    game = models.Game(
        board="         ",
        current_turn="X",
        status="in_progress",
        winner=None,
    )
    db.add(game)
    db.flush()
    if game.id % 2 == 0:
        game.current_turn = "O"
    db.commit()
    db.refresh(game)
    body = render_board(
        game.board,
        game.status,
        game.current_turn,
        game.winner,
        game.id,
        headline=f"Game {game.id} created.",
    )
    return PlainTextResponse(body, status_code=201)


@app.get("/games", response_class=PlainTextResponse)
def list_games(db: Session = Depends(get_db)) -> PlainTextResponse:
    """List all games with their status."""
    games = db.query(models.Game).order_by(models.Game.id.asc()).all()
    if not games:
        return PlainTextResponse("[ Tic-Tac-Toe ]\n\nNo games yet.\n")
    status_labels = {
        "in_progress": "In Progress",
        "x_wins": "X Wins",
        "o_wins": "O Wins",
        "draw": "Draw",
    }
    lines = [
        f"/games/{g.id} -> {status_labels.get(g.status, g.status)}"
        for g in games
    ]
    return PlainTextResponse("[ Tic-Tac-Toe ]\n\n" + "\n".join(lines) + "\n")


@app.get("/games/{game_id}", response_class=PlainTextResponse)
def get_game(game_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Show one game's board."""
    game = get_game_or_404(db, game_id)
    return PlainTextResponse(
        render_board(game.board, game.status, game.current_turn, game.winner, game.id)
    )


@app.get("/games/{game_id}/moves", response_class=PlainTextResponse)
def list_moves(game_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Show a game's board followed by its move history."""
    game = get_game_or_404(db, game_id)
    moves = (
        db.query(models.Move)
        .filter(models.Move.game_id == game.id)
        .order_by(models.Move.id.asc())
        .all()
    )
    body = render_board(
        game.board,
        game.status,
        game.current_turn,
        game.winner,
        game.id,
        headline=f"Moves for game {game.id}",
    )
    if not moves:
        body += "\nNo moves yet.\n"
    else:
        lines = [
            f"Move {n}: {move.player} at {move.position}"
            for n, move in enumerate(moves, start=1)
        ]
        body += "\n" + "\n".join(lines) + "\n"
    return PlainTextResponse(body)


@app.get("/games/{game_id}/auto", response_class=PlainTextResponse)
def auto_move(game_id: str, db: Session = Depends(get_db)) -> PlainTextResponse:
    """Make one random move for the current player."""
    game = get_game_or_404(db, game_id)
    if game.status != "in_progress":
        return move_error(game, 409, f"Game {game_id} is already finished.")
    empty = [i + 1 for i, cell in enumerate(game.board) if cell == " "]
    pos = random.choice(empty)
    player = game.current_turn
    _move, _move_number = apply_move(db, game, player, pos)
    body = render_board(
        game.board,
        game.status,
        game.current_turn,
        game.winner,
        game.id,
        headline=f"Auto move: {player} at {pos}",
    )
    return PlainTextResponse(body, status_code=201)


@app.get("/games/{game_id}/player/{player}/move/{position}", status_code=201, response_class=PlainTextResponse)
def make_move(
    game_id: str,
    player: str,
    position: str,
    db: Session = Depends(get_db),
) -> PlainTextResponse:
    """Place one move for a player, validating turn, position, and occupancy."""
    # Step 1: game exists (404).
    game = get_game_or_404(db, game_id)

    # Step 1b: player must be X/x or O/o (422).
    player = player.upper()
    if player not in ("X", "O"):
        return move_error(game, 422, f"Player {player!r} must be X or O.")

    # Step 2: game still in progress (409).
    if game.status != "in_progress":
        return move_error(game, 409, f"Game {game_id} is already finished.")

    # Step 3: correct player's turn (409).
    if player != game.current_turn:
        return move_error(game, 409, f"Wrong turn: it is {game.current_turn}'s turn.")

    # Step 4: position parses to an integer in 1-9 (422).
    try:
        pos = int(position)
    except (TypeError, ValueError):
        return move_error(game, 422, f"Position {position} is out of range (1-9).")
    if pos < 1 or pos > 9:
        return move_error(game, 422, f"Position {position} is out of range (1-9).")

    # Step 5: target cell is empty (409).
    if game.board[pos - 1] != " ":
        return move_error(game, 409, f"Position {position} is already occupied.")

    # Apply the move atomically and compose the confirmation response.
    _move, move_number = apply_move(db, game, player, pos)
    body = render_board(
        game.board,
        game.status,
        game.current_turn,
        game.winner,
        game.id,
        headline=f"Move {move_number}: {player} at {pos}",
    )
    return PlainTextResponse(body, status_code=201)
