from app.application.ports.outbound.property_repository import PropertyRepository
from app.schemas.common import PaginatedResponse
from app.schemas.manager import ManagerHotelItem


class ListAdminPropertiesUseCase:
    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self, *, page: int, page_size: int) -> PaginatedResponse:
        items, total = await self._repo.list_admin_properties(page=page, page_size=page_size)
        mapped = [ManagerHotelItem(**item) for item in items]
        return PaginatedResponse.build(items=mapped, total=total, page=page, page_size=page_size)

