from typing import Literal

GameStatus = Literal["in_progress", "x_wins", "o_wins", "draw"]

# 0-based indices; the design's 1-based lines (1,2,3), (4,5,6), ... map by subtracting 1.
WINNING_LINES: tuple[tuple[int, int, int], ...] = (
    (0, 1, 2),  # row 1
    (3, 4, 5),  # row 2
    (6, 7, 8),  # row 3
    (0, 3, 6),  # column 1
    (1, 4, 7),  # column 2
    (2, 5, 8),  # column 3
    (0, 4, 8),  # diagonal
    (2, 4, 6),  # diagonal
)


def evaluate_board(board: str) -> GameStatus:
    """Return exactly one of in_progress, x_wins, o_wins, draw for a 9-char board.

    Win is checked before draw; a line completed on the final move is a win.
    """
    for line in WINNING_LINES:
        marks = {board[i] for i in line}
        if len(marks) == 1 and " " not in marks:
            mark = marks.pop()
            if mark == "X":
                return "x_wins"
            if mark == "O":
                return "o_wins"
    if " " not in board:
        return "draw"
    return "in_progress"


def winning_line(board: str) -> tuple[int, int, int] | None:
    """Return the indices of the winning line, or None if there is no winner."""
    for line in WINNING_LINES:
        marks = {board[i] for i in line}
        if len(marks) == 1 and " " not in marks:
            return line
    return None