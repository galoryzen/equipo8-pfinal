from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID


class InventoryRepository(ABC):
    @abstractmethod
    async def create_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        """Decrement available_units by 1 for every day in [checkin, checkout).

        Raises InsufficientInventoryError if any day in the range lacks capacity;
        rolls back any partial decrements before raising.
        """

    @abstractmethod
    async def release_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        """Increment available_units by 1 for every day in [checkin, checkout)."""
