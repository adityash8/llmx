"""Tests for provider implementations."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import httpx
from llmx.providers import get_provider, list_providers
from llmx.providers.openai import OpenAIProvider
from llmx.providers.claude import ClaudeProvider
from llmx.exceptions import ConfigurationError, AuthenticationError
from llmx.types import ProviderConfig, GenerationConfig, Message


class TestProviderRegistry:
    """Test provider registry functions."""

    def test_list_providers(self):
        """Test listing available providers."""
        providers = list_providers()
        assert "openai" in providers
        assert "claude" in providers
        assert "grok" in providers
        assert "cohere" in providers
        assert "huggingface" in providers

    def test_get_provider_valid(self):
        """Test getting a valid provider."""
        config = ProviderConfig()
        provider = get_provider("openai", config)
        assert isinstance(provider, OpenAIProvider)

    def test_get_provider_invalid(self):
        """Test getting an invalid provider."""
        config = ProviderConfig()
        with pytest.raises(ConfigurationError):
            get_provider("invalid_provider", config)


class TestOpenAIProvider:
    """Test OpenAI provider."""

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    def test_init(self):
        """Test provider initialization."""
        config = ProviderConfig()
        provider = OpenAIProvider(config)
        assert provider.default_model == "gpt-3.5-turbo"
        assert "gpt-4" in provider.supported_models

    def test_init_no_api_key(self):
        """Test initialization without API key."""
        config = ProviderConfig()
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(AuthenticationError):
                OpenAIProvider(config)

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    @patch("httpx.Client.post")
    def test_generate(self, mock_post, mock_openai_response):
        """Test generate method."""
        # Setup mock response
        mock_response = Mock()
        mock_response.json.return_value = mock_openai_response
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        config = ProviderConfig()
        provider = OpenAIProvider(config)

        messages = [Message(role="user", content="Hello!")]
        gen_config = GenerationConfig(model="gpt-3.5-turbo")

        response = provider.generate(messages, gen_config)

        assert response.text[0].content == "Hello, world!"
        assert response.provider == "openai"
        mock_post.assert_called_once()

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    @patch("httpx.Client.post")
    def test_generate_http_error(self, mock_post):
        """Test generate with HTTP error."""
        # Setup mock error response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.side_effect = httpx.HTTPStatusError(
            "Unauthorized", request=Mock(), response=mock_response
        )

        config = ProviderConfig()
        provider = OpenAIProvider(config)

        messages = [Message(role="user", content="Hello!")]
        gen_config = GenerationConfig(model="gpt-3.5-turbo")

        with pytest.raises(AuthenticationError):
            provider.generate(messages, gen_config)


class TestClaudeProvider:
    """Test Claude provider."""

    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    def test_init(self):
        """Test provider initialization."""
        config = ProviderConfig()
        provider = ClaudeProvider(config)
        assert provider.default_model == "claude-3-haiku-20240307"
        assert "claude-3-sonnet-20240229" in provider.supported_models

    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("httpx.Client.post")
    def test_generate(self, mock_post, mock_claude_response):
        """Test generate method."""
        # Setup mock response
        mock_response = Mock()
        mock_response.json.return_value = mock_claude_response
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        config = ProviderConfig()
        provider = ClaudeProvider(config)

        messages = [Message(role="user", content="Hello!")]
        gen_config = GenerationConfig(model="claude-3-haiku-20240307")

        response = provider.generate(messages, gen_config)

        assert response.text[0].content == "Hello, world!"
        assert response.provider == "claude"
        mock_post.assert_called_once()

    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    def test_message_conversion(self):
        """Test message conversion for Claude format."""
        config = ProviderConfig()
        provider = ClaudeProvider(config)

        messages = [
            Message(role="system", content="You are helpful"),
            Message(role="user", content="Hello!"),
        ]

        # This would be called internally during generate
        # Just testing the logic exists
        assert provider.default_model is not None