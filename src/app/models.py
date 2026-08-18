from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint("current_turn IN ('X', 'O')", name="ck_games_current_turn"),
        CheckConstraint(
            "status IN ('in_progress', 'x_wins', 'o_wins', 'draw')",
            name="ck_games_status",
        ),
        CheckConstraint("winner IS NULL OR winner IN ('X', 'O')", name="ck_games_winner"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board: Mapped[str] = mapped_column(String(9), nullable=False, server_default="         ")
    current_turn: Mapped[str] = mapped_column(String(1), nullable=False, server_default="X")
    status: Mapped[str] = mapped_column(
        String(12), nullable=False, server_default="in_progress"
    )
    winner: Mapped[str | None] = mapped_column(String(1), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    moves: Mapped[list["Move"]] = relationship(
        back_populates="game", cascade="all, delete-orphan", passive_deletes=True
    )


class Move(Base):
    __tablename__ = "moves"
    __table_args__ = (
        CheckConstraint("player IN ('X', 'O')", name="ck_moves_player"),
        CheckConstraint("position BETWEEN 1 AND 9", name="ck_moves_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    player: Mapped[str] = mapped_column(String(1), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    game: Mapped["Game"] = relationship(back_populates="moves")
