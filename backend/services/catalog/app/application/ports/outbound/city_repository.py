from abc import ABC, abstractmethod

from app.domain.models import City


class CityRepository(ABC):
    @abstractmethod
    async def search(self, q: str, limit: int = 20) -> list[City]:
        """Cities with active properties matching the query."""

    @abstractmethod
    async def get_featured(self, limit: int = 4) -> list[City]:
        """Top cities by active property count."""