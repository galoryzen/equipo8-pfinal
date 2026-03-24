from app.application.ports.outbound.city_repository import CityRepository
from app.schemas.city import FeaturedDestinationOut


class GetFeaturedDestinationsUseCase:
    def __init__(self, repo: CityRepository):
        self._repo = repo

    async def execute(self, limit: int = 4) -> list[FeaturedDestinationOut]:
        cities = await self._repo.get_featured(limit=limit)
        return [
            FeaturedDestinationOut(
                id=c.id,
                name=c.name,
                department=c.department,
                country=c.country,
                image_url=c.image_url,
            )
            for c in cities
        ]