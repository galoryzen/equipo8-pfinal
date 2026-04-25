from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class DeletePromotionUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, promotion_id: UUID) -> None:
        await self._repo.delete_promotion(promotion_id)
