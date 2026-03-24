from datetime import date
from uuid import UUID

from app.application.exceptions import PropertyNotFoundError
from app.application.ports.outbound.cache_port import CachePort
from app.application.ports.outbound.property_repository import PropertyRepository


class GetPropertyDetailUseCase:
    CACHE_TTL = 300

    def __init__(self, repo: PropertyRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    async def execute(
        self,
        property_id: UUID,
        checkin: date | None = None,
        checkout: date | None = None,
        review_page: int = 1,
        review_page_size: int = 10,
    ) -> dict:
        # TODO: Implementar el flujo completo del detalle de propiedad.
        #
        # 1. Cache: construir key con todos los params (property_id, checkin,
        #    checkout, review_page, review_page_size). Si hay hit, retornar.
        #
        # 2. Obtener property vía repo.get_by_id (ORM model con relaciones).
        #    Si no existe → raise PropertyNotFoundError.
        #
        # 3. Obtener reviews paginadas vía repo.get_reviews.
        #
        # 4. Mapeo ORM → DTOs (este use case se encarga, NO el repo):
        #    - Property → PropertyDetail (ver schemas/property.py)
        #    - Calcular min_price por RatePlan y RoomType filtrando
        #      rate_calendar por checkin/checkout (si se pasan).
        #    - Reviews → PaginatedResponse[ReviewOut]
        #    Tip: extraer el mapeo a un método _build_detail() para claridad.
        #
        # 5. Guardar en cache y retornar dict con "detail" y "reviews".
        prop = await self._repo.get_by_id(property_id)
        if not prop:
            raise PropertyNotFoundError(property_id)

        reviews_list, review_total = await self._repo.get_reviews(property_id, review_page, review_page_size)

        return {"property": prop, "reviews": reviews_list, "review_total": review_total}
