from app.application.ports.outbound.city_repository import CityRepository
from app.schemas.city import CityOut


class SearchCitiesUseCase:
    def __init__(self, repo: CityRepository):
        self._repo = repo

    async def execute(self, q: str) -> list[CityOut]:
        cities = await self._repo.search(q)
        return [CityOut(id=c.id, name=c.name, department=c.department, country=c.country) for c in cities]
