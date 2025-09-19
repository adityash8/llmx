"""Caching functionality for LLMX."""

import hashlib
import json
import pickle
from typing import Any, Dict, List, Optional

from llmx.exceptions import CacheError
from llmx.types import CacheConfig, GenerationConfig, Message, Response


class CacheManager:
    """Manages caching for LLM responses."""

    def __init__(self, config: CacheConfig):
        """Initialize cache manager."""
        self.config = config
        self._memory_cache: Dict[str, Any] = {}
        self._redis_client = None

        if config.redis_url and config.enabled:
            self._init_redis()

    def _init_redis(self):
        """Initialize Redis client."""
        try:
            import redis
            self._redis_client = redis.from_url(self.config.redis_url)
            # Test connection
            self._redis_client.ping()
        except ImportError:
            raise CacheError("Redis dependency not installed. Install with: pip install redis")
        except Exception as e:
            raise CacheError(f"Failed to connect to Redis: {e}")

    def get_cache_key(
        self, messages: List[Message], config: GenerationConfig, provider: str
    ) -> str:
        """Generate cache key for messages and config."""
        # Create a deterministic hash of the input
        cache_data = {
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "model": config.model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "top_p": config.top_p,
            "provider": provider,
        }

        cache_string = json.dumps(cache_data, sort_keys=True)
        cache_hash = hashlib.sha256(cache_string.encode()).hexdigest()
        return f"{self.config.key_prefix}{cache_hash}"

    def get(self, key: str) -> Optional[Response]:
        """Get response from cache."""
        if not self.config.enabled:
            return None

        try:
            # Try Redis first
            if self._redis_client:
                cached_data = self._redis_client.get(key)
                if cached_data:
                    return pickle.loads(cached_data)

            # Try memory cache
            return self._memory_cache.get(key)
        except Exception:
            # Silently fail and return None
            return None

    def set(self, key: str, response: Response) -> None:
        """Set response in cache."""
        if not self.config.enabled:
            return

        try:
            # Set in Redis
            if self._redis_client:
                serialized_data = pickle.dumps(response)
                self._redis_client.setex(key, self.config.ttl, serialized_data)

            # Set in memory cache
            self._memory_cache[key] = response
        except Exception:
            # Silently fail
            pass

    async def async_get(self, key: str) -> Optional[Response]:
        """Async version of get."""
        # For now, use sync version
        # In future, could use aioredis for true async
        return self.get(key)

    async def async_set(self, key: str, response: Response) -> None:
        """Async version of set."""
        # For now, use sync version
        # In future, could use aioredis for true async
        self.set(key, response)

    def clear(self) -> None:
        """Clear all cached responses."""
        if not self.config.enabled:
            return

        try:
            if self._redis_client:
                # Clear all keys with our prefix
                keys = self._redis_client.keys(f"{self.config.key_prefix}*")
                if keys:
                    self._redis_client.delete(*keys)

            self._memory_cache.clear()
        except Exception:
            # Silently fail
            pass