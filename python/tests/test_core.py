"""Tests for core functionality."""

import pytest
from unittest.mock import Mock, patch
from llmx import llm
from llmx.core import LLMGenerator
from llmx.exceptions import ValidationError
from llmx.types import Message, GenerationConfig


class TestLLMGenerator:
    """Test LLMGenerator class."""

    def test_init(self):
        """Test generator initialization."""
        generator = llm(provider="openai", model="gpt-3.5-turbo")
        assert generator.provider_name == "openai"
        assert generator.default_model == "gpt-3.5-turbo"

    def test_normalize_messages_dict(self):
        """Test message normalization from dict."""
        generator = llm(provider="openai")
        messages = [{"role": "user", "content": "Hello!"}]
        normalized = generator._normalize_messages(messages)
        assert len(normalized) == 1
        assert isinstance(normalized[0], Message)
        assert normalized[0].role == "user"
        assert normalized[0].content == "Hello!"

    def test_normalize_messages_message_objects(self):
        """Test message normalization from Message objects."""
        generator = llm(provider="openai")
        messages = [Message(role="user", content="Hello!")]
        normalized = generator._normalize_messages(messages)
        assert len(normalized) == 1
        assert isinstance(normalized[0], Message)

    def test_normalize_messages_invalid(self):
        """Test message normalization with invalid input."""
        generator = llm(provider="openai")
        with pytest.raises(ValidationError):
            generator._normalize_messages(["invalid"])

    @patch("llmx.providers.openai.OpenAIProvider.generate")
    def test_generate(self, mock_generate, mock_response):
        """Test generate method."""
        mock_generate.return_value = mock_response

        generator = llm(provider="openai")
        messages = [{"role": "user", "content": "Hello!"}]
        response = generator.generate(messages)

        assert response.text[0].content == "Hello, world!"
        mock_generate.assert_called_once()

    @patch("llmx.providers.openai.OpenAIProvider.async_generate")
    @pytest.mark.asyncio
    async def test_async_generate(self, mock_generate, mock_response):
        """Test async generate method."""
        mock_generate.return_value = mock_response

        generator = llm(provider="openai")
        messages = [{"role": "user", "content": "Hello!"}]
        response = await generator.async_generate(messages)

        assert response.text[0].content == "Hello, world!"
        mock_generate.assert_called_once()


class TestLLMFunction:
    """Test llm function."""

    def test_llm_function(self):
        """Test llm function creates LLMGenerator."""
        generator = llm(provider="openai")
        assert isinstance(generator, LLMGenerator)
        assert generator.provider_name == "openai"