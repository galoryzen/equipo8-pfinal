from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.property import ActiveHotelItem


class GetActiveHotelsUseCase:
    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self) -> list[ActiveHotelItem]:
        items = await self._repo.get_active_hotels()
        return [ActiveHotelItem(**item) for item in items]
