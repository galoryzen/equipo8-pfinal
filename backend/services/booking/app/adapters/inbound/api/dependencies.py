from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Cookie, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.jwt_token import JwtTokenAdapter
from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.token_port import TokenPort
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.get_held_rooms import GetHeldRoomsUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_token_adapter() -> TokenPort:
    return JwtTokenAdapter()


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


def get_held_rooms_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetHeldRoomsUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return GetHeldRoomsUseCase(repo)


def get_create_cart_booking_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> CreateCartBookingUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return CreateCartBookingUseCase(repo)


def get_list_my_bookings_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> ListMyBookingsUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return ListMyBookingsUseCase(repo)


def get_booking_detail_use_case(
    session: AsyncSession = Depends(get_db_session),
) -> GetBookingDetailUseCase:
    repo = SqlAlchemyBookingRepository(session)
    return GetBookingDetailUseCase(repo)
