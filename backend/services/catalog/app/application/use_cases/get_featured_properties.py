from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.property import PropertySummary


class GetFeaturedPropertiesUseCase:
    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self, limit: int = 10) -> list[PropertySummary]:
        items = await self._repo.search_featured(limit=limit)
        return [PropertySummary.model_validate(item) for item in items]
