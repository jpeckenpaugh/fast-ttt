from fastapi import HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from pathlib import Path

from . import models
from .rendering import render_board


def render_markdown_html(path: Path, title: str) -> HTMLResponse:
    """Render a markdown file as a simple styled HTML page."""
    import markdown

    html = markdown.markdown(path.read_text(), extensions=["fenced_code", "tables"])
    body = (
        "<html><head><meta charset='utf-8'>"
        f"<title>{title}</title>"
        "<style>"
        "body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
        "max-width:820px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222}"
        "code{background:#f0f0f0;padding:2px 4px;border-radius:3px;font-size:90%}"
        "pre{background:#f6f6f6;padding:12px;border-radius:6px;overflow:auto}"
        "pre code{background:none;padding:0}"
        "table{border-collapse:collapse}"
        "th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}"
        "a{color:#0366d6}"
        "blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:16px;color:#555}"
        "</style></head><body>"
        f"{html}"
        "</body></html>"
    )
    return HTMLResponse(body)


def plain_text_exception_handler(request, exc: HTTPException) -> PlainTextResponse:
    """Render every HTTPException as text/plain with exc.detail as the body."""
    body = str(exc.detail)
    if not body.endswith("\n"):
        body += "\n"
    return PlainTextResponse(body, status_code=exc.status_code)


def get_game_or_404(db, game_id: str) -> models.Game:
    """Convert game_id to int and fetch the game; raise a plain-text 404 otherwise."""
    try:
        game_id_int = int(game_id)
    except ValueError:
        raise HTTPException(404, detail=f"Game {game_id} not found.")
    game = db.get(models.Game, game_id_int)
    if game is None:
        raise HTTPException(404, detail=f"Game {game_id} not found.")
    return game


def move_error(game: models.Game, status_code: int, detail: str) -> PlainTextResponse:
    """Render the board with the error detail appended on the final line."""
    body = render_board(game.board, game.status, game.current_turn, game.winner, game.id)
    return PlainTextResponse(f"{body}{detail}\n", status_code=status_code)
