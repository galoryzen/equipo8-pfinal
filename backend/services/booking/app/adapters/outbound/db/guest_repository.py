from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import Guest


class SqlAlchemyGuestRepository(GuestRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_booking(self, booking_id: UUID) -> list[Guest]:
        stmt = (
            select(Guest)
            .where(Guest.booking_id == booking_id)
            .order_by(Guest.is_primary.desc(), Guest.full_name.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_primary_names_for_bookings(self, booking_ids: list[UUID]) -> dict[UUID, str]:
        if not booking_ids:
            return {}

        # Best-effort: pick the first row per booking ordered by is_primary desc then name.
        # Works on PostgreSQL via DISTINCT ON semantics.
        stmt = (
            select(Guest.booking_id, Guest.full_name)
            .where(Guest.booking_id.in_(booking_ids))
            .order_by(Guest.booking_id.asc(), Guest.is_primary.desc(), Guest.full_name.asc())
            .distinct(Guest.booking_id)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return {booking_id: full_name for booking_id, full_name in rows if full_name}

    async def replace_guests_for_booking(
        self, booking_id: UUID, guests: list[Guest]
    ) -> list[Guest]:
        await self._session.execute(
            delete(Guest).where(Guest.booking_id == booking_id)
        )
        for guest in guests:
            self._session.add(guest)
        await self._session.commit()
        return await self.list_by_booking(booking_id)
