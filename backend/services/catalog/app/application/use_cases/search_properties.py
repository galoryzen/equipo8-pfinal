from datetime import date
from decimal import Decimal
from uuid import UUID

from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.common import PaginatedResponse
from app.schemas.property import PropertySummary


class SearchPropertiesUseCase:
    CACHE_TTL = 120
    EMPTY_RESULTS_MESSAGE = (
        "No hay hospedajes disponibles para la ubicación y fechas seleccionadas."
    )

    def __init__(self, repo: PropertyRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self,
        checkin: date,
        checkout: date,
        guests: int,
        city_id: UUID,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        amenity_codes: list[str] | None = None,
        sort_by: str = "popularity",
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[PropertySummary]:
        cache_key = (
            f"search:{city_id}:{checkin}:{checkout}:g={guests}"
            f":p={min_price}-{max_price}"
            f":a={','.join(sorted(amenity_codes)) if amenity_codes else ''}"
            f":s={sort_by}:pg={page}:ps={page_size}"
        )

        cached = await self._cache.get(cache_key)
        if cached:
            return PaginatedResponse[PropertySummary].model_validate_json(cached)

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
        empty_msg = self.EMPTY_RESULTS_MESSAGE if total == 0 else None
        response = PaginatedResponse.build(summaries, total, page, page_size, message=empty_msg)

        await self._cache.set(cache_key, response.model_dump_json(), self.CACHE_TTL)

        return response
