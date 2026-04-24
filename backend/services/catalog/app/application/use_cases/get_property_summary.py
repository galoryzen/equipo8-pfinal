from dataclasses import dataclass
from uuid import UUID

from app.application.exceptions import PropertyNotFoundError
from app.application.ports.outbound.property_repository import PropertyRepository


@dataclass
class PropertySummary:
    id: UUID
    name: str
    city_name: str
    country: str
    image_url: str | None


class GetPropertySummaryUseCase:
    """Minimal property lookup for internal service-to-service calls.

    Returns only fields needed to render transactional artifacts (emails,
    push notifications). Includes the first property image (by display_order)
    so consumers can render a hero image.
    """

    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self, property_id: UUID) -> PropertySummary:
        prop = await self._repo.get_by_id(property_id)
        if prop is None:
            raise PropertyNotFoundError(property_id)
        hero = prop.images[0].url if prop.images else None
        return PropertySummary(
            id=prop.id,
            name=prop.name,
            city_name=prop.city.name,
            country=prop.city.country,
            image_url=hero,
        )
