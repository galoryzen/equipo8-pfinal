from datetime import date
from decimal import Decimal
from uuid import UUID

from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.common import PaginatedResponse
from app.schemas.property import PropertySummary


class SearchPropertiesUseCase:
    CACHE_TTL = 120

    def __init__(self, repo: PropertyRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self,
        checkin: date,
        checkout: date,
        guests: int,
        city_id: UUID | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        amenity_codes: list[str] | None = None,
        sort_by: str = "popularity",
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[PropertySummary]:
        items, total = await self._repo.search(
            checkin=checkin,
            checkout=checkout,
            guests=guests,
            city_id=city_id,
            min_price=min_price,
            max_price=max_price,
            amenity_codes=amenity_codes,
            sort_by=sort_by,
            page=page,
            page_size=page_size,
        )
        summaries = [PropertySummary.model_validate(item) for item in items]
        return PaginatedResponse.build(summaries, total, page, page_size)
