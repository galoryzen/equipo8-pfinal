from uuid import UUID
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import RoomTariffsOut

class GetRoomTariffsUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, room_type_id: UUID) -> RoomTariffsOut:
        result = await self._repo.get_room_tariffs(room_type_id)
        return RoomTariffsOut(**result)
