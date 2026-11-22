"""End-to-end tests for registration, login, session security, and dashboard access."""
import re
import sqlite3

import pytest
from werkzeug.security import check_password_hash

from app import create_app


@pytest.fixture()
def app(tmp_path):
    database_path = tmp_path / "test-auth.db"
    flask_app = create_app(
        {
            "TESTING": True,
            "DATABASE": database_path,
            "SECRET_KEY": "test-only-secret-key",
        }
    )
    yield flask_app


@pytest.fixture()
def client(app):
    return app.test_client()


def csrf_token(client, path="/signup"):
    response = client.get(path)
    assert response.status_code == 200
    match = re.search(r'name="csrf_token" value="([^"]+)"', response.get_data(as_text=True))
    assert match is not None, "The form must include its session CSRF token"
    return match.group(1)


def register(client, username="greemade", password="StrongPass123"):
    token = csrf_token(client, "/signup")
    return client.post(
        "/signup",
        data={"username": username, "password": password, "csrf_token": token},
        follow_redirects=False,
    )


def test_signup_persists_only_a_password_hash(app, client):
    response = register(client)
    assert response.status_code == 303
    assert response.headers["Location"].endswith("/login")

    with sqlite3.connect(app.config["DATABASE"]) as db:
        row = db.execute(
            "SELECT username, password_hash FROM users WHERE username = ?",
            ("greemade",),
        ).fetchone()

    assert row is not None
    assert row[0] == "greemade"
    assert row[1] != "StrongPass123"
    assert check_password_hash(row[1], "StrongPass123")


def test_signup_rejects_invalid_input_and_duplicate_username(client):
    token = csrf_token(client)
    invalid = client.post(
        "/signup",
        data={"username": "x", "password": "short", "csrf_token": token},
    )
    assert invalid.status_code == 400

    assert register(client, "Greemade").status_code == 303
    duplicate = client.post(
        "/signup",
        data={
            "username": "greemade",
            "password": "AnotherPass123",
            "csrf_token": csrf_token(client),
        },
    )
    assert duplicate.status_code == 400
    assert "قبلاً ثبت شده" in duplicate.get_data(as_text=True)


def test_login_creates_session_and_protected_dashboard(client):
    assert register(client).status_code == 303
    token = csrf_token(client, "/login")
    response = client.post(
        "/login",
        data={"username": "greemade", "password": "StrongPass123", "csrf_token": token},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["Location"].endswith("/home")

    with client.session_transaction() as session:
        assert type(session.get("user_id")) is int
        assert "csrf" not in session

    dashboard = client.get("/home")
    assert dashboard.status_code == 200
    assert "greemade" in dashboard.get_data(as_text=True)
    assert "داشبورد حساب کاربری" in dashboard.get_data(as_text=True)


def test_failed_login_uses_one_generic_message(client):
    token = csrf_token(client, "/login")
    unknown_user = client.post(
        "/login",
        data={"username": "nobody", "password": "WrongPass123", "csrf_token": token},
    )
    wrong_password = client.post(
        "/login",
        data={"username": "another", "password": "WrongPass123", "csrf_token": token},
    )
    assert unknown_user.status_code == 401
    assert wrong_password.status_code == 401
    assert unknown_user.get_data(as_text=True) == wrong_password.get_data(as_text=True)


def test_protected_route_logout_and_csrf_enforcement(client):
    unauthenticated = client.get("/home")
    assert unauthenticated.status_code == 302
    assert unauthenticated.headers["Location"].endswith("/login")

    assert register(client).status_code == 303
    token = csrf_token(client, "/login")
    assert client.post(
        "/login",
        data={"username": "greemade", "password": "StrongPass123", "csrf_token": token},
    ).status_code == 303

    rejected = client.post("/logout")
    assert rejected.status_code == 400

    logout_token = csrf_token(client, "/home")
    logged_out = client.post(
        "/logout",
        data={"csrf_token": logout_token},
        follow_redirects=False,
    )
    assert logged_out.status_code == 303
    assert logged_out.headers["Location"].endswith("/login")
    assert client.get("/home").status_code == 302


def test_security_headers_are_added_to_responses(client):
    response = client.get("/login")
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
