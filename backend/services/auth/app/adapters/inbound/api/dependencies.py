from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.db.user_repository import SqlAlchemyUserRepository
from app.application.use_cases.check_user_exists import CheckUserExistsUseCase
from app.application.use_cases.create_user import CreateUserUseCase
from app.application.use_cases.get_user_by_email import GetUserByEmailUseCase


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_user_repository(session: AsyncSession) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(session)


def get_user_by_email_use_case(session: AsyncSession) -> GetUserByEmailUseCase:
    repo = get_user_repository(session)
    return GetUserByEmailUseCase(repo)


def get_check_user_exists_use_case(session: AsyncSession) -> CheckUserExistsUseCase:
    repo = get_user_repository(session)
    return CheckUserExistsUseCase(repo)


def get_create_user_use_case(session: AsyncSession) -> CreateUserUseCase:
    repo = get_user_repository(session)
    return CreateUserUseCase(repo)
