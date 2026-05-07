from collections.abc import AsyncGenerator
from uuid import UUID

import httpx
from fastapi import Cookie, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.device_token_repository import SqlAlchemyDeviceTokenRepository
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.adapters.outbound.push.expo_push_sender import ExpoPushSender
from app.adapters.outbound.push.logging_push_sender import LoggingPushSender
from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.push_sender import PushSender
from app.application.ports.outbound.token_port import TokenPort
from app.application.use_cases.delete_device_token import DeleteDeviceTokenUseCase
from app.application.use_cases.register_device_token import RegisterDeviceTokenUseCase
from app.application.use_cases.send_test_push import SendTestPushNotificationUseCase
from app.config import settings

# Shared HTTP client for the Expo push API. Created once by main.py's lifespan
# and reused for every request. Falls back to a lazy on-demand client so tests
# work without explicitly running lifespan.
_push_http_client: httpx.AsyncClient | None = None


def set_push_http_client(client: httpx.AsyncClient | None) -> None:
    global _push_http_client
    _push_http_client = client


def _get_push_http_client() -> httpx.AsyncClient:
    global _push_http_client
    if _push_http_client is None:
        _push_http_client = httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS)
    return _push_http_client


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_token_adapter() -> TokenPort:
    return JwtTokenAdapter()


def get_current_user_id(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
    token_adapter: TokenPort = Depends(get_token_adapter),
) -> UUID:
    raw: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
    elif access_token:
        raw = access_token
    if not raw:
        raise InvalidTokenError("Authentication required")

    payload = token_adapter.decode_access_token(raw)
    if not payload:
        raise InvalidTokenError("Invalid or expired token")

    sub = payload.get("sub")
    if not sub:
        raise InvalidTokenError("Invalid token payload")

    try:
        return UUID(str(sub))
    except ValueError as exc:
        raise InvalidTokenError("Invalid token subject") from exc


def get_device_token_repository(
    session: AsyncSession = Depends(get_db_session),
) -> DeviceTokenRepository:
    return SqlAlchemyDeviceTokenRepository(session)


def get_push_sender() -> PushSender:
    if settings.PUSH_SENDER_BACKEND == "expo":
        return ExpoPushSender(_get_push_http_client(), access_token=settings.EXPO_ACCESS_TOKEN or None)
    return LoggingPushSender()


def get_register_device_token_use_case(
    repo: DeviceTokenRepository = Depends(get_device_token_repository),
) -> RegisterDeviceTokenUseCase:
    return RegisterDeviceTokenUseCase(repo)


def get_delete_device_token_use_case(
    repo: DeviceTokenRepository = Depends(get_device_token_repository),
) -> DeleteDeviceTokenUseCase:
    return DeleteDeviceTokenUseCase(repo)


def get_send_test_push_use_case(
    repo: DeviceTokenRepository = Depends(get_device_token_repository),
    push: PushSender = Depends(get_push_sender),
) -> SendTestPushNotificationUseCase:
    return SendTestPushNotificationUseCase(repo, push)
