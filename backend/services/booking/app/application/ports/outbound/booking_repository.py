from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from app.domain.models import Booking


class BookingRepository(ABC):
    @abstractmethod
    async def list_by_user_id(self, user_id: UUID) -> list[Booking]:
        """Return all bookings for the user."""

    @abstractmethod
    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        """Return booking if it exists and belongs to user_id."""

    @abstractmethod
    async def create(self, booking: Booking) -> Booking:
        """Persist a new booking and return the refreshed instance."""

    @abstractmethod
    async def save(self, booking: Booking) -> None:
        """Merge and persist changes to an existing booking."""

    @abstractmethod
    async def find_active_cart(
        self,
        user_id: UUID,
        room_type_id: UUID,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> Booking | None:
        """Return an active CART booking for the same user/room/dates, or None."""

    @abstractmethod
    async def find_held_room_type_ids(
        self,
        property_id: UUID,
        checkin: date,
        checkout: date,
    ) -> list[UUID]:
        """Return room_type_ids that have an active (non-expired) CART hold overlapping the dates."""
