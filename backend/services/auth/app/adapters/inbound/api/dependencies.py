from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.db.user_repository import SqlAlchemyUserRepository
from app.application.ports.outbound.user_repository import UserRepository
from app.application.use_cases.check_user_exists import CheckUserExistsUseCase
from app.application.use_cases.create_user import CreateUserUseCase
from app.application.use_cases.get_user_by_email import GetUserByEmailUseCase


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_user_repository(session: AsyncSession) -> UserRepository:
    return SqlAlchemyUserRepository(session)


def get_user_by_email_use_case(session: AsyncSession) -> GetUserByEmailUseCase:
    return GetUserByEmailUseCase(get_user_repository(session))


def get_check_user_exists_use_case(session: AsyncSession) -> CheckUserExistsUseCase:
    return CheckUserExistsUseCase(get_user_repository(session))


def get_create_user_use_case(session: AsyncSession) -> CreateUserUseCase:
    return CreateUserUseCase(get_user_repository(session))
