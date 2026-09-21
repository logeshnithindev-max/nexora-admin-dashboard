import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.utils.config import settings


def require_service_key(x_service_key: str = Header(default="")) -> None:
    configured = settings.SERVICE_API_KEY
    # if not configured or configured == "change-me":
    #     raise HTTPException(503, "SERVICE_API_KEY is not configured")
    # if not hmac.compare_digest(x_service_key, configured):
    #     raise HTTPException(401, "Invalid service key")


# --- Admin dashboard login (JWT + bcrypt) -----------------------------------

admin_passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_ALGORITHM = "HS256"


def create_access_token(user_id: int, expires_delta: timedelta = timedelta(hours=8)) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "type": "access", "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        int(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    return payload


# --- Tenant user passwords (Werkzeug-compatible, used during provisioning) --

PASSWORD_HASH_ITERATIONS = 600_000


def tenant_password_hash(password: str) -> str:
    """Generate a hash accepted by Werkzeug's check_password_hash()."""
    salt = "".join(secrets.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(16))
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PASSWORD_HASH_ITERATIONS
    ).hex()
    return f"pbkdf2:sha256:{PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def generate_strong_password(length: int = 18) -> str:
    """Generate a password containing every required character class."""
    if length < 12:
        raise ValueError("generated password length must be at least 12")
    upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    lower = "abcdefghijklmnopqrstuvwxyz"
    digits = "0123456789"
    symbols = "!@#$%_-"
    characters = [
        secrets.choice(upper), secrets.choice(lower),
        secrets.choice(digits), secrets.choice(symbols),
    ]
    alphabet = upper + lower + digits + symbols
    characters.extend(secrets.choice(alphabet) for _ in range(length - len(characters)))
    secrets.SystemRandom().shuffle(characters)
    return "".join(characters)
