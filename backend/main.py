"""
HomeServer — FastAPI application entry point.
Serves the API and the built React frontend.
Security: CORS locked down, rate-limited auth endpoints, input validation.
"""

import os
import re
import logging
import traceback
import secrets
import hashlib
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

from database import engine, get_db, Base
from models import User, FileRecord, Device, StorageRequest, DEFAULT_STORAGE_QUOTA
from auth import (
    hash_password, verify_password, create_token, validate_password_strength,
    get_current_user, parse_device_name,
)
from files import router as files_router
from middleware import SecurityHeadersMiddleware, RangeRequestMiddleware

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# ---------------------------------------------------------------------------
# Database auto-migration helper for existing SQLite databases
# ---------------------------------------------------------------------------
def auto_migrate_db():
    """Ensure missing columns in existing tables are added automatically."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("users")]
        with engine.begin() as conn:
            if "is_admin" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"))
            if "is_active" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
            if "storage_quota" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN storage_quota BIGINT NOT NULL DEFAULT 5368709120"))
            if "last_login" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
            if "reset_token" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR"))
            if "reset_token_expires" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
            if "password_changed_at" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME"))

auto_migrate_db()
Base.metadata.create_all(bind=engine)

logger = logging.getLogger("homeserver")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="HomeServer", docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Auto-promote first user to admin
AUTO_ADMIN_FIRST_USER = os.getenv("AUTO_ADMIN_FIRST_USER", "true").lower() in ("true", "1", "yes")

# ---------------------------------------------------------------------------
# Middleware stack (order matters — last added runs first)
# ---------------------------------------------------------------------------

# Range request support for streaming
app.add_middleware(RangeRequestMiddleware)

# Security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

# CORS — locked down to explicit origins
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:8000"
).split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# File routes
# ---------------------------------------------------------------------------
app.include_router(files_router)

# ---------------------------------------------------------------------------
# Admin routes (imported after app setup to avoid circular imports)
# ---------------------------------------------------------------------------
from admin import router as admin_router
app.include_router(admin_router)


# ---------------------------------------------------------------------------
# Request models with validation
# ---------------------------------------------------------------------------
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3–30 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username may only contain letters, digits, and underscores")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        if len(v) > 254:
            raise ValueError("Email address too long")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class StorageRequestCreate(BaseModel):
    requested_amount: int  # In GB
    message: str = ""


class MessageCreate(BaseModel):
    subject: str = ""
    content: str


class DeletionRequestCreate(BaseModel):
    reason: str = ""


class ForgotPasswordRequest(BaseModel):
    email_or_username: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------------------------------------------------------------------------
# Device tracking helper
# ---------------------------------------------------------------------------
def track_device(db: Session, user: User, request: Request):
    """Create or update a device record for this login."""
    ua = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else "unknown"
    device_name = parse_device_name(ua)

    # Try to find existing device by user + IP + UA combo
    existing = (
        db.query(Device)
        .filter(
            Device.user_id == user.id,
            Device.ip_address == ip,
            Device.user_agent == ua,
        )
        .first()
    )

    if existing:
        existing.last_seen = datetime.utcnow()
        existing.is_active = True
    else:
        device = Device(
            user_id=user.id,
            device_name=device_name,
            user_agent=ua,
            ip_address=ip,
        )
        db.add(device)
    db.commit()


# ---------------------------------------------------------------------------
# Auth endpoints (rate-limited)
# ---------------------------------------------------------------------------
@app.post("/api/auth/signup")
@limiter.limit("3/minute")
def signup(request: Request, data: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account."""

    # Validate password strength
    issues = validate_password_strength(data.password)
    if issues:
        raise HTTPException(status_code=400, detail="; ".join(issues))

    # Check for existing username
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check for existing email
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if this should be auto-promoted to admin (first user)
    is_first_user = db.query(User).count() == 0
    should_be_admin = AUTO_ADMIN_FIRST_USER and is_first_user

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        is_admin=should_be_admin,
        storage_quota=DEFAULT_STORAGE_QUOTA,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Update last_login and track device
    user.last_login = datetime.utcnow()
    db.commit()
    track_device(db, user, request)

    token = create_token({"sub": user.username})
    return {
        "token": token,
        "username": user.username,
        "is_admin": user.is_admin,
    }


