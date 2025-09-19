"""OpenAI provider for LLMX."""

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


class OpenAIProvider(BaseProvider):
    """OpenAI provider implementation."""

    def __init__(self, config):
        super().__init__(config)
        self.base_url = config.api_base or "https://api.openai.com/v1"
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
        return "gpt-3.5-turbo"

    @property
    def supported_models(self) -> List[str]:
        return [
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
            "gpt-4",
            "gpt-4-32k",
            "gpt-4-turbo",
            "gpt-4o",
            "gpt-4o-mini",
        ]

    def _validate_config(self) -> None:
        """Validate OpenAI configuration."""
        self._get_api_key("OPENAI_API_KEY")

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        headers = {
            "Authorization": f"Bearer {self._get_api_key('OPENAI_API_KEY')}",
            "Content-Type": "application/json",
        }
        if self.config.organization:
            headers["OpenAI-Organization"] = self.config.organization
        return headers

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
    )
    def generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Generate text using OpenAI API."""
        model = config.model or self.default_model
        self._validate_model(model)

        payload = {
            "model": model,
            "messages": self._prepare_messages(messages),
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            response = self.client.post("/chat/completions", json=payload)
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

        payload = {
            "model": model,
            "messages": self._prepare_messages(messages),
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            response = await self.async_client.post("/chat/completions", json=payload)
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

        payload = {
            "model": model,
            "messages": self._prepare_messages(messages),
            "stream": True,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            with self.client.stream("POST", "/chat/completions", json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
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

        payload = {
            "model": model,
            "messages": self._prepare_messages(messages),
            "stream": True,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["temperature"] = config.temperature
        if config.top_p is not None:
            payload["top_p"] = config.top_p

        payload.update(kwargs)

        try:
            async with self.async_client.stream("POST", "/chat/completions", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
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
        """Parse OpenAI response."""
        choices = []
        for choice in data.get("choices", []):
            content = choice.get("message", {}).get("content", "")
            finish_reason = choice.get("finish_reason")
            choices.append(Choice(content=content, finish_reason=finish_reason))

        usage_data = data.get("usage", {})
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )

        return Response(
            text=choices,
            usage=usage,
            provider="openai",
            model=model,
        )

    def _parse_stream_chunk(self, data: Dict[str, Any]) -> Optional[StreamChunk]:
        """Parse streaming chunk."""
        choices = data.get("choices", [])
        if not choices:
            return None

        choice = choices[0]
        delta = choice.get("delta", {})
        content = delta.get("content", "")
        finish_reason = choice.get("finish_reason")

        return StreamChunk(
            content=content,
            finish_reason=finish_reason,
            done=finish_reason is not None,
        )

    def _handle_http_error(self, error: httpx.HTTPStatusError) -> None:
        """Handle HTTP errors from OpenAI API."""
        status_code = error.response.status_code

        if status_code == 401:
            raise AuthenticationError("Invalid API key", provider="openai")
        elif status_code == 429:
            raise RateLimitError("Rate limit exceeded", provider="openai")
        else:
            try:
                error_data = error.response.json()
                error_message = error_data.get("error", {}).get("message", str(error))
            except:
                error_message = str(error)

            raise ProviderError(error_message, provider="openai", status_code=status_code)