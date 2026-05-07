from uuid import UUID
from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import TariffBaseIn, TariffBaseOut
from app.application.use_cases.sync_rate_calendar import SyncRateCalendarUseCase


class UpdateBaseTariffUseCase:
    def __init__(self, repo: ManagerRepository, sync_use_case: SyncRateCalendarUseCase, cache: CachePort):
        self._repo = repo
        self._sync_use_case = sync_use_case
        self._cache = cache

    async def execute(self, room_type_id: UUID, data: TariffBaseIn) -> TariffBaseOut:
        result = await self._repo.update_base_tariff(room_type_id, data)
        property_id = await self._repo.get_property_id_for_room_type(room_type_id)

        await self._sync_use_case.execute(room_type_id)

        if property_id:
            await self._cache.delete_pattern(f"property_detail:{property_id}:*")

        return TariffBaseOut(**result)
