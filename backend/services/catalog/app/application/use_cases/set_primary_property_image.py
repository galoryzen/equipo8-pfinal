from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class SetPrimaryPropertyImageUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> list[dict]:
        return await self._repo.set_primary_property_image(property_id, hotel_id, image_id)
