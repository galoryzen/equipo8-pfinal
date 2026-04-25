from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class GetRatePlanCancellationPolicyUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, rate_plan_id: UUID) -> dict | None:
        return await self._repo.get_rate_plan_cancellation_policy(rate_plan_id)
