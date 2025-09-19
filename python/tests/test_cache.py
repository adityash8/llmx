"""Tests for caching functionality."""

import pytest
from unittest.mock import Mock, patch
from llmx.cache import CacheManager
from llmx.types import CacheConfig, GenerationConfig, Message, Response, Choice, Usage


class TestCacheManager:
    """Test cache manager."""

    def test_init_memory_only(self):
        """Test cache manager initialization with memory only."""
        config = CacheConfig(enabled=True, redis_url=None)
        cache = CacheManager(config)
        assert cache.config.enabled
        assert cache._redis_client is None

    def test_init_disabled(self):
        """Test cache manager initialization when disabled."""
        config = CacheConfig(enabled=False)
        cache = CacheManager(config)
        assert not cache.config.enabled

    def test_get_cache_key(self):
        """Test cache key generation."""
        config = CacheConfig()
        cache = CacheManager(config)

        messages = [Message(role="user", content="Hello!")]
        gen_config = GenerationConfig(model="gpt-3.5-turbo", temperature=0.7)

        key1 = cache.get_cache_key(messages, gen_config, "openai")
        key2 = cache.get_cache_key(messages, gen_config, "openai")

        # Same inputs should generate same key
        assert key1 == key2
        assert key1.startswith("llmx:")

    def test_get_cache_key_different_inputs(self):
        """Test cache key generation with different inputs."""
        config = CacheConfig()
        cache = CacheManager(config)

        messages1 = [Message(role="user", content="Hello!")]
        messages2 = [Message(role="user", content="Hi!")]
        gen_config = GenerationConfig(model="gpt-3.5-turbo")

        key1 = cache.get_cache_key(messages1, gen_config, "openai")
        key2 = cache.get_cache_key(messages2, gen_config, "openai")

        # Different inputs should generate different keys
        assert key1 != key2

    def test_memory_cache_set_get(self):
        """Test memory cache set and get."""
        config = CacheConfig(enabled=True)
        cache = CacheManager(config)

        response = Response(
            text=[Choice(content="Hello!", finish_reason="stop")],
            usage=Usage(prompt_tokens=5, completion_tokens=3, total_tokens=8),
            provider="test",
            model="test-model",
        )

        # Set and get from cache
        cache.set("test-key", response)
        cached_response = cache.get("test-key")

        assert cached_response is not None
        assert cached_response.text[0].content == "Hello!"

    def test_cache_disabled(self):
        """Test cache operations when disabled."""
        config = CacheConfig(enabled=False)
        cache = CacheManager(config)

        response = Response(
            text=[Choice(content="Hello!", finish_reason="stop")],
            usage=Usage(prompt_tokens=5, completion_tokens=3, total_tokens=8),
            provider="test",
            model="test-model",
        )

        # Operations should be no-ops
        cache.set("test-key", response)
        cached_response = cache.get("test-key")

        assert cached_response is None

    def test_cache_miss(self):
        """Test cache miss."""
        config = CacheConfig(enabled=True)
        cache = CacheManager(config)

        cached_response = cache.get("nonexistent-key")
        assert cached_response is None

    @patch("redis.from_url")
    def test_redis_cache(self, mock_redis):
        """Test Redis cache initialization."""
        mock_client = Mock()
        mock_client.ping.return_value = True
        mock_redis.return_value = mock_client

        config = CacheConfig(enabled=True, redis_url="redis://localhost:6379")
        cache = CacheManager(config)

        assert cache._redis_client is not None
        mock_redis.assert_called_once_with("redis://localhost:6379")

    def test_clear_cache(self):
        """Test cache clearing."""
        config = CacheConfig(enabled=True)
        cache = CacheManager(config)

        response = Response(
            text=[Choice(content="Hello!", finish_reason="stop")],
            usage=Usage(prompt_tokens=5, completion_tokens=3, total_tokens=8),
            provider="test",
            model="test-model",
        )

        # Set, verify, clear, verify empty
        cache.set("test-key", response)
        assert cache.get("test-key") is not None

        cache.clear()
        assert cache.get("test-key") is None