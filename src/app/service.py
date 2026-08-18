from sqlalchemy.orm import Session

from . import models
from .rules import evaluate_board


def apply_move(db: Session, game: models.Game, player: str, position: int) -> tuple[models.Move, int]:
    """Apply one accepted move atomically.

    Inserts the Move row, places the mark on the board, switches current_turn,
    evaluates the board, persists status/winner, and commits once.
    Returns (move, move_number) where move_number is the 1-based ordinal of the
    new move within the game's history.
    """
    move = models.Move(game_id=game.id, player=player, position=position)
    db.add(move)
    db.flush()

    board = list(game.board)
    board[position - 1] = player
    game.board = "".join(board)

    game.current_turn = "O" if player == "X" else "X"

    status = evaluate_board(game.board)
    game.status = status
    game.winner = "X" if status == "x_wins" else "O" if status == "o_wins" else None

    db.commit()
    db.refresh(move)
    move_number = db.query(models.Move).filter(models.Move.game_id == game.id).count()
    return move, move_number
