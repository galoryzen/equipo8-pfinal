from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.common import PaginatedResponse
from app.schemas.manager import ManagerHotelItem


class ListManagerHotelsUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, hotel_id: UUID, page: int, page_size: int) -> PaginatedResponse:
        items, total = await self._repo.list_manager_hotels(
            hotel_id=hotel_id, page=page, page_size=page_size
        )
        mapped = [ManagerHotelItem(**item) for item in items]
        return PaginatedResponse.build(items=mapped, total=total, page=page, page_size=page_size)
