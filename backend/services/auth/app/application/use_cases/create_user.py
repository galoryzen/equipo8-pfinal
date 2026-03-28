from app.adapters.outbound.user_repoitory import UserRepository
from app.domain.models import User


class CreateUserUseCase:

    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def execute(self, user: User) -> User:
        return await self._repo.create_user(user)
