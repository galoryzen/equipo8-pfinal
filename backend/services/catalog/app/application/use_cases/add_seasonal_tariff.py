from uuid import UUID
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import TariffSeasonalRuleIn, TariffSeasonalRuleOut
from app.application.use_cases.sync_rate_calendar import SyncRateCalendarUseCase

class AddSeasonalTariffUseCase:
    def __init__(self, repo: ManagerRepository, sync_use_case: SyncRateCalendarUseCase):
        self._repo = repo
        self._sync_use_case = sync_use_case

    async def execute(self, room_type_id: UUID, data: TariffSeasonalRuleIn) -> TariffSeasonalRuleOut:
        result = await self._repo.add_seasonal_tariff(room_type_id, data)
        # Sync calendar after update
        await self._sync_use_case.execute(room_type_id)
        return TariffSeasonalRuleOut(**result)
