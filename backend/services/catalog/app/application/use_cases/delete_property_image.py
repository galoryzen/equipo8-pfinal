from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class DeletePropertyImageUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> None:
        await self._repo.delete_property_image(property_id, hotel_id, image_id)
