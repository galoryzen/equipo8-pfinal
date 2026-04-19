from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingStatus


class SqlAlchemyBookingRepository(BookingRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_user_id(self, user_id: UUID) -> list[Booking]:
        stmt = select(Booking).where(Booking.user_id == user_id).order_by(Booking.checkin.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id, Booking.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def create(self, booking: Booking) -> Booking:
        self._session.add(booking)
        await self._session.commit()
        await self._session.refresh(booking)
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
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
                Booking.checkin == checkin,
                Booking.checkout == checkout,
                Booking.room_type_id == room_type_id,
                Booking.rate_plan_id == rate_plan_id,
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def find_any_active_cart_for_user(self, user_id: UUID) -> Booking | None:
        now = datetime.now(UTC).replace(tzinfo=None)
        stmt = (
            select(Booking)
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def find_expired_carts(self, now: datetime) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.status == BookingStatus.CART,
            Booking.hold_expires_at.is_not(None),
            Booking.hold_expires_at < now,
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_unreleased_terminal_bookings(self) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.status.in_((BookingStatus.CANCELLED, BookingStatus.EXPIRED)),
            Booking.inventory_released.is_(False),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
