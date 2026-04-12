from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking


class SqlAlchemyBookingRepository(BookingRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_user_id(self, user_id: UUID) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .options(selectinload(Booking.items))
            .order_by(Booking.checkin.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        stmt = (
            select(Booking)
            .where(Booking.id == booking_id, Booking.user_id == user_id)
            .options(selectinload(Booking.items))
        )
        result = await self._session.execute(stmt)
        return result.scalars().unique().one_or_none()
