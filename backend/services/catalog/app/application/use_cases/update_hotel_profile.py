from uuid import UUID

from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import UpdateHotelProfileIn


class UpdateHotelProfileUseCase:
    def __init__(self, repo: ManagerRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self, property_id: UUID, hotel_id: UUID, data: UpdateHotelProfileIn
    ) -> dict:
        result = await self._repo.update_hotel_profile(property_id, hotel_id, data)
        await self._cache.delete_pattern("search:*")
        await self._cache.delete_pattern(f"property_detail:{property_id}:*")
        return result
