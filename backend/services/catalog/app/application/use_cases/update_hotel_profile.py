from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import UpdateHotelProfileIn


class UpdateHotelProfileUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(
        self, property_id: UUID, hotel_id: UUID, data: UpdateHotelProfileIn
    ) -> dict:
        return await self._repo.update_hotel_profile(property_id, hotel_id, data)
