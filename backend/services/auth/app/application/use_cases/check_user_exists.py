from app.application.ports.outbound.user_repository import UserRepository


class CheckUserExistsUseCase:

    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def execute(self, email: str) -> bool:
        return await self._repo.check_user_exists(email)
