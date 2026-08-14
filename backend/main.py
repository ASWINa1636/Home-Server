"""
HomeServer — FastAPI application entry point.
Serves the API and the built React frontend.
Security: CORS locked down, rate-limited auth endpoints, input validation.
"""

import os
import re
import logging
import traceback

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

from database import engine, get_db, Base
from models import User
from auth import hash_password, verify_password, create_token, validate_password_strength
from files import router as files_router
from middleware import SecurityHeadersMiddleware, RangeRequestMiddleware

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

logger = logging.getLogger("homeserver")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="HomeServer", docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token({"sub": user.username})
    return {"token": token, "username": user.username}


@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    user = db.query(User).filter(User.username == data.username).first()

    # Generic error to prevent username enumeration
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"sub": user.username})
    return {"token": token, "username": user.username}


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