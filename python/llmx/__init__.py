"""
LLMX - A unified API for interacting with large language models across multiple providers.

Example usage:
    from llmx import llm

    # Initialize with OpenAI
    generator = llm(provider="openai", model="gpt-4")

    # Generate text
    messages = [{"role": "user", "content": "Hello, world!"}]
    response = generator.generate(messages)
    print(response.text[0].content)
"""

from llmx.core import llm
from llmx.exceptions import (
    LLMXError,
    ProviderError,
    RateLimitError,
    AuthenticationError,
    ValidationError,
)
from llmx.types import Message, Response, Choice

__version__ = "2.0.0"
__all__ = [
    "llm",
    "LLMXError",
    "ProviderError",
    "RateLimitError",
    "AuthenticationError",
    "ValidationError",
    "Message",
    "Response",
    "Choice",
]