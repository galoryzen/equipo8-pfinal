import logging

import redis.asyncio as aioredis

from app.application.ports.outbound.cache_port import CachePort
from app.config import settings

logger = logging.getLogger(__name__)


class RedisCache(CachePort):
    def __init__(self) -> None:
        self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    async def get(self, key: str) -> str | None:
        try:
            return await self._redis.get(key)
        except aioredis.RedisError:
            logger.warning("Redis GET failed for key %s", key, exc_info=True)
            return None

    async def set(self, key: str, value: str, ttl_seconds: int = 300) -> None:
        try:
            await self._redis.set(key, value, ex=ttl_seconds)
        except aioredis.RedisError:
            logger.warning("Redis SET failed for key %s", key, exc_info=True)

    async def delete_pattern(self, pattern: str) -> int:
        try:
            keys = []
            async for key in self._redis.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                return await self._redis.delete(*keys)
            return 0
        except aioredis.RedisError:
            logger.warning("Redis DELETE pattern failed for %s", pattern, exc_info=True)
            return 0

    async def delete(self, key: str) -> None:
        try:
            await self._redis.delete(key)
        except aioredis.RedisError:
            logger.warning("Redis DELETE failed for key %s", key, exc_info=True)

    async def close(self) -> None:
        await self._redis.aclose()
