from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import UpdateCancellationPolicyIn


class UpdateRatePlanCancellationPolicyUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, rate_plan_id: UUID, data: UpdateCancellationPolicyIn) -> dict:
        return await self._repo.update_rate_plan_cancellation_policy(rate_plan_id, data)