@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    user = db.query(User).filter(User.username == data.username).first()

    # Generic error to prevent username enumeration
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been disabled")

    # Update last login and track device
    user.last_login = datetime.utcnow()
    db.commit()
    track_device(db, user, request)

    token = create_token({"sub": user.username})
    return {
        "token": token,
        "username": user.username,
        "is_admin": user.is_admin,
    }


@app.post("/api/auth/forgot-password")
@limiter.limit("5/15minutes")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset link."""
    identifier = data.email_or_username.strip().lower()
    
    # Generic success message for anti-enumeration
    success_msg = {"message": "If an account with that email or username exists, password reset instructions have been generated."}
    
    user = db.query(User).filter(
        (sql_func.lower(User.email) == identifier) | 
        (sql_func.lower(User.username) == identifier)
    ).first()
    
    if not user or not user.is_active:
        return success_msg
        
    # Generate token
    raw_token = secrets.token_urlsafe(32)
    hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()
    
    user.reset_token = hashed_token
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=20)
    db.commit()
    
    # Generate the reset link dynamically using the request origin or base URL
    # This ensures the link uses the correct port/IP the user is currently accessing
    origin = request.headers.get("origin")
    if origin:
        frontend_url = origin.rstrip("/")
    else:
        frontend_url = os.getenv("FRONTEND_URL", str(request.base_url).rstrip("/"))
        
    reset_link = f"{frontend_url}/reset-password?token={raw_token}"
    
    # Print clearly to server logs
    logger.warning(
        f"\n{'='*60}\n"
        f"[FORGOT PASSWORD] Reset requested for user: {user.username}\n"
        f"Reset Link (valid for 20 minutes):\n{reset_link}\n"
        f"{'='*60}\n"
    )
    
    return success_msg


@app.post("/api/auth/reset-password")
@limiter.limit("5/15minutes")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid token."""
    hashed_token = hashlib.sha256(data.token.encode()).hexdigest()
    
    user = db.query(User).filter(User.reset_token == hashed_token).first()
    
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")
        
    # Validate new password
    issues = validate_password_strength(data.new_password)
    if issues:
        raise HTTPException(status_code=400, detail="; ".join(issues))
        
    # Update password and invalidate token
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.password_changed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password successfully reset. Please log in with your new password."}


@app.post("/api/auth/change-password")
def change_password(data: ChangePasswordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Change password for an authenticated user."""
    # Verify current password
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    # Ensure new password is different
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
        
    # Validate new password strength
    issues = validate_password_strength(data.new_password)
    if issues:
        raise HTTPException(status_code=400, detail="; ".join(issues))
        
    # Update password
    user.hashed_password = hash_password(data.new_password)
    user.password_changed_at = datetime.utcnow()
    db.commit()
    
    # Issue a new token so their current session isn't killed immediately by the frontend
    # but all other sessions will die because they have an old `iat`.
    new_token = create_token({"sub": user.username})
    
    return {
        "message": "Password successfully changed.",
        "token": new_token
    }


# ---------------------------------------------------------------------------
# User profile & storage endpoints
# ---------------------------------------------------------------------------
@app.get("/api/user/profile")
def get_profile(user: User = Depends(get_current_user)):
    """Get the current user's profile info."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
        "created_at": str(user.created_at),
    }


@app.get("/api/user/storage-info")
def get_storage_info(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's storage usage and quota."""
    used = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )
    file_count = db.query(FileRecord).filter(FileRecord.owner_id == user.id).count()
    quota = user.storage_quota

    return {
        "used": used,
        "quota": quota,
        "percentage": round((used / quota) * 100, 1) if quota > 0 else 0,
        "file_count": file_count,
    }


