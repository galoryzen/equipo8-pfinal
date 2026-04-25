from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass
class PropertySummary:
    id: UUID
    name: str
    city_name: str
    country: str
    image_url: str | None


class PropertyClient(ABC):
    @abstractmethod
    async def get_summary(self, property_id: UUID) -> PropertySummary:
        """Fetch name + city for a property. Raises if not found or upstream fails."""
