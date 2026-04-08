from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.property import AmenitySummary


class ListAmenitiesUseCase:
    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self) -> list[AmenitySummary]:
        amenities = await self._repo.list_amenities()
        return [AmenitySummary(code=a.code, name=a.name) for a in amenities]
