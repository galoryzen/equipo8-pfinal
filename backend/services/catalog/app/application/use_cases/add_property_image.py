from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import AddPropertyImageIn


class AddPropertyImageUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(
        self, property_id: UUID, hotel_id: UUID, data: AddPropertyImageIn
    ) -> dict:
        return await self._repo.add_property_image(property_id, hotel_id, data)
