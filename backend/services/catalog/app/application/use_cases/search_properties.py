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
        # TODO: Cache — construir key con todos los params, retornar si hit,
        # guardar después del mapeo si miss. TTL = CACHE_TTL (120s).
        # La lógica pesada (queries SQL, filtros, disponibilidad) está en
        # el repo.search(). Este use case solo orquesta cache + mapeo a DTOs.
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
        return PaginatedResponse.build(summaries, total, page, page_size, message=empty_msg)
