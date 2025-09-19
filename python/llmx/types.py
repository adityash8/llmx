"""Type definitions for LLMX."""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class Message(BaseModel):
    """A chat message with role and content."""

    role: Literal["system", "user", "assistant"] = Field(
        description="The role of the message sender"
    )
    content: str = Field(description="The content of the message")


class Choice(BaseModel):
    """A single choice in the response."""

    content: str = Field(description="The generated text content")
    finish_reason: Optional[str] = Field(
        default=None, description="The reason the generation finished"
    )


class Usage(BaseModel):
    """Token usage information."""

    prompt_tokens: int = Field(description="Number of tokens in the prompt")
    completion_tokens: int = Field(description="Number of tokens in the completion")
    total_tokens: int = Field(description="Total number of tokens used")


class Response(BaseModel):
    """Response from the LLM provider."""

    text: List[Choice] = Field(description="List of generated choices")
    usage: Optional[Usage] = Field(default=None, description="Token usage information")
    provider: str = Field(description="The provider that generated this response")
    model: str = Field(description="The model that generated this response")
    cached: bool = Field(default=False, description="Whether this response was cached")


class StreamChunk(BaseModel):
    """A chunk of streamed response."""

    content: str = Field(description="The content chunk")
    finish_reason: Optional[str] = Field(
        default=None, description="The reason the generation finished"
    )
    done: bool = Field(default=False, description="Whether this is the final chunk")


class ProviderConfig(BaseModel):
    """Configuration for a provider."""

    api_key: Optional[str] = Field(default=None, description="API key for the provider")
    api_base: Optional[str] = Field(default=None, description="Base URL for the API")
    organization: Optional[str] = Field(default=None, description="Organization ID")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum number of retries")


class GenerationConfig(BaseModel):
    """Configuration for text generation."""

    model: Optional[str] = Field(default=None, description="Model to use")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(default=None, description="Sampling temperature")
    top_p: Optional[float] = Field(default=None, description="Top-p sampling parameter")
    stream: bool = Field(default=False, description="Whether to stream the response")
    use_cache: bool = Field(default=True, description="Whether to use caching")


class CacheConfig(BaseModel):
    """Configuration for caching."""

    enabled: bool = Field(default=True, description="Whether caching is enabled")
    redis_url: Optional[str] = Field(default=None, description="Redis URL for distributed caching")
    ttl: int = Field(default=3600, description="TTL for cached entries in seconds")
    key_prefix: str = Field(default="llmx:", description="Prefix for cache keys")