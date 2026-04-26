from app.application.ports.outbound.property_repository import PropertyRepository


class ListAdminPropertiesUseCase:
    def __init__(self, repo: PropertyRepository):
        self._repo = repo

    async def execute(self, *, limit: int = 500) -> list[dict]:
        return await self._repo.list_admin_properties(limit=limit)

