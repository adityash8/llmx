"""Core LLMX functionality."""

import os
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional, Union

from llmx.cache import CacheManager
from llmx.exceptions import ConfigurationError, ValidationError
from llmx.providers import get_provider
from llmx.types import (
    CacheConfig,
    GenerationConfig,
    Message,
    ProviderConfig,
    Response,
    StreamChunk,
)


class LLMGenerator:
    """Main class for generating text using various LLM providers."""

    def __init__(
        self,
        provider: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        organization: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        cache_config: Optional[CacheConfig] = None,
        fallback_providers: Optional[List[str]] = None,
    ):
        """
        Initialize the LLM generator.

        Args:
            provider: The provider to use (e.g., "openai", "claude", "grok")
            model: The model to use (provider-specific default if None)
            api_key: API key (will try to get from env if None)
            api_base: Base URL for the API
            organization: Organization ID
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
            cache_config: Cache configuration
            fallback_providers: List of fallback providers
        """
        self.provider_name = provider
        self.fallback_providers = fallback_providers or []

        # Initialize provider config
        provider_config = ProviderConfig(
            api_key=api_key,
            api_base=api_base,
            organization=organization,
            timeout=timeout,
            max_retries=max_retries,
        )

        # Initialize cache
        self.cache = CacheManager(cache_config or CacheConfig())

        # Initialize provider
        self.provider = get_provider(provider, provider_config)

        # Set default model
        self.default_model = model or self.provider.default_model

    def generate(
        self,
        messages: List[Union[Message, Dict[str, str]]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        stream: bool = False,
        use_cache: bool = True,
        **kwargs: Any,
    ) -> Union[Response, Generator[StreamChunk, None, None]]:
        """
        Generate text using the configured provider.

        Args:
            messages: List of messages in the conversation
            model: Model to use (overrides default)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Top-p sampling parameter
            stream: Whether to stream the response
            use_cache: Whether to use caching
            **kwargs: Additional provider-specific arguments

        Returns:
            Response object or generator for streaming
        """
        # Normalize messages
        normalized_messages = self._normalize_messages(messages)

        # Create generation config
        config = GenerationConfig(
            model=model or self.default_model,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stream=stream,
            use_cache=use_cache,
        )

        # Check cache if enabled
        if use_cache and not stream:
            cache_key = self.cache.get_cache_key(normalized_messages, config, self.provider_name)
            cached_response = self.cache.get(cache_key)
            if cached_response:
                cached_response.cached = True
                return cached_response

        try:
            # Generate response
            if stream:
                return self._generate_stream(normalized_messages, config, **kwargs)
            else:
                response = self.provider.generate(normalized_messages, config, **kwargs)

                # Cache response if enabled
                if use_cache:
                    self.cache.set(cache_key, response)

                return response

        except Exception as e:
            # Try fallback providers
            if self.fallback_providers:
                return self._try_fallback(normalized_messages, config, **kwargs)
            raise

    async def async_generate(
        self,
        messages: List[Union[Message, Dict[str, str]]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        stream: bool = False,
        use_cache: bool = True,
        **kwargs: Any,
    ) -> Union[Response, AsyncGenerator[StreamChunk, None]]:
        """
        Async version of generate.

        Args:
            messages: List of messages in the conversation
            model: Model to use (overrides default)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Top-p sampling parameter
            stream: Whether to stream the response
            use_cache: Whether to use caching
            **kwargs: Additional provider-specific arguments

        Returns:
            Response object or async generator for streaming
        """
        # Normalize messages
        normalized_messages = self._normalize_messages(messages)

        # Create generation config
        config = GenerationConfig(
            model=model or self.default_model,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stream=stream,
            use_cache=use_cache,
        )

        # Check cache if enabled
        if use_cache and not stream:
            cache_key = self.cache.get_cache_key(normalized_messages, config, self.provider_name)
            cached_response = await self.cache.async_get(cache_key)
            if cached_response:
                cached_response.cached = True
                return cached_response

        try:
            # Generate response
            if stream:
                return self._async_generate_stream(normalized_messages, config, **kwargs)
            else:
                response = await self.provider.async_generate(normalized_messages, config, **kwargs)

                # Cache response if enabled
                if use_cache:
                    await self.cache.async_set(cache_key, response)

                return response

        except Exception as e:
            # Try fallback providers
            if self.fallback_providers:
                return await self._async_try_fallback(normalized_messages, config, **kwargs)
            raise

    def _normalize_messages(self, messages: List[Union[Message, Dict[str, str]]]) -> List[Message]:
        """Normalize messages to Message objects."""
        normalized = []
        for msg in messages:
            if isinstance(msg, dict):
                normalized.append(Message(**msg))
            elif isinstance(msg, Message):
                normalized.append(msg)
            else:
                raise ValidationError(f"Invalid message type: {type(msg)}")
        return normalized

    def _generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Generator[StreamChunk, None, None]:
        """Generate streaming response."""
        yield from self.provider.generate_stream(messages, config, **kwargs)

    async def _async_generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> AsyncGenerator[StreamChunk, None]:
        """Generate async streaming response."""
        async for chunk in self.provider.async_generate_stream(messages, config, **kwargs):
            yield chunk

    def _try_fallback(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Try fallback providers."""
        for fallback_provider in self.fallback_providers:
            try:
                fallback = get_provider(fallback_provider, self.provider.config)
                return fallback.generate(messages, config, **kwargs)
            except Exception:
                continue
        raise

    async def _async_try_fallback(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Try fallback providers asynchronously."""
        for fallback_provider in self.fallback_providers:
            try:
                fallback = get_provider(fallback_provider, self.provider.config)
                return await fallback.async_generate(messages, config, **kwargs)
            except Exception:
                continue
        raise


def llm(
    provider: str,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    organization: Optional[str] = None,
    timeout: int = 30,
    max_retries: int = 3,
    cache_config: Optional[CacheConfig] = None,
    fallback_providers: Optional[List[str]] = None,
) -> LLMGenerator:
    """
    Create an LLM generator instance.

    Args:
        provider: The provider to use (e.g., "openai", "claude", "grok")
        model: The model to use (provider-specific default if None)
        api_key: API key (will try to get from env if None)
        api_base: Base URL for the API
        organization: Organization ID
        timeout: Request timeout in seconds
        max_retries: Maximum number of retries
        cache_config: Cache configuration
        fallback_providers: List of fallback providers

    Returns:
        LLMGenerator instance

    Example:
        >>> from llmx import llm
        >>> generator = llm(provider="openai", model="gpt-4")
        >>> messages = [{"role": "user", "content": "Hello!"}]
        >>> response = generator.generate(messages)
        >>> print(response.text[0].content)
    """
    return LLMGenerator(
        provider=provider,
        model=model,
        api_key=api_key,
        api_base=api_base,
        organization=organization,
        timeout=timeout,
        max_retries=max_retries,
        cache_config=cache_config,
        fallback_providers=fallback_providers,
    )