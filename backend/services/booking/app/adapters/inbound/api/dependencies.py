from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Cookie, Depends, Header
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.adapters.outbound.db.session import async_session
from app.application.exceptions import InvalidTokenError
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.config import settings


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_current_user_id(
    authorization: str | None = Header(None),
    access_token: str | None = Cookie(default=None),
) -> UUID:
    raw: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
    elif access_token:
        raw = access_token
    if not raw:
        raise InvalidTokenError("Authentication required")

    try:
        payload = jwt.decode(raw, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise InvalidTokenError("Invalid or expired token") from e

    sub = payload.get("sub") if payload else None
    if not sub:
        raise InvalidTokenError("Invalid token payload")

    try:
        return UUID(str(sub))
    except ValueError as e:
        raise InvalidTokenError("Invalid subject in token") from e


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
