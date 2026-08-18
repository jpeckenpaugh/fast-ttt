from .rules import winning_line


def render_grid(board: str, show_numbers: bool = True, winning_cells: set[int] | None = None) -> str:
    """Render a 9-char board as the 3x3 ASCII grid (no status line).

    When show_numbers is True, empty cells are shown as their position numbers.
    Cells in winning_cells are rendered with dashes around them (-X-) to mark a
    winning line.
    """
    rows = []
    for row in range(3):
        cells = []
        for col in range(3):
            index = row * 3 + col
            cell = board[index]
            if cell == " ":
                cell = str(index + 1) if show_numbers else " "
            if winning_cells and index in winning_cells:
                cells.append(f"[{cell}]")
            else:
                cells.append(f" {cell} ")
        rows.append("|".join(cells))
    return "\n  ---|---|---\n".join(f"  {row}" for row in rows)


def render_board(board: str, status: str, current_turn: str, winner: str | None = None, game_id: int | None = None, headline: str | None = None) -> str:
    """Render the header, optional headline, the grid, a blank line, and the status line.

    headline (e.g. 'Move 5: X at 9') is placed on the line directly below the
    header, before the board.

    status == 'in_progress' -> 'Turn: {current_turn}'
    status == 'x_wins'      -> 'X wins!'
    status == 'o_wins'      -> 'O wins!'
    status == 'draw'        -> 'Draw!'
    """
    if game_id is not None:
        headline_block = f"{headline}\n" if headline else ""
        title = f"[ Tic-Tac-Toe ]\n{headline_block}\n"
    else:
        title = ""
    line = winning_line(board) if status in ("x_wins", "o_wins") else None
    winning_cells = set(line) if line else None
    grid = render_grid(board, show_numbers=status == "in_progress", winning_cells=winning_cells)
    if status == "in_progress":
        status_line = f"Turn: {current_turn}"
    elif status == "x_wins":
        status_line = "X wins!"
    elif status == "o_wins":
        status_line = "O wins!"
    elif status == "draw":
        status_line = "Draw!"
    else:
        raise ValueError(f"Unknown status: {status!r}")
    if game_id is not None:
        game_line = f"\n\n=== Game {game_id} ===\n"
    else:
        game_line = ""
    if game_id is not None and status == "in_progress":
        hint = f"\nNext: /games/{game_id}/player/{current_turn}/move/{{number}}\n"
    elif game_id is not None:
        hint = "\nNext: /games/new\n"
    else:
        hint = ""
    return f"{title}{grid}{game_line}{status_line}{hint}"