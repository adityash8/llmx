"""HuggingFace provider for LLMX."""

import json
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from llmx.exceptions import AuthenticationError, ProviderError, RateLimitError, ConfigurationError
from llmx.providers.base import BaseProvider
from llmx.types import (
    Choice,
    GenerationConfig,
    Message,
    Response,
    StreamChunk,
    Usage,
)


class HuggingFaceProvider(BaseProvider):
    """HuggingFace provider implementation."""

    def __init__(self, config):
        super().__init__(config)
        # Default to HF Inference API, but allow custom endpoints
        self.base_url = config.api_base or "https://api-inference.huggingface.co/models"
        self.client = httpx.Client(
            timeout=config.timeout,
            headers=self._get_headers(),
        )
        self.async_client = httpx.AsyncClient(
            timeout=config.timeout,
            headers=self._get_headers(),
        )

    @property
    def default_model(self) -> str:
        return "microsoft/DialoGPT-medium"

    @property
    def supported_models(self) -> List[str]:
        return [
            "microsoft/DialoGPT-medium",
            "microsoft/DialoGPT-large",
            "facebook/blenderbot-400M-distill",
            "facebook/blenderbot-1B-distill",
            "mistralai/Mistral-7B-Instruct-v0.1",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "meta-llama/Llama-2-7b-chat-hf",
            "meta-llama/Llama-2-13b-chat-hf",
            "codellama/CodeLlama-7b-Instruct-hf",
        ]

    def _validate_config(self) -> None:
        """Validate HuggingFace configuration."""
        # HF token is optional for public models
        pass

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        headers = {"Content-Type": "application/json"}

        # Try to get HF token
        try:
            token = self._get_api_key("HUGGINGFACE_API_TOKEN")
            headers["Authorization"] = f"Bearer {token}"
        except AuthenticationError:
            # Token is optional for public models
            pass

        return headers

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
    )
    def generate(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Response:
        """Generate text using HuggingFace API."""
        model = config.model or self.default_model

        # Convert messages to HF format
        input_text = self._convert_messages_to_hf(messages)

        payload = {
            "inputs": input_text,
            "parameters": {},
        }

        if config.max_tokens:
            payload["parameters"]["max_new_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["parameters"]["temperature"] = config.temperature
        if config.top_p is not None:
            payload["parameters"]["top_p"] = config.top_p

        payload["parameters"].update(kwargs)

        try:
            url = f"{self.base_url}/{model}" if not self.base_url.endswith(model) else self.base_url
            response = self.client.post(url, json=payload)
            response.raise_for_status()
            return self._parse_response(response.json(), model, input_text)
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

        # Convert messages to HF format
        input_text = self._convert_messages_to_hf(messages)

        payload = {
            "inputs": input_text,
            "parameters": {},
        }

        if config.max_tokens:
            payload["parameters"]["max_new_tokens"] = config.max_tokens
        if config.temperature is not None:
            payload["parameters"]["temperature"] = config.temperature
        if config.top_p is not None:
            payload["parameters"]["top_p"] = config.top_p

        payload["parameters"].update(kwargs)

        try:
            url = f"{self.base_url}/{model}" if not self.base_url.endswith(model) else self.base_url
            response = await self.async_client.post(url, json=payload)
            response.raise_for_status()
            return self._parse_response(response.json(), model, input_text)
        except httpx.HTTPStatusError as e:
            self._handle_http_error(e)

    def generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> Generator[StreamChunk, None, None]:
        """Generate streaming response."""
        # HuggingFace Inference API doesn't support streaming by default
        # We'll simulate streaming by yielding the full response
        response = self.generate(messages, config, **kwargs)

        # Simulate streaming by yielding chunks
        content = response.text[0].content
        chunk_size = 10  # Characters per chunk

        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            is_last = i + chunk_size >= len(content)

            yield StreamChunk(
                content=chunk,
                finish_reason="stop" if is_last else None,
                done=is_last,
            )

    async def async_generate_stream(
        self, messages: List[Message], config: GenerationConfig, **kwargs: Any
    ) -> AsyncGenerator[StreamChunk, None]:
        """Async version of generate_stream."""
        # HuggingFace Inference API doesn't support streaming by default
        # We'll simulate streaming by yielding the full response
        response = await self.async_generate(messages, config, **kwargs)

        # Simulate streaming by yielding chunks
        content = response.text[0].content
        chunk_size = 10  # Characters per chunk

        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            is_last = i + chunk_size >= len(content)

            yield StreamChunk(
                content=chunk,
                finish_reason="stop" if is_last else None,
                done=is_last,
            )

    def _convert_messages_to_hf(self, messages: List[Message]) -> str:
        """Convert messages to HuggingFace format."""
        # Most HF models expect a simple text input
        # We'll format it as a conversation
        parts = []
        for msg in messages:
            if msg.role == "system":
                parts.append(f"System: {msg.content}")
            elif msg.role == "user":
                parts.append(f"Human: {msg.content}")
            elif msg.role == "assistant":
                parts.append(f"Assistant: {msg.content}")

        # Add a prompt for the assistant to respond
        if not parts or not parts[-1].startswith("Assistant:"):
            parts.append("Assistant:")

        return "\n".join(parts)

    def _parse_response(self, data: Any, model: str, input_text: str) -> Response:
        """Parse HuggingFace response."""
        if isinstance(data, list) and len(data) > 0:
            # Most common format: list with generated text
            result = data[0]
            if isinstance(result, dict) and "generated_text" in result:
                generated_text = result["generated_text"]
                # Remove the input text to get only the generated part
                if generated_text.startswith(input_text):
                    content = generated_text[len(input_text):].strip()
                else:
                    content = generated_text
            else:
                content = str(result)
        elif isinstance(data, dict):
            # Alternative format
            content = data.get("generated_text", str(data))
        else:
            content = str(data)

        choices = [Choice(content=content, finish_reason="stop")]

        # HuggingFace doesn't provide detailed usage stats
        usage = Usage(
            prompt_tokens=len(input_text.split()),  # Rough estimate
            completion_tokens=len(content.split()),  # Rough estimate
            total_tokens=len(input_text.split()) + len(content.split()),
        )

        return Response(
            text=choices,
            usage=usage,
            provider="huggingface",
            model=model,
        )

    def _handle_http_error(self, error: httpx.HTTPStatusError) -> None:
        """Handle HTTP errors from HuggingFace API."""
        status_code = error.response.status_code

        if status_code == 401:
            raise AuthenticationError("Invalid HuggingFace token", provider="huggingface")
        elif status_code == 429:
            raise RateLimitError("Rate limit exceeded", provider="huggingface")
        elif status_code == 503:
            raise ProviderError("Model is currently loading, please try again later",
                              provider="huggingface", status_code=status_code)
        else:
            try:
                error_data = error.response.json()
                error_message = error_data.get("error", str(error))
            except:
                error_message = str(error)

            raise ProviderError(error_message, provider="huggingface", status_code=status_code)