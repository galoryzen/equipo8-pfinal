from uuid import UUID

from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.manager_repository import ManagerRepository


class SetPrimaryPropertyImageUseCase:
    def __init__(self, repo: ManagerRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> list[dict]:
        result = await self._repo.set_primary_property_image(property_id, hotel_id, image_id)
        await self._cache.delete_pattern("search:*")
        await self._cache.delete_pattern(f"property_detail:{property_id}:*")
        return result
