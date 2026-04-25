from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository


class GetPropertyStatsUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, property_id: UUID) -> dict:
        return await self._repo.get_property_stats(property_id)
