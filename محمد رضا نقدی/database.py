"""SQLite connection lifecycle and schema creation. No queries beyond the schema."""

import sqlite3
from pathlib import Path

from flask import Flask, current_app, g

_SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_db() -> sqlite3.Connection:
    """Return the request's connection, opening it on first use."""
    db = g.get("db")
    if db is None:
        db = sqlite3.connect(current_app.config["DATABASE"])
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        g.db = db
    return db


def close_db(e=None) -> None:
    """Close the connection stored on ``g``, if one was opened.

    ``e`` is the exception that caused teardown, when there is one.
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    """Create the database file's directory and apply schema.sql.

    Safe to call on every startup: the schema uses IF NOT EXISTS.
    """
    db_path = Path(current_app.config["DATABASE"])
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema_sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    db = get_db()
    db.executescript(schema_sql)


def init_app(app: Flask) -> None:
    """Register teardown and create the schema inside an app context."""
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()
