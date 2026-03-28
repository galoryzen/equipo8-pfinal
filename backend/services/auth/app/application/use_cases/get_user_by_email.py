from app.adapters.outbound.user_repoitory import UserRepository
from app.domain.models import User

class GetUserByEmailUseCase:

    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def execute(self, email: str) -> User | None:
        return await self._repo.get_by_email(email)
