from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.common import PaginatedResponse
from app.schemas.manager import RoomTypeManagerItem


class ListRoomTypesAvailabilityUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, property_id: UUID, page: int, page_size: int) -> PaginatedResponse:
        items, total = await self._repo.list_room_types_with_availability(
            property_id=property_id, page=page, page_size=page_size
        )
        mapped = [RoomTypeManagerItem(**item) for item in items]
        return PaginatedResponse.build(items=mapped, total=total, page=page, page_size=page_size)
