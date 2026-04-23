from collections.abc import AsyncGenerator
from uuid import UUID

import httpx
from fastapi import Cookie, Depends, Header
from shared.events import DomainEventPublisher, build_event_publisher
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.adapters.outbound.db.dashboard_metrics_repository import SqlAlchemyDashboardMetricsRepository
from app.adapters.outbound.db.guest_repository import SqlAlchemyGuestRepository
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.ports.outbound.token_port import TokenPort
from app.application.use_cases.cancel_cart_booking import CancelCartBookingUseCase
from app.application.use_cases.confirm_booking import ConfirmBookingUseCase
from app.application.use_cases.checkout_booking import CheckoutBookingUseCase
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_booking_guests import ListBookingGuestsUseCase
from app.application.use_cases.get_hotel_dashboard_metrics import GetHotelDashboardMetricsUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.application.use_cases.reject_booking import RejectBookingUseCase
from app.application.use_cases.save_booking_guests import SaveBookingGuestsUseCase
from app.config import settings

# ── Shared HTTP client for Catalog (kept open for the process lifetime,
# set by lifespan in main.py). Falls back to a lazy on-demand client so
# tests and scripts work without touching lifespan explicitly. ─────────
_catalog_http_client: httpx.AsyncClient | None = None


def set_catalog_http_client(client: httpx.AsyncClient | None) -> None:
    global _catalog_http_client
    _catalog_http_client = client


def _get_catalog_http_client() -> httpx.AsyncClient:
    global _catalog_http_client
    if _catalog_http_client is None:
        _catalog_http_client = httpx.AsyncClient(timeout=settings.CATALOG_HTTP_TIMEOUT_SECONDS)
    return _catalog_http_client


# ── Shared domain event publisher for the API process. Built once from
# settings at import-time. Closed cleanly from main.py lifespan.
_publisher: DomainEventPublisher = build_event_publisher(
    settings.EVENT_BUS_BACKEND,
    rabbitmq_url=settings.RABBITMQ_URL,
    eventbridge_bus_name=settings.EVENTBRIDGE_BUS_NAME,
    eventbridge_region=settings.EVENTBRIDGE_REGION,
)


def get_configured_event_publisher() -> DomainEventPublisher:
    return _publisher


def get_event_publisher() -> DomainEventPublisher:
    return _publisher


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

def get_token_adapter() -> TokenPort:
    return JwtTokenAdapter()


def get_catalog_client() -> CatalogInventoryPort:
    return HttpCatalogClient(_get_catalog_http_client(), base_url=settings.CATALOG_SERVICE_URL)


def get_current_user_id(
    authorization: str | None = Header(None),
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
    except ValueError as e:
        raise InvalidTokenError("Invalid subject in token") from e


def get_create_cart_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
    catalog: CatalogInventoryPort = Depends(get_catalog_client),
) -> CreateCartBookingUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return CreateCartBookingUseCase(repo, catalog)


def get_cancel_cart_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
    catalog: CatalogInventoryPort = Depends(get_catalog_client),
) -> CancelCartBookingUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return CancelCartBookingUseCase(repo, catalog)

def get_list_my_bookings_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> ListMyBookingsUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return ListMyBookingsUseCase(repo)

def get_booking_detail_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetBookingDetailUseCase:
    repo = SqlAlchemyBookingRepository(session)
    guest_repo = SqlAlchemyGuestRepository(session)
    return GetBookingDetailUseCase(repo, guest_repo)


def get_save_booking_guests_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> SaveBookingGuestsUseCase:
    booking_repo = SqlAlchemyBookingRepository(session)
    guest_repo = SqlAlchemyGuestRepository(session)
    return SaveBookingGuestsUseCase(booking_repo, guest_repo)


def get_list_booking_guests_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> ListBookingGuestsUseCase:
    booking_repo = SqlAlchemyBookingRepository(session)
    guest_repo = SqlAlchemyGuestRepository(session)
    return ListBookingGuestsUseCase(booking_repo, guest_repo)

def get_confirm_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> ConfirmBookingUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return ConfirmBookingUseCase(repo)


def get_reject_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> RejectBookingUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return RejectBookingUseCase(repo)

# Devuelve un dict con el role y user_id extraídos del token JWT
def get_current_user_info(
    authorization: str | None = Header(None),
    access_token: str | None = Cookie(default=None),
    token_adapter: TokenPort = Depends(get_token_adapter),
) -> dict:
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
    role = payload.get("role")
    if not sub or not role:
        raise InvalidTokenError("Invalid token payload")

    try:
        user_id = str(sub)
    except Exception:
        user_id = None
    return {"role": role, "user_id": user_id}


def get_checkout_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
    events: DomainEventPublisher = Depends(get_event_publisher),
) -> CheckoutBookingUseCase:
    booking_repo = SqlAlchemyBookingRepository(session)
    guest_repo = SqlAlchemyGuestRepository(session)
    return CheckoutBookingUseCase(booking_repo, guest_repo, events)


def get_hotel_dashboard_metrics_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetHotelDashboardMetricsUseCase:
    repo = SqlAlchemyDashboardMetricsRepository(session)
    return GetHotelDashboardMetricsUseCase(repo)


