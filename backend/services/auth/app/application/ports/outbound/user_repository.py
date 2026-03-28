from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.user_repoitory import UserRepository
from app.domain.models import User


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        return user

    async def check_user_exists(self, email: str) -> bool:
        result = self.get_by_email(email)
        return result is not None

    async def create_user(self, user: User) -> User:
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user