@app.post("/api/user/storage-request")
@limiter.limit("3/hour")
def create_storage_request(
    request: Request,
    data: StorageRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a storage increase request to admin."""
    # Check if user already has a pending request
    pending = (
        db.query(StorageRequest)
        .filter(StorageRequest.user_id == user.id, StorageRequest.status == "pending")
        .first()
    )
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending storage request")

    used = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )

    # Convert GB to bytes
    requested_bytes = data.requested_amount * (1024 ** 3)

    sr = StorageRequest(
        user_id=user.id,
        requested_amount=requested_bytes,
        current_usage=used,
        message=data.message[:500] if data.message else None,  # Limit message length
    )
    db.add(sr)
    db.commit()
    db.refresh(sr)
    return {"id": sr.id, "status": sr.status, "message": "Request submitted successfully"}


@app.get("/api/user/storage-requests")
def get_my_storage_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's storage requests."""
    requests = (
        db.query(StorageRequest)
        .filter(StorageRequest.user_id == user.id)
        .order_by(StorageRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": sr.id,
            "requested_amount": sr.requested_amount,
            "current_usage": sr.current_usage,
            "message": sr.message,
            "status": sr.status,
            "admin_response": sr.admin_response,
            "created_at": str(sr.created_at),
            "updated_at": str(sr.updated_at),
        }
        for sr in requests
    ]


# ---------------------------------------------------------------------------
# Support messaging endpoints (User ↔ Admin)
# ---------------------------------------------------------------------------
@app.post("/api/user/messages")
@limiter.limit("10/hour")
def send_user_message(
    request: Request,
    data: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a support message to the admin team."""
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    from models import Message

    msg = Message(
        user_id=user.id,
        sender_id=user.id,
        subject=data.subject[:150] if data.subject else None,
        content=data.content[:2000].strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "message": "Message sent to admin successfully"}


@app.get("/api/user/messages")
def get_user_messages(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's message thread with the admin."""
    from models import Message

    # Fetch messages in this user's thread
    messages = (
        db.query(Message)
        .filter(Message.user_id == user.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # Mark incoming admin messages as read by this user
    unread_admin_msgs = [
        m for m in messages if m.sender_id != user.id and not m.is_read
    ]
    if unread_admin_msgs:
        for m in unread_admin_msgs:
            m.is_read = True
        db.commit()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "is_from_admin": m.sender_id != user.id,
            "subject": m.subject,
            "content": m.content,
            "is_read": m.is_read,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


# ---------------------------------------------------------------------------
# Account deletion request endpoints
# ---------------------------------------------------------------------------
@app.post("/api/user/deletion-request")
@limiter.limit("2/day")
def submit_deletion_request(
    request: Request,
    data: DeletionRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an account deletion request for admin review."""
    from models import DeletionRequest

    # Check for existing pending request
    pending = (
        db.query(DeletionRequest)
        .filter(DeletionRequest.user_id == user.id, DeletionRequest.status == "pending")
        .first()
    )
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending deletion request")

    dr = DeletionRequest(
        user_id=user.id,
        reason=data.reason[:500] if data.reason else None,
    )
    db.add(dr)
    db.commit()
    db.refresh(dr)
    return {"id": dr.id, "status": dr.status, "message": "Account deletion request submitted for admin review"}


@app.get("/api/user/deletion-request")
def get_user_deletion_request(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get status of the current user's latest deletion request."""
    from models import DeletionRequest

    dr = (
        db.query(DeletionRequest)
        .filter(DeletionRequest.user_id == user.id)
        .order_by(DeletionRequest.created_at.desc())
        .first()
    )
    if not dr:
        return {"has_request": False}

    return {
        "has_request": True,
        "id": dr.id,
        "status": dr.status,
        "reason": dr.reason,
        "admin_response": dr.admin_response,
        "created_at": str(dr.created_at),
        "updated_at": str(dr.updated_at),
    }


# ---------------------------------------------------------------------------
# Global error handlers — prevent internal detail leakage
# ---------------------------------------------------------------------------
@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    """Return clean validation errors without exposing Pydantic internals."""
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data. Please check your input."},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler: log the real error, return a generic message."""
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    logger.debug(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Serve React frontend (production build)
# ---------------------------------------------------------------------------
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
        name="assets",
    )

    @app.get("/favicon.svg")
    def favicon():
        favicon_path = os.path.join(FRONTEND_DIST, "favicon.svg")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        raise HTTPException(status_code=404)

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Catch-all route: serve the React SPA index.html for client-side routing."""
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))