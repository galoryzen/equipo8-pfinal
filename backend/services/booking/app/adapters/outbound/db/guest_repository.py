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
        contacts = await self.get_primary_contact_for_bookings(booking_ids)
        return {bid: name for bid, (name, _) in contacts.items() if name}

    async def get_primary_contact_for_bookings(
        self, booking_ids: list[UUID]
    ) -> dict[UUID, tuple[str | None, str | None]]:
        if not booking_ids:
            return {}

        stmt = (
            select(Guest.booking_id, Guest.full_name, Guest.email)
            .where(Guest.booking_id.in_(booking_ids))
            .order_by(Guest.booking_id.asc(), Guest.is_primary.desc(), Guest.full_name.asc())
            .distinct(Guest.booking_id)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return {bid: (name, email) for bid, name, email in rows}

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
