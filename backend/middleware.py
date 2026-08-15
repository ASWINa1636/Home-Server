"""
Security middleware for HomeServer.
Adds security headers to every response to harden against common web attacks.
"""

from starlette.datastructures import MutableHeaders

class SecurityHeadersMiddleware:
    """
    Adds defensive HTTP headers to all responses:
    - X-Content-Type-Options: prevents MIME-sniffing
    - X-Frame-Options: prevents clickjacking
    - Referrer-Policy: limits referrer leakage
    - X-XSS-Protection: legacy XSS filter hint
    - Content-Security-Policy: restricts resource loading
    - Permissions-Policy: disables unused browser features
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
                headers.append("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';")
                headers.append("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
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
