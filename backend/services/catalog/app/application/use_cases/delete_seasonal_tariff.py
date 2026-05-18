from uuid import UUID
from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.application.use_cases.sync_rate_calendar import SyncRateCalendarUseCase
from app.domain.models import TariffSeasonalRule
from sqlalchemy import select


class DeleteSeasonalTariffUseCase:
    def __init__(self, repo: ManagerRepository, sync_use_case: SyncRateCalendarUseCase, cache: CachePort):
        self._repo = repo
        self._sync_use_case = sync_use_case
        self._cache = cache

    async def execute(self, rule_id: UUID) -> None:
        rule = await self._repo.get_seasonal_rule(rule_id)
        if rule:
            room_type_id = rule["room_type_id"]
            await self._repo.delete_seasonal_tariff(rule_id)
            property_id = await self._repo.get_property_id_for_room_type(room_type_id)

            await self._sync_use_case.execute(room_type_id)

            if property_id:
                await self._cache.delete_pattern("search:*")
                await self._cache.delete_pattern(f"property_detail:{property_id}:*")
