from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingItem, BookingStatus


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

    async def create(self, booking: Booking) -> Booking:
        self._session.add(booking)
        await self._session.commit()
        await self._session.refresh(booking, attribute_names=["items"])
        return booking

    async def save(self, booking: Booking) -> None:
        await self._session.merge(booking)
        await self._session.commit()

    async def find_active_cart(
        self,
        user_id: UUID,
        room_type_id: UUID,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> Booking | None:
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — column is TIMESTAMP WITHOUT TIME ZONE
        stmt = (
            select(Booking)
            .join(Booking.items)
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
                Booking.checkin == checkin,
                Booking.checkout == checkout,
                BookingItem.room_type_id == room_type_id,
                BookingItem.rate_plan_id == rate_plan_id,
            )
            .options(selectinload(Booking.items))
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().unique().one_or_none()

    async def find_held_room_type_ids(
        self,
        property_id: UUID,
        checkin: date,
        checkout: date,
    ) -> list[UUID]:
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — column is TIMESTAMP WITHOUT TIME ZONE
        stmt = (
            select(BookingItem.room_type_id)
            .join(BookingItem.booking)
            .where(
                BookingItem.property_id == property_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
                Booking.checkin < checkout,   # standard interval overlap: starts before requested end
                Booking.checkout > checkin,   # standard interval overlap: ends after requested start
            )
            .distinct()
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
