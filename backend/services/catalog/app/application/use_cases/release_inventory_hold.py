from datetime import date
from uuid import UUID

from app.application.ports.outbound.inventory_repository import InventoryRepository


class ReleaseInventoryHoldUseCase:
    def __init__(self, repo: InventoryRepository):
        self._repo = repo

    async def execute(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        await self._repo.release_hold(room_type_id, checkin, checkout)
