from app.adapters.outbound.user_repoitory import UserRepository


class CheckUserExistsUseCase:

    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def execute(self, email: str) -> bool:
        user = await self._repo.get_by_email(email)
        return user is not None
