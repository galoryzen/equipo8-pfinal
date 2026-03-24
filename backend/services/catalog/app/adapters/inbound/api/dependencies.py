from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.cache.redis_cache import RedisCache
from app.adapters.outbound.db.city_repository import SqlAlchemyCityRepository
from app.adapters.outbound.db.property_repository import SqlAlchemyPropertyRepository
from app.adapters.outbound.db.session import async_session
from app.application.ports.outbound.cache_port import CachePort
from app.application.use_cases.get_featured_destinations import GetFeaturedDestinationsUseCase
from app.application.use_cases.get_featured_properties import GetFeaturedPropertiesUseCase
from app.application.use_cases.get_property_detail import GetPropertyDetailUseCase
from app.application.use_cases.search_cities import SearchCitiesUseCase
from app.application.use_cases.search_properties import SearchPropertiesUseCase

# Singleton — created once, shared across requests
_redis_cache: RedisCache | None = None


def init_cache() -> RedisCache:
    global _redis_cache
    _redis_cache = RedisCache()
    return _redis_cache


async def close_cache() -> None:
    if _redis_cache:
        await _redis_cache.close()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_cache() -> CachePort:
    assert _redis_cache is not None, "Cache not initialized"
    return _redis_cache


def get_property_repository(session: AsyncSession) -> SqlAlchemyPropertyRepository:
    return SqlAlchemyPropertyRepository(session)


def get_city_repository(session: AsyncSession) -> SqlAlchemyCityRepository:
    return SqlAlchemyCityRepository(session)


def get_featured_destinations_use_case(session: AsyncSession) -> GetFeaturedDestinationsUseCase:
    repo = get_city_repository(session)
    return GetFeaturedDestinationsUseCase(repo)


def get_search_cities_use_case(session: AsyncSession) -> SearchCitiesUseCase:
    repo = get_city_repository(session)
    return SearchCitiesUseCase(repo)


def get_featured_use_case(session: AsyncSession) -> GetFeaturedPropertiesUseCase:
    repo = get_property_repository(session)
    return GetFeaturedPropertiesUseCase(repo)


def get_search_use_case(session: AsyncSession, cache: CachePort) -> SearchPropertiesUseCase:
    repo = get_property_repository(session)
    return SearchPropertiesUseCase(repo, cache)


def get_detail_use_case(session: AsyncSession, cache: CachePort) -> GetPropertyDetailUseCase:
    repo = get_property_repository(session)
    return GetPropertyDetailUseCase(repo, cache)
