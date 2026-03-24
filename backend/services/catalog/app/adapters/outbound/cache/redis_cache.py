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

    async def close(self) -> None:
        await self._redis.aclose()
