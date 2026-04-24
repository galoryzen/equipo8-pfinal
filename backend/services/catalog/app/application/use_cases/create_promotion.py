from uuid import UUID

from app.application.exceptions import PromotionError
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import CreatePromotionIn, PromotionCreatedOut


class CreatePromotionUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, property_id: UUID, data: CreatePromotionIn) -> PromotionCreatedOut:
        try:
            result = await self._repo.create_promotion(property_id=property_id, data=data)
        except ValueError as exc:
            raise PromotionError(str(exc)) from exc
        return PromotionCreatedOut(**result)
