"""Flask routes for the authentication application.

The session stores only the authenticated user id and a CSRF token.
Password values are never stored in the session, logged, or rendered.
"""
import hmac
import secrets

from flask import Flask, abort, flash, get_flashed_messages, redirect, render_template, request, session, url_for

import auth_service
import database
import repository
from config import Config

_SIGNUP_SUCCESS = "حساب شما ساخته شد. اکنون وارد شوید."
_BAD_REQUEST = "درخواست نامعتبر است."
_NOT_FOUND = "صفحه پیدا نشد."


def get_csrf_token() -> str:
    """Return this session's CSRF token, creating a fresh token if needed."""
    token = session.get("csrf")
    if not isinstance(token, str) or not token or not token.isascii():
        token = secrets.token_urlsafe(32)
        session["csrf"] = token
    return token


def current_user():
    """Return the signed-in user or clear a stale/malformed session."""
    user_id = session.get("user_id")
    if user_id is None:
        return None
    if type(user_id) is not int:
        session.clear()
        return None
    user = repository.get_user_by_id(user_id)
    if user is None:
        session.clear()
        return None
    return user


def _form_text(name: str) -> str:
    """Read a form field. Missing or non-string values become an empty string."""
    value = request.form.get(name, "")
    return value if isinstance(value, str) else ""


def _reject_bad_csrf() -> None:
    """Reject POST requests without a matching session CSRF token."""
    if request.method != "POST":
        return
    expected = session.get("csrf")
    supplied = request.form.get("csrf_token", "")
    if not isinstance(expected, str) or not expected or not isinstance(supplied, str):
        abort(400)
    try:
        matches = hmac.compare_digest(expected, supplied)
    except (TypeError, ValueError):
        matches = False
    if not matches:
        abort(400)


def _security_headers(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; style-src 'unsafe-inline'; "
        "form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    )
    return response


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure the application; tests may inject an isolated DB."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config is not None:
        app.config.update(test_config)
    database.init_app(app)

    app.before_request(_reject_bad_csrf)
    app.after_request(_security_headers)

    @app.context_processor
    def inject_csrf_token() -> dict[str, str]:
        return {"csrf_token": get_csrf_token()}

    @app.errorhandler(400)
    @app.errorhandler(404)
    def handle_client_error(error):
        code = getattr(error, "code", 400) or 400
        message = _NOT_FOUND if code == 404 else _BAD_REQUEST
        return message, code, {"Content-Type": "text/plain; charset=utf-8"}

    def render_auth(mode: str, error: str | None, username: str, status: int = 200):
        success = None
        if error is None:
            flashed = get_flashed_messages(category_filter=["success"])
            if flashed:
                success = flashed[0]
        safe_username = username if isinstance(username, str) else ""
        return (
            render_template(
                "login.html",
                mode=mode,
                error=error,
                success=success,
                username=safe_username,
                user_count=repository.count_users(),
            ),
            status,
        )

    def redirect_home_if_logged_in():
        if current_user() is None:
            return None
        code = 303 if request.method == "POST" else 302
        return redirect(url_for("home"), code=code)

    @app.get("/")
    def index():
        if current_user() is None:
            return redirect(url_for("login"))
        return redirect(url_for("home"))

    @app.route("/login", methods=["GET", "POST"])
    def login():
        already = redirect_home_if_logged_in()
        if already is not None:
            return already
        if request.method == "GET":
            return render_auth("login", None, "")
        username = _form_text("username")
        password = _form_text("password")
        result = auth_service.login(username, password)
        if result.ok and type(result.user_id) is int:
            # Rotate the anonymous session before creating the authenticated one.
            session.clear()
            session["user_id"] = result.user_id
            return redirect(url_for("home"), code=303)
        return render_auth("login", result.error, username, 401)

    @app.route("/signup", methods=["GET", "POST"])
    def signup():
        already = redirect_home_if_logged_in()
        if already is not None:
            return already
        if request.method == "GET":
            return render_auth("signup", None, "")
        username = _form_text("username")
        password = _form_text("password")
        result = auth_service.signup(username, password)
        if result.ok:
            flash(_SIGNUP_SUCCESS, "success")
            return redirect(url_for("login"), code=303)
        return render_auth("signup", result.error, username, 400)

    @app.get("/home")
    def home():
        user = current_user()
        if user is None:
            return redirect(url_for("login"))
        return render_template("home.html", user=user, user_count=repository.count_users())

    @app.post("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"), code=303)

    return app


if __name__ == "__main__":
    # The built-in server is for local development only; debug mode stays off.
    create_app().run(host="127.0.0.1", port=5000, debug=False)
