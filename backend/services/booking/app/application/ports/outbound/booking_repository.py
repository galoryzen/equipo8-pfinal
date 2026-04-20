from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from app.domain.models import Booking, BookingScope


class BookingRepository(ABC):
    @abstractmethod
    async def list_by_user_id(
        self,
        user_id: UUID,
        *,
        scope: BookingScope = BookingScope.ALL,
        today: date | None = None,
    ) -> list[Booking]:
        """Return user bookings filtered by scope relative to ``today``.

        - ACTIVE: status in (CONFIRMED, PENDING_PAYMENT, PENDING_CONFIRMATION)
          AND checkout >= today. Ordered by checkin ASC (upcoming first).
        - PAST: (status = CONFIRMED AND checkout < today)
          OR status in (CANCELLED, REJECTED). Ordered by checkout DESC.
        - ALL: everything except CART and EXPIRED. Ordered by checkin DESC.
        """
    
    @abstractmethod
    async def list_all(self, status: str | None = None) -> list[Booking]:
        """Return all bookings in the system, optionally filtered by status."""

    @abstractmethod
    async def list_by_hotel(self, hotel_id: UUID, status: str | None = None) -> list[Booking]:
        """Return all bookings for a hotel, optionally filtered by status."""

    @abstractmethod
    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        """Return booking if it exists and belongs to user_id."""

    @abstractmethod
    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        """Return booking by id (internal/service use — no ownership filter)."""

    @abstractmethod
    async def create(self, booking: Booking) -> Booking:
        """Persist a new booking and return the refreshed instance."""

    @abstractmethod
    async def save(self, booking: Booking) -> None:
        """Merge and persist changes to an existing booking."""

    @abstractmethod
    async def update(self, booking: Booking) -> None:
        """Update booking in the database."""

    @abstractmethod
    async def check_inventory(self, booking: Booking) -> bool:
        """Check if there is enough inventory to confirm the booking."""

    @abstractmethod
    async def decrement_inventory(self, booking: Booking) -> None:
        """Decrement inventory for the confirmed booking."""

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
    async def find_any_active_cart_for_user(self, user_id: UUID) -> Booking | None:
        """Return any active (non-expired) CART booking for the user, or None.

        Used to enforce the one-cart-at-a-time rule regardless of room/dates.
        """

    @abstractmethod
    async def find_expired_carts(self, now: datetime) -> list[Booking]:
        """Return CART bookings whose hold_expires_at has elapsed."""

    @abstractmethod
    async def find_unreleased_terminal_bookings(self) -> list[Booking]:
        """Return CANCELLED/EXPIRED bookings whose inventory hold has not yet been released."""
