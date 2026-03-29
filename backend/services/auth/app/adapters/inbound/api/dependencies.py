from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.db.user_repository import SqlAlchemyUserRepository
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository
from app.application.use_cases.login_user import LoginUserUseCase
from app.application.use_cases.register_user import RegisterUserUseCase
from app.application.use_cases.validate_token import ValidateTokenUseCase

_token_adapter: JwtTokenAdapter | None = None


def init_token_adapter() -> JwtTokenAdapter:
    global _token_adapter
    _token_adapter = JwtTokenAdapter()
    return _token_adapter


def get_token_adapter() -> TokenPort:
    assert _token_adapter is not None, "Token adapter not initialized"
    return _token_adapter


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_user_repository(session: AsyncSession) -> UserRepository:
    return SqlAlchemyUserRepository(session)


def get_login_use_case(session: AsyncSession, token: TokenPort) -> LoginUserUseCase:
    return LoginUserUseCase(get_user_repository(session), token)


def get_register_use_case(session: AsyncSession, token: TokenPort) -> RegisterUserUseCase:
    return RegisterUserUseCase(get_user_repository(session), token)


def get_validate_token_use_case(token: TokenPort) -> ValidateTokenUseCase:
    return ValidateTokenUseCase(token)
