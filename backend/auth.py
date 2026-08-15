"""
Authentication module for HomeServer.
Handles password hashing, JWT token creation/verification, and user extraction.
SECRET_KEY must be set via environment variable — the server will refuse to start otherwise.
"""

import os
import re
import json
from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User, AuditLog

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
        '║  python3 -c "import secrets; print(secrets.token_urlsafe(64))"  ║\n'
        "╚══════════════════════════════════════════════════════════════╝\n"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Admin IP allowlist (optional)
ADMIN_ALLOWED_IPS = os.getenv("ADMIN_ALLOWED_IPS", "").strip()
ADMIN_ALLOWED_IPS = [ip.strip() for ip in ADMIN_ALLOWED_IPS.split(",") if ip.strip()] if ADMIN_ALLOWED_IPS else []


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
    now = datetime.utcnow()
    to_encode["exp"] = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["iat"] = now
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
        iat: int | None = payload.get("iat")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled",
        )
    
    if user.password_changed_at and iat:
        # Check if the token was issued before the password was changed
        pwd_changed_ts = user.password_changed_at.timestamp()
        if iat < (pwd_changed_ts - 2):  # 2-second grace margin
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalidated due to password change. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


# ---------------------------------------------------------------------------
# Admin-only dependency
# ---------------------------------------------------------------------------
def get_admin_user(
    request: Request,
    user: User = Depends(get_current_user),
) -> User:
    """
    FastAPI dependency that ensures the current user is an active admin.
    Optionally enforces IP allowlist via ADMIN_ALLOWED_IPS env variable.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    # IP allowlist check (if configured)
    if ADMIN_ALLOWED_IPS:
        client_ip = request.client.host if request.client else "unknown"
        if client_ip not in ADMIN_ALLOWED_IPS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access denied from this IP",
            )

    return user


# ---------------------------------------------------------------------------
# Audit logging helper
# ---------------------------------------------------------------------------
def log_admin_action(
    db: Session,
    admin: User,
    action: str,
    target_user_id: int | None = None,
    details: dict | None = None,
    ip_address: str = "",
):
    """Record an admin action in the audit log."""
    entry = AuditLog(
        admin_id=admin.id,
        action=action,
        target_user_id=target_user_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()


# ---------------------------------------------------------------------------
# Device tracking helper
# ---------------------------------------------------------------------------
def parse_device_name(user_agent: str) -> str:
    """Extract a friendly device name from the User-Agent string."""
    if not user_agent:
        return "Unknown Device"

    ua = user_agent.lower()

    # Mobile devices
    if "iphone" in ua:
        return "iPhone"
    if "ipad" in ua:
        return "iPad"
    if "android" in ua:
        if "mobile" in ua:
            return "Android Phone"
        return "Android Tablet"

    # Desktop browsers
    browser = "Browser"
    if "firefox" in ua:
        browser = "Firefox"
    elif "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua:
        browser = "Chrome"
    elif "safari" in ua:
        browser = "Safari"
    elif "opera" in ua or "opr" in ua:
        browser = "Opera"

    os_name = "Desktop"
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "Mac"
    elif "linux" in ua:
        os_name = "Linux"
    elif "cros" in ua:
        os_name = "ChromeOS"

    return f"{browser} on {os_name}"