"""User persistence. The only module that writes SQL."""

import sqlite3

import database


class DuplicateUsernameError(Exception):
    """Raised when the username is already stored, including a concurrent insert."""


def create_user(username: str, password_hash: str) -> int:
    """Insert a user and return the new id. No validation or hashing here."""
    db = database.get_db()
    try:
        cursor = db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        db.rollback()
        raise DuplicateUsernameError(username) from exc
    user_id = cursor.lastrowid
    if user_id is None:
        raise sqlite3.DatabaseError("INSERT did not return lastrowid")
    return user_id


def get_user_by_username(username: str) -> sqlite3.Row | None:
    """Look up a user. Column collation makes the match case-insensitive."""
    return database.get_db().execute(
        """
        SELECT id, username, password_hash, created_at
        FROM users
        WHERE username = ?
        """,
        (username,),
    ).fetchone()


def get_user_by_id(user_id: int) -> sqlite3.Row | None:
    """Return the user with this id, or None."""
    return database.get_db().execute(
        """
        SELECT id, username, password_hash, created_at
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()


def count_users() -> int:
    """Return the current number of users. Never cached."""
    row = database.get_db().execute("SELECT COUNT(*) FROM users").fetchone()
    if row is None:
        return 0
    return int(row[0])
