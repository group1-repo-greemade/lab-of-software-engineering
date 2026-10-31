"""Application configuration.

Secrets are never hardcoded. SESSION_COOKIE and size limits live here;
debug mode does not.
"""

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"


def load_secret_key(instance_dir: Path) -> str:
    """Return a stable signing secret.

    Prefer the SECRET_KEY environment variable. Otherwise read
    ``instance_dir / "secret_key"``, creating the directory and the file
    when they are missing so sessions survive restarts.
    """
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key

    instance_dir = Path(instance_dir)
    instance_dir.mkdir(exist_ok=True)
    key_path = instance_dir / "secret_key"
    if key_path.is_file():
        stored = key_path.read_text(encoding="utf-8").strip()
        if stored:
            return stored

    # 32 random bytes, hex-encoded. Never log this value.
    key = secrets.token_hex(32)
    key_path.write_text(key, encoding="utf-8")
    try:
        key_path.chmod(0o600)
    except OSError:
        # chmod is unsupported or a no-op on some Windows setups.
        pass
    return key


class Config:
    DATABASE = INSTANCE_DIR / "task1.db"
    SECRET_KEY = load_secret_key(INSTANCE_DIR)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # must be True behind HTTPS in production
    MAX_CONTENT_LENGTH = 16 * 1024
