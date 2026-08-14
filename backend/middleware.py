"""
Security middleware for HomeServer.
Adds security headers to every response to harden against common web attacks.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds defensive HTTP headers to all responses:
    - X-Content-Type-Options: prevents MIME-sniffing
    - X-Frame-Options: prevents clickjacking
    - Referrer-Policy: limits referrer leakage
    - X-XSS-Protection: legacy XSS filter hint
    - Content-Security-Policy: restricts resource loading
    - Permissions-Policy: disables unused browser features
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent embedding in iframes (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"

        # Control referrer information sent with requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Legacy XSS filter (still respected by some browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy — restrictive but allows the app to function
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob:; "
            "media-src 'self' blob:; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response


class RangeRequestMiddleware(BaseHTTPMiddleware):
    """Adds Accept-Ranges header to signal range-request support for streaming."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["Accept-Ranges"] = "bytes"
        return response
