"""Anthropic Claude provider for LLMX."""

import json
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from llmx.exceptions import AuthenticationError, ProviderError, RateLimitError
from llmx.providers.base import BaseProvider
from llmx.types import (
    Choice,
    GenerationConfig,
    Message,
    Response,
    StreamChunk,
    Usage,
)


class ClaudeProvider(BaseProvider):
    """Anthropic Claude provider implementation."""

    def __init__(self, config):
        super().__init__(config)
        self.base_url = config.api_base or "https://api.anthropic.com/v1"
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=config.timeout,
            headers=self._get_headers(),
        )
        self.async_client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=config.timeout,
            headers=self._get_headers(),
        )

    @property
    def default_model(self) -> str:
        return "claude-3-haiku-20240307"

    @property
    def supported_models(self) -> List[str]:
        return [
            "claude-3-haiku-20240307",
            "claude-3-sonnet-20240229",
            "claude-3-opus-20240229",
            "claude-3-5-sonnet-20241022",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2",
        ]

    def _validate_config(self) -> None:
        """Validate Claude configuration."""
        self._get_api_key("ANTHROPIC_API_KEY")

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        return {
            "x-api-key": self._get_api_key("ANTHROPIC_API_KEY"),
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
    )
    def generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Generate text using Claude API."""
        model = config.model or self.default_model
        self._validate_model(model)

        # Convert messages for Claude format
        system_message = None
        claude_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": model,
            "messages": claude_messages,
            "max_tokens": config.max_tokens or 1024,
        }

        if system_message:
            payload["system"] = system_message
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            response = self.client.post("/messages", json=payload)
            response.raise_for_status()
            return self._parse_response(response.json(), model)
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
    )
    async def async_generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Async version of generate."""
        model = config.model or self.default_model
        self._validate_model(model)

        # Convert messages for Claude format
        system_message = None
        claude_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": model,
            "messages": claude_messages,
            "max_tokens": config.max_tokens or 1024,
        }

        if system_message:
            payload["system"] = system_message
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            response = await self.async_client.post("/messages", json=payload)
            response.raise_for_status()
            return self._parse_response(response.json(), model)
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    def generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Generator[StreamChunk, None, None]:
        """Generate streaming response."""
        model = config.model or self.default_model
        self._validate_model(model)

        # Convert messages for Claude format
        system_message = None
        claude_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": model,
            "messages": claude_messages,
            "max_tokens": config.max_tokens or 1024,
            "stream": True,
        }

        if system_message:
            payload["system"] = system_message
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            with self.client.stream("POST", "/messages", json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        try:
                            chunk_data = json.loads(data)
                            chunk = self._parse_stream_chunk(chunk_data)
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    async def async_generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> AsyncGenerator[StreamChunk, None]:
        """Async version of generate_stream."""
        model = config.model or self.default_model
        self._validate_model(model)

        # Convert messages for Claude format
        system_message = None
        claude_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                claude_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": model,
            "messages": claude_messages,
            "max_tokens": config.max_tokens or 1024,
            "stream": True,
        }

        if system_message:
            payload["system"] = system_message
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            async with self.async_client.stream("POST", "/messages", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        try:
                            chunk_data = json.loads(data)
                            chunk = self._parse_stream_chunk(chunk_data)
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    def _parse_response(self, data: Dict[str, Any], model: str) -> Response:
        """Parse Claude response."""
        content = ""
        for content_block in data.get("content", []):
            if content_block.get("type") == "text":
                content += content_block.get("text", "")

        choices = [Choice(content=content, finish_reason=data.get("stop_reason"))]

        usage_data = data.get("usage", {})
        usage = Usage(
            prompt_tokens=usage_data.get("input_tokens", 0),
            completion_tokens=usage_data.get("output_tokens", 0),
            total_tokens=usage_data.get("input_tokens", 0) + usage_data.get("output_tokens", 0),
        )

        return Response(
            text=choices,
            usage=usage,
            provider="claude",
            model=model,
        )

    def _parse_stream_chunk(self, data: Dict[str, Any]) -> Optional[StreamChunk]:
        """Parse streaming chunk."""
        if data.get("type") == "content_block_delta":
            delta = data.get("delta", {})
            if delta.get("type") == "text_delta":
                return StreamChunk(
                    content=delta.get("text", ""),
                    finish_reason=None,
                    done=False,
                )
        elif data.get("type") == "message_stop":
            return StreamChunk(
                content="",
                finish_reason="stop",
                done=True,
            )

        return None

    def _handle_http_error(self, error: httpx.HTTPStatusError) -> None:
        """Handle HTTP errors from Claude API."""
        status_code = error.response.status_code

        if status_code == 401:
            raise AuthenticationError("Invalid API key", provider="claude")
        elif status_code == 429:
            raise RateLimitError("Rate limit exceeded", provider="claude")
        else:
            try:
                error_data = error.response.json()
                error_message = error_data.get("error", {}).get("message", str(error))
            except:
                error_message = str(error)

            raise ProviderError(error_message, provider="claude", status_code=status_code)