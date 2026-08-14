"""
Authentication module for HomeServer.
Handles password hashing, JWT token creation/verification, and user extraction.
SECRET_KEY must be set via environment variable — the server will refuse to start otherwise.
"""

import os
import re
from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User

# ---------------------------------------------------------------------------
# SECRET_KEY enforcement — fail hard if missing or weak
# ---------------------------------------------------------------------------
_KNOWN_WEAK_KEYS = {
    "fallback-secret-change-me",
    "change-this-to-a-long-random-string",
    "secret",
    "changeme",
    "",
}

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY.strip().lower() in _KNOWN_WEAK_KEYS:
    raise RuntimeError(
        "\n\n"
        "╔══════════════════════════════════════════════════════════════╗\n"
        "║  FATAL: SECRET_KEY is missing or uses a known weak value.  ║\n"
        "║  Set a strong random SECRET_KEY in your .env file:         ║\n"
        "║                                                            ║\n"
        "║  python3 -c \"import secrets; print(secrets.token_urlsafe(64))\"  ║\n"
        "╚══════════════════════════════════════════════════════════════╝\n"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# Password strength validation
# ---------------------------------------------------------------------------
def validate_password_strength(password: str) -> list[str]:
    """
    Validate password complexity.
    Returns a list of unmet requirements (empty list = valid).
    """
    issues = []
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        issues.append("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        issues.append("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        issues.append("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        issues.append("Password must contain at least one special character")
    return issues


# ---------------------------------------------------------------------------
# JWT token creation & verification
# ---------------------------------------------------------------------------
def create_token(data: dict) -> str:
    """Create a signed JWT token with an expiration claim."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that extracts and validates the current user
    from the Authorization header's Bearer token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise credentials_exception
    return user