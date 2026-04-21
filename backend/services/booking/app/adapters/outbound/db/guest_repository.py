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
