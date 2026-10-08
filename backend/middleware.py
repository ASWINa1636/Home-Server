"""
Security middleware for HomeServer.
Adds security headers to every response to harden against common web attacks.
Supports hybrid access via Tailscale (private) and Cloudflare Tunnel (public).
"""

import os
from starlette.datastructures import MutableHeaders

# Build dynamic CSP connect-src from ALLOWED_ORIGINS
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
_allowed_origins = [o.strip() for o in _allowed_origins if o.strip()]
_connect_src = "'self' https://*.trycloudflare.com" + (" " + " ".join(_allowed_origins) if _allowed_origins else "")


class SecurityHeadersMiddleware:
    """
    Adds defensive HTTP headers to all responses:
    - X-Content-Type-Options: prevents MIME-sniffing
    - X-Frame-Options: prevents clickjacking
    - Referrer-Policy: limits referrer leakage
    - X-XSS-Protection: legacy XSS filter hint
    - Content-Security-Policy: restricts resource loading (dynamic connect-src)
    - Permissions-Policy: disables unused browser features
    - Strict-Transport-Security: enforces HTTPS when accessed via tunnel
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.append("X-Content-Type-Options", "nosniff")
                headers.append("X-Frame-Options", "DENY")
                headers.append("Referrer-Policy", "strict-origin-when-cross-origin")
                headers.append("X-XSS-Protection", "1; mode=block")
                headers.append("Content-Security-Policy", f"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src {_connect_src}; object-src 'none'; base-uri 'self'; form-action 'self';")
                headers.append("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")

                # Add HSTS when served over HTTPS (Cloudflare Tunnel / reverse proxy)
                # Check for X-Forwarded-Proto or CF-Visitor header
                request_headers = dict(scope.get("headers", []))
                is_https = (
                    request_headers.get(b"x-forwarded-proto", b"").decode() == "https"
                    or b"cf-connecting-ip" in request_headers
                )
                if is_https:
                    headers.append("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
            await send(message)

        await self.app(scope, receive, send_wrapper)


class RangeRequestMiddleware:
    """Adds Accept-Ranges header to signal range-request support for streaming."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.append("Accept-Ranges", "bytes")
            await send(message)

        await self.app(scope, receive, send_wrapper)

