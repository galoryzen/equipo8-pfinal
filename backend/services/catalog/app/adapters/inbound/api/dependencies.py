from collections.abc import AsyncGenerator
from uuid import UUID

import httpx
from fastapi import Cookie, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.cache.redis_cache import RedisCache
from app.adapters.outbound.db.city_repository import SqlAlchemyCityRepository
from app.adapters.outbound.db.inventory_repository import SqlAlchemyInventoryRepository
from app.adapters.outbound.db.manager_repository import SqlAlchemyManagerRepository
from app.adapters.outbound.db.property_repository import SqlAlchemyPropertyRepository
from app.adapters.outbound.db.session import async_session
from app.application.exceptions import UnauthorizedError
from app.application.ports.outbound.cache_port import CachePort
from app.application.use_cases.create_inventory_hold import CreateInventoryHoldUseCase
from app.application.use_cases.create_promotion import CreatePromotionUseCase
from app.application.use_cases.delete_promotion import DeletePromotionUseCase
from app.application.use_cases.get_featured_destinations import GetFeaturedDestinationsUseCase
from app.application.use_cases.get_rate_plan_cancellation_policy import GetRatePlanCancellationPolicyUseCase
from app.application.use_cases.get_room_type_promotion import GetRoomTypePromotionUseCase
from app.application.use_cases.get_featured_properties import GetFeaturedPropertiesUseCase
from app.application.use_cases.get_hotel_metrics import GetHotelMetricsUseCase
from app.application.use_cases.get_property_detail import GetPropertyDetailUseCase
from app.application.use_cases.list_amenities import ListAmenitiesUseCase
from app.application.use_cases.list_manager_hotels import ListManagerHotelsUseCase
from app.application.use_cases.list_room_types_availability import ListRoomTypesAvailabilityUseCase
from app.application.use_cases.release_inventory_hold import ReleaseInventoryHoldUseCase
from app.application.use_cases.search_cities import SearchCitiesUseCase
from app.application.use_cases.search_properties import SearchPropertiesUseCase
from app.application.use_cases.update_rate_plan_cancellation_policy import UpdateRatePlanCancellationPolicyUseCase

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


def get_list_amenities_use_case(session: AsyncSession) -> ListAmenitiesUseCase:
    repo = get_property_repository(session)
    return ListAmenitiesUseCase(repo)


def get_inventory_repository(session: AsyncSession) -> SqlAlchemyInventoryRepository:
    return SqlAlchemyInventoryRepository(session)


def get_create_hold_use_case(session: AsyncSession) -> CreateInventoryHoldUseCase:
    repo = get_inventory_repository(session)
    return CreateInventoryHoldUseCase(repo)


def get_release_hold_use_case(session: AsyncSession) -> ReleaseInventoryHoldUseCase:
    repo = get_inventory_repository(session)
    return ReleaseInventoryHoldUseCase(repo)


# ── Manager endpoints ─────────────────────────────────────────────────────────

# Shared httpx client for calls to the booking service (set by lifespan in main.py)
_booking_http_client: httpx.AsyncClient | None = None


def set_booking_http_client(client: httpx.AsyncClient | None) -> None:
    global _booking_http_client
    _booking_http_client = client


def _get_booking_http_client() -> httpx.AsyncClient:
    global _booking_http_client
    if _booking_http_client is None:
        _booking_http_client = httpx.AsyncClient(timeout=5.0)
    return _booking_http_client


def get_manager_hotel_id(
    authorization: str | None = Header(None),
    access_token: str | None = Cookie(default=None),
) -> UUID:
    """Decode JWT and return the hotel_id claim; raise UnauthorizedError if missing."""
    from shared.jwt import decode_access_token

    raw: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
    elif access_token:
        raw = access_token

    if not raw:
        raise UnauthorizedError("Authentication required")

    payload = decode_access_token(raw)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    hotel_id_str = payload.get("hotel_id")
    if not hotel_id_str:
        raise UnauthorizedError("Token does not contain hotel_id claim")

    try:
        return UUID(str(hotel_id_str))
    except ValueError as exc:
        raise UnauthorizedError("Invalid hotel_id in token") from exc


def get_manager_repository(session: AsyncSession) -> SqlAlchemyManagerRepository:
    return SqlAlchemyManagerRepository(session)


def get_list_manager_hotels_use_case(session: AsyncSession) -> ListManagerHotelsUseCase:
    repo = get_manager_repository(session)
    return ListManagerHotelsUseCase(repo)


async def get_booking_property_stats(property_id: UUID) -> dict:
    """Fetch property stats (activeBookings, monthlyRevenue) from the booking service."""
    client = _get_booking_http_client()
    try:
        resp = await client.get(
            f"/api/v1/booking/internal/properties/{property_id}/stats"
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {"active_bookings": 0, "monthly_revenue": 0.0}


def get_hotel_metrics_use_case(session: AsyncSession, booking_stats: dict) -> GetHotelMetricsUseCase:
    repo = get_manager_repository(session)
    return GetHotelMetricsUseCase(repo=repo, booking_stats=booking_stats)


def get_list_room_types_availability_use_case(session: AsyncSession) -> ListRoomTypesAvailabilityUseCase:
    repo = get_manager_repository(session)
    return ListRoomTypesAvailabilityUseCase(repo)


def get_create_promotion_use_case(session: AsyncSession) -> CreatePromotionUseCase:
    repo = get_manager_repository(session)
    return CreatePromotionUseCase(repo)


def get_room_type_promotion_use_case(session: AsyncSession) -> GetRoomTypePromotionUseCase:
    repo = get_manager_repository(session)
    return GetRoomTypePromotionUseCase(repo)


def get_delete_promotion_use_case(session: AsyncSession) -> DeletePromotionUseCase:
    repo = get_manager_repository(session)
    return DeletePromotionUseCase(repo)


def get_rate_plan_cancellation_policy_use_case(
    session: AsyncSession,
) -> GetRatePlanCancellationPolicyUseCase:
    repo = get_manager_repository(session)
    return GetRatePlanCancellationPolicyUseCase(repo)


def get_update_cancellation_policy_use_case(
    session: AsyncSession,
) -> UpdateRatePlanCancellationPolicyUseCase:
    repo = get_manager_repository(session)
    return UpdateRatePlanCancellationPolicyUseCase(repo)
