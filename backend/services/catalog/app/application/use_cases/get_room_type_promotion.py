from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class GetRoomTypePromotionUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, room_type_id: UUID) -> dict | None:
        return await self._repo.get_room_type_promotion(room_type_id)
