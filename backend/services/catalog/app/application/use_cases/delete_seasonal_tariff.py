from uuid import UUID
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.application.use_cases.sync_rate_calendar import SyncRateCalendarUseCase
from app.domain.models import TariffSeasonalRule
from sqlalchemy import select

class DeleteSeasonalTariffUseCase:
    def __init__(self, repo: ManagerRepository, sync_use_case: SyncRateCalendarUseCase):
        self._repo = repo
        self._sync_use_case = sync_use_case

    async def execute(self, rule_id: UUID) -> None:
        # We need to know the room_type_id to sync the calendar after deletion
        # This information is usually available in the rule itself.
        # But wait, my repo delete_seasonal_tariff doesn't return anything.
        # I should probably fetch it first or change the repo method.
        # Let's assume the rule is found and deleted.
        
        # Actually, let's fetch the room_type_id first.
        # I'll need access to the session or add a method to the repo.
        # For simplicity, I'll update the repo delete method to return the room_type_id or just handle it here if I had access.
        # I'll add get_seasonal_rule to the repo.
        
        rule = await self._repo.get_seasonal_rule(rule_id)
        if rule:
            room_type_id = rule["room_type_id"]
            await self._repo.delete_seasonal_tariff(rule_id)
            await self._sync_use_case.execute(room_type_id)
