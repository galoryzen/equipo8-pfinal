from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class GetHotelProfileUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, property_id: UUID, hotel_id: UUID) -> dict:
        return await self._repo.get_hotel_profile(property_id, hotel_id)
