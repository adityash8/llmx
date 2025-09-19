"""Provider implementations for LLMX."""

from llmx.providers.base import BaseProvider
from llmx.providers.openai import OpenAIProvider
from llmx.providers.claude import ClaudeProvider
from llmx.providers.grok import GrokProvider
from llmx.providers.cohere import CohereProvider
from llmx.providers.huggingface import HuggingFaceProvider
from llmx.exceptions import ConfigurationError
from llmx.types import ProviderConfig


_PROVIDERS = {
    "openai": OpenAIProvider,
    "azure": OpenAIProvider,  # Azure uses OpenAI-compatible API
    "claude": ClaudeProvider,
    "anthropic": ClaudeProvider,  # Alias for Claude
    "grok": GrokProvider,
    "xai": GrokProvider,  # Alias for Grok
    "cohere": CohereProvider,
    "huggingface": HuggingFaceProvider,
    "hf": HuggingFaceProvider,  # Alias for HuggingFace
}


def get_provider(provider_name: str, config: ProviderConfig) -> BaseProvider:
    """
    Get a provider instance by name.

    Args:
        provider_name: Name of the provider
        config: Provider configuration

    Returns:
        Provider instance

    Raises:
        ConfigurationError: If provider is not supported
    """
    provider_name = provider_name.lower()

    if provider_name not in _PROVIDERS:
        available = ", ".join(_PROVIDERS.keys())
        raise ConfigurationError(
            f"Provider '{provider_name}' not supported. Available providers: {available}"
        )

    provider_class = _PROVIDERS[provider_name]
    return provider_class(config)


def list_providers() -> list[str]:
    """List all available providers."""
    return list(_PROVIDERS.keys())


__all__ = [
    "BaseProvider",
    "OpenAIProvider",
    "ClaudeProvider",
    "GrokProvider",
    "CohereProvider",
    "HuggingFaceProvider",
    "get_provider",
    "list_providers",
]