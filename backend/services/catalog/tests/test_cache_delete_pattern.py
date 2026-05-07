from unittest.mock import AsyncMock, MagicMock

import pytest

from app.adapters.outbound.cache.redis_cache import RedisCache


class TestRedisCacheDeletePattern:
    @pytest.mark.asyncio
    async def test_delete_pattern_calls_redis_scan(self):
        redis = AsyncMock()

        async def async_iter_mock(*args, **kwargs):
            keys = ["key1", "key2", "key3"]
            for key in keys:
                yield key

        redis.scan_iter = MagicMock(return_value=async_iter_mock())
        redis.delete = AsyncMock(return_value=3)

        cache = RedisCache.__new__(RedisCache)
        cache._redis = redis

        result = await cache.delete_pattern("property_detail:*")

        redis.scan_iter.assert_called_once_with(match="property_detail:*")
        redis.delete.assert_called_once_with("key1", "key2", "key3")
        assert result == 3

    @pytest.mark.asyncio
    async def test_delete_pattern_returns_zero_when_no_keys(self):
        redis = AsyncMock()

        async def async_iter_mock(*args, **kwargs):
            return
            yield

        redis.scan_iter = MagicMock(return_value=async_iter_mock())

        cache = RedisCache.__new__(RedisCache)
        cache._redis = redis

        result = await cache.delete_pattern("property_detail:*")

        assert result == 0