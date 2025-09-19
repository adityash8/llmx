"""Exception classes for LLMX."""


class LLMXError(Exception):
    """Base exception for all LLMX errors."""

    def __init__(self, message: str, provider: str = None):
        super().__init__(message)
        self.provider = provider


class ProviderError(LLMXError):
    """Base exception for provider-specific errors."""

    def __init__(self, message: str, provider: str, status_code: int = None):
        super().__init__(message, provider)
        self.status_code = status_code


class AuthenticationError(ProviderError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed", provider: str = None):
        super().__init__(message, provider, 401)


class RateLimitError(ProviderError):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        provider: str = None,
        retry_after: int = None,
    ):
        super().__init__(message, provider, 429)
        self.retry_after = retry_after


class ValidationError(LLMXError):
    """Raised when input validation fails."""

    pass


class ConfigurationError(LLMXError):
    """Raised when configuration is invalid."""

    pass


class CacheError(LLMXError):
    """Raised when cache operations fail."""

    pass


class StreamingError(LLMXError):
    """Raised when streaming operations fail."""

    pass