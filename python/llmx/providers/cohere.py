"""Cohere provider for LLMX."""

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


class CohereProvider(BaseProvider):
    """Cohere provider implementation."""

    def __init__(self, config):
        super().__init__(config)
        self.base_url = config.api_base or "https://api.cohere.ai/v1"
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
        return "command"

    @property
    def supported_models(self) -> List[str]:
        return [
            "command",
            "command-light",
            "command-nightly",
            "command-r",
            "command-r-plus",
        ]

    def _validate_config(self) -> None:
        """Validate Cohere configuration."""
        self._get_api_key("COHERE_API_KEY")

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        return {
            "Authorization": f"Bearer {self._get_api_key('COHERE_API_KEY')}",
            "Content-Type": "application/json",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
    )
    def generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Generate text using Cohere API."""
        model = config.model or self.default_model
        self._validate_model(model)

        # Convert messages to Cohere format
        message = self._convert_messages_to_cohere(messages)

        payload = {
            "model": model,
            "message": message,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["p"] = config.top_p

        payload.update(kwargs)

        try:
            response = self.client.post("/chat", json=payload)
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

        # Convert messages to Cohere format
        message = self._convert_messages_to_cohere(messages)

        payload = {
            "model": model,
            "message": message,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["p"] = config.top_p

        payload.update(kwargs)

        try:
            response = await self.async_client.post("/chat", json=payload)
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

        # Convert messages to Cohere format
        message = self._convert_messages_to_cohere(messages)

        payload = {
            "model": model,
            "message": message,
            "stream": True,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["p"] = config.top_p

        payload.update(kwargs)

        try:
            with self.client.stream("POST", "/chat", json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk_data = json.loads(line)
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

        # Convert messages to Cohere format
        message = self._convert_messages_to_cohere(messages)

        payload = {
            "model": model,
            "message": message,
            "stream": True,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["p"] = config.top_p

        payload.update(kwargs)

        try:
            async with self.async_client.stream("POST", "/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk_data = json.loads(line)
                            chunk = self._parse_stream_chunk(chunk_data)
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    def _convert_messages_to_cohere(self, messages: List[Message]) -> str:
        """Convert messages to Cohere format."""
        # Cohere expects a simple string message
        # For now, we'll concatenate all messages
        parts = []
        for msg in messages:
            if msg.role == "system":
                parts.append(f"System: {msg.content}")
            elif msg.role == "user":
                parts.append(f"User: {msg.content}")
            elif msg.role == "assistant":
                parts.append(f"Assistant: {msg.content}")

        return "\n".join(parts)

    def _parse_response(self, data: Dict[str, Any], model: str) -> Response:
        """Parse Cohere response."""
        text = data.get("text", "")
        choices = [Choice(content=text, finish_reason=data.get("finish_reason"))]

        # Cohere doesn't provide detailed usage stats in all responses
        usage = Usage(
            prompt_tokens=0,  # Not provided by Cohere
            completion_tokens=0,  # Not provided by Cohere
            total_tokens=0,  # Not provided by Cohere
        )

        return Response(
            text=choices,
            usage=usage,
            provider="cohere",
            model=model,
        )

    def _parse_stream_chunk(self, data: Dict[str, Any]) -> Optional[StreamChunk]:
        """Parse streaming chunk."""
        if "text" in data:
            return StreamChunk(
                content=data.get("text", ""),
                finish_reason=data.get("finish_reason"),
                done=data.get("is_finished", False),
            )

        return None

    def _handle_http_error(self, error: httpx.HTTPStatusError) -> None:
        """Handle HTTP errors from Cohere API."""
        status_code = error.response.status_code

        if status_code == 401:
            raise AuthenticationError("Invalid API key", provider="cohere")
        elif status_code == 429:
            raise RateLimitError("Rate limit exceeded", provider="cohere")
        else:
            try:
                error_data = error.response.json()
                error_message = error_data.get("message", str(error))
            except:
                error_message = str(error)

            raise ProviderError(error_message, provider="cohere", status_code=status_code)