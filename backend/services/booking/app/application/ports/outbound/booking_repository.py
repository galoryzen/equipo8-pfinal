from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Booking


class BookingRepository(ABC):
    @abstractmethod
    async def list_by_user_id(self, user_id: UUID) -> list[Booking]:
        """Return all bookings for the user, with items loaded."""

    @abstractmethod
    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        """Return booking with items if it exists and belongs to user_id."""
