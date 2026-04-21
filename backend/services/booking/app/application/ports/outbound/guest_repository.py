from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Guest


class GuestRepository(ABC):
    @abstractmethod
    async def list_by_booking(self, booking_id: UUID) -> list[Guest]:
        """Return guests for a booking, ordered by primary first then full_name."""

    @abstractmethod
    async def replace_guests_for_booking(
        self, booking_id: UUID, guests: list[Guest]
    ) -> list[Guest]:
        """Replace all guests for a booking atomically (delete existing, insert new)."""
