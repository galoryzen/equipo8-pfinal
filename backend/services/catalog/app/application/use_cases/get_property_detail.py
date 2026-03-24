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
        prop = await self._repo.get_by_id(property_id)
        if not prop:
            raise PropertyNotFoundError(property_id)

        reviews_list, review_total = await self._repo.get_reviews(property_id, review_page, review_page_size)

        return {"property": prop, "reviews": reviews_list, "review_total": review_total}
