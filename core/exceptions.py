"""
AUTUS Custom Exceptions

Centralized exception definitions
"""


class AUTUSError(Exception):
    """Base exception for all AUTUS errors"""
    pass


class ConfigurationError(AUTUSError):
    """Configuration-related errors"""
    pass


class PackError(AUTUSError):
    """Pack-related errors"""
    pass


class PackNotFoundError(PackError):
    """Pack not found"""
    pass


class PackValidationError(PackError):
    """Pack validation failed"""
    pass


class ProtocolError(AUTUSError):
    """Protocol-related errors"""
    pass


class MemoryError(ProtocolError):
    """Memory OS errors"""
    pass


class WorkflowError(ProtocolError):
    """Workflow Graph errors"""
    pass


class IdentityError(ProtocolError):
    """Identity protocol errors"""
    pass


class AuthError(ProtocolError):
    """Auth protocol errors"""
    pass


class LLMError(AUTUSError):
    """LLM API errors"""
    pass


class LLMProviderError(LLMError):
    """LLM provider not available"""
    pass


class LLMRateLimitError(LLMError):
    """LLM rate limit exceeded"""
    pass


class LLMTimeoutError(LLMError):
    """LLM request timeout"""
    pass
