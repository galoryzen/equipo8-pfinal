from collections.abc import AsyncGenerator
from uuid import UUID

import httpx
from fastapi import Cookie, Depends, Header
from shared.events import DomainEventPublisher, build_event_publisher
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.payment_repository import SqlAlchemyPaymentRepository
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.http.booking_http_client import HttpBookingServiceClient
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.booking_client_port import BookingServiceClient
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.token_port import TokenPort
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from app.config import settings

_payment_http_client: httpx.AsyncClient | None = None


def set_payment_http_client(client: httpx.AsyncClient | None) -> None:
    global _payment_http_client
    _payment_http_client = client


def _http_client() -> httpx.AsyncClient:
    global _payment_http_client
    if _payment_http_client is None:
        _payment_http_client = httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS)
    return _payment_http_client


_publisher: DomainEventPublisher = build_event_publisher(
    settings.EVENT_PUBLISHER_BACKEND,
    rabbitmq_url=settings.RABBITMQ_URL,
    eventbridge_bus_name=settings.EVENTBRIDGE_BUS_NAME,
    eventbridge_region=settings.EVENTBRIDGE_REGION,
    eventbridge_source=f"travelhub.{settings.SERVICE_NAME}",
)
_mock_payment_gateway = MockPaymentGateway()


def get_configured_event_publisher() -> DomainEventPublisher:
    return _publisher


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_token_adapter() -> TokenPort:
    return JwtTokenAdapter()


def get_event_publisher() -> DomainEventPublisher:
    return _publisher


def get_booking_service_client() -> BookingServiceClient:
    return HttpBookingServiceClient(_http_client())


def get_payment_gateway() -> PaymentGatewayPort:
    return _mock_payment_gateway


def get_authorization_header(
    authorization: str | None = Header(None),
    access_token: str | None = Cookie(default=None),
) -> str:
    """Return a canonical 'Bearer <token>' string from either the Authorization
    header or the access_token cookie (same pattern as the booking service)."""
    if authorization and authorization.lower().startswith("bearer "):
        return authorization
    if access_token:
        return f"Bearer {access_token}"
    raise InvalidTokenError("Authentication required")


def get_current_user_id(
    authorization: str = Depends(get_authorization_header),
    token_adapter: TokenPort = Depends(get_token_adapter),
) -> UUID:
    raw = authorization[7:].strip()
    payload = token_adapter.decode_access_token(raw)
    if not payload:
        raise InvalidTokenError("Invalid or expired token")
    sub = payload.get("sub")
    if not sub:
        raise InvalidTokenError("Invalid token payload")
    try:
        return UUID(str(sub))
    except ValueError as e:
        raise InvalidTokenError("Invalid subject in token") from e


def get_create_payment_intent_use_case(
    session: AsyncSession = Depends(get_db_session),
    booking: BookingServiceClient = Depends(get_booking_service_client),
) -> CreatePaymentIntentUseCase:
    repo = SqlAlchemyPaymentRepository(session)
    return CreatePaymentIntentUseCase(repo, booking)
