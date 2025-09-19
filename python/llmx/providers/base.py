"""Base provider class for LLMX."""

import os
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional

from llmx.exceptions import AuthenticationError, ConfigurationError
from llmx.types import (
    GenerationConfig,
    Message,
    ProviderConfig,
    Response,
    StreamChunk,
)


class BaseProvider(ABC):
    """Base class for all LLM providers."""

    def __init__(self, config: ProviderConfig):
        """Initialize the provider."""
        self.config = config
        self._validate_config()

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model for this provider."""
        pass

    @property
    @abstractmethod
    def supported_models(self) -> List[str]:
        """List of supported models for this provider."""
        pass

    @abstractmethod
    def _validate_config(self) -> None:
        """Validate provider-specific configuration."""
        pass

    @abstractmethod
    def generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Generate text using this provider."""
        pass

    @abstractmethod
    async def async_generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Async version of generate."""
        pass

    @abstractmethod
    def generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Generator[StreamChunk, None, None]:
        """Generate streaming response."""
        pass

    @abstractmethod
    async def async_generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> AsyncGenerator[StreamChunk, None]:
        """Async version of generate_stream."""
        pass

    def _get_api_key(self, env_var: str) -> str:
        """Get API key from config or environment."""
        api_key = self.config.api_key or os.getenv(env_var)
        if not api_key:
            raise AuthenticationError(
                f"API key not found. Set {env_var} environment variable or pass api_key parameter.",
                provider=self.__class__.__name__,
            )
        return api_key

    def _validate_model(self, model: str) -> None:
        """Validate that the model is supported."""
        if model not in self.supported_models:
            supported = ", ".join(self.supported_models)
            raise ConfigurationError(
                f"Model '{model}' not supported by {self.__class__.__name__}. "
                f"Supported models: {supported}"
            )

    def _prepare_messages(self, messages: List[Message]) -> List[Dict[str, str]]:
        """Convert Message objects to dict format."""
        return [{"role": msg.role, "content": msg.content} for msg in messages]