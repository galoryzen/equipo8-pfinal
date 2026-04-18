from datetime import date
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import InsufficientInventoryError
from app.application.ports.outbound.inventory_repository import InventoryRepository
from app.domain.models import InventoryCalendar


class SqlAlchemyInventoryRepository(InventoryRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        nights = (checkout - checkin).days
        if nights <= 0:
            # Defensive: should be caught by request validation, but avoids no-op silent success.
            raise InsufficientInventoryError(room_type_id)

        stmt = (
            update(InventoryCalendar)
            .where(
                InventoryCalendar.room_type_id == room_type_id,
                InventoryCalendar.day >= checkin,
                InventoryCalendar.day < checkout,
                InventoryCalendar.available_units > 0,
            )
            .values(available_units=InventoryCalendar.available_units - 1)
        )
        result = await self._session.execute(stmt)
        if result.rowcount != nights:
            # At least one day in the range lacks capacity; rollback the partial decrement.
            await self._session.rollback()
            raise InsufficientInventoryError(room_type_id)
        await self._session.commit()

    async def release_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        stmt = (
            update(InventoryCalendar)
            .where(
                InventoryCalendar.room_type_id == room_type_id,
                InventoryCalendar.day >= checkin,
                InventoryCalendar.day < checkout,
            )
            .values(available_units=InventoryCalendar.available_units + 1)
        )
        await self._session.execute(stmt)
        await self._session.commit()
