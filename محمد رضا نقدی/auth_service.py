"""Signup and login rules. No Flask and no SQL.

Signup does not start a session. The caller stores user_id only after login.
"""

import re
import secrets
from dataclasses import dataclass

from werkzeug.security import check_password_hash, generate_password_hash

import repository
from repository import DuplicateUsernameError

USERNAME_PATTERN = r"[A-Za-z0-9_]{3,20}"
MIN_PASSWORD_LENGTH = 8
# Very long inputs are a DoS vector for slow hashes.
MAX_PASSWORD_LENGTH = 128

_USERNAME_ERROR = (
    "نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد و _ باشد"
)
_PASSWORD_SHORT_ERROR = "رمز عبور باید حداقل ۸ کاراکتر باشد"
_PASSWORD_LONG_ERROR = "رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد"
_DUPLICATE_USERNAME_ERROR = "این نام کاربری قبلاً ثبت شده است"
_LOGIN_ERROR = "نام کاربری یا رمز عبور اشتباه است"

# Hashed once so a missing user still costs one password check.
DUMMY_HASH = generate_password_hash(secrets.token_hex(16))


@dataclass(frozen=True)
class Result:
    """Outcome of signup or login. error is Persian when ok is False."""

    ok: bool
    error: str | None = None
    user_id: int | None = None


def signup(username: str, password: str) -> Result:
    """Validate, hash, and store a new user. Does not log them in."""
    username = username.strip()
    if re.fullmatch(USERNAME_PATTERN, username) is None:
        return Result(False, _USERNAME_ERROR)
    if len(password) < MIN_PASSWORD_LENGTH:
        return Result(False, _PASSWORD_SHORT_ERROR)
    if len(password) > MAX_PASSWORD_LENGTH:
        return Result(False, _PASSWORD_LONG_ERROR)

    password_hash = generate_password_hash(password)
    try:
        user_id = repository.create_user(username, password_hash)
    except DuplicateUsernameError:
        return Result(False, _DUPLICATE_USERNAME_ERROR)
    return Result(True, user_id=user_id)


def login(username: str, password: str) -> Result:
    """Check credentials. Every failure returns the same message."""
    username = username.strip()
    user = repository.get_user_by_username(username)
    # Never feed an unbounded password into the slow hash.
    if len(password) > MAX_PASSWORD_LENGTH:
        check_password_hash(DUMMY_HASH, "placeholder")
        return Result(False, _LOGIN_ERROR)
    if user is None:
        check_password_hash(DUMMY_HASH, password)
        return Result(False, _LOGIN_ERROR)
    if not check_password_hash(user["password_hash"], password):
        return Result(False, _LOGIN_ERROR)
    return Result(True, user_id=int(user["id"]))
