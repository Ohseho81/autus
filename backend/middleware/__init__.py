"""
═══════════════════════════════════════════════════════════════════════════════
🛡️ AUTUS Middleware Package
═══════════════════════════════════════════════════════════════════════════════
"""

from .error_handler import (
    # Exceptions
    AutusException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    # Functions
    setup_error_handlers,
    create_error_response,
    request_id_middleware,
)

__all__ = [
    "AutusException",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ServiceUnavailableError",
    "setup_error_handlers",
    "create_error_response",
    "request_id_middleware",
]
