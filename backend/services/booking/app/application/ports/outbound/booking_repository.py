from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from app.domain.models import Booking, BookingScope, BookingStatus, BookingStatusHistory


class BookingRepository(ABC):
    @abstractmethod
    async def list_by_user_id(
        self,
        user_id: UUID,
        *,
        scope: BookingScope = BookingScope.ALL,
        status: str | None = None,
        today: date | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Booking], int]:
        """Return (bookings_page, total_count) for a user filtered by scope.

        - ACTIVE: status in (CONFIRMED, CHECKED_IN, PENDING_PAYMENT, PENDING_CONFIRMATION)
          AND checkout >= today. Ordered by checkin ASC (upcoming first).
        - PAST: (status in (CONFIRMED, CHECKED_IN) AND checkout < today)
          OR status in (CANCELLED, REJECTED). Ordered by checkout DESC.
        - ALL: everything except CART and EXPIRED. Ordered by checkin DESC.
        - If status is provided, it further filters by exact status (e.g. "CART").
        Pagination is applied at the DB level via LIMIT/OFFSET.
        """

    @abstractmethod
    async def list_all(
        self, status: str | None = None, page: int = 1, page_size: int = 10
    ) -> tuple[list[Booking], int]:
        """Return (bookings_page, total_count) for all bookings, optionally filtered by status."""

    @abstractmethod
    async def list_by_hotel(
        self,
        hotel_id: UUID,
        *,
        status: str | BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        room_type_id: UUID | None = None,
        q: str | None = None,
        page: int = 1,
        page_size: int | None = 10,
    ) -> tuple[list[Booking], int]:
        """Return (bookings_page, total_count) for a hotel's properties.

        Optional filters apply only when provided (AND semantics).
        Stay dates use overlap semantics when both ``date_from`` and ``date_to``
        are set: ``checkin <= date_to`` and ``checkout >= date_from``.
        When only one bound is set, it constrains the corresponding edge.
        ``page_size`` None disables pagination (all matching rows).
        """

    @abstractmethod
    async def count_hotel_bookings_metrics(self, hotel_id: UUID, *, today: date) -> dict[str, int]:
        """Aggregate counts for the hotel portal Bookings tab (not paginated).

        Keys: ``confirmed_count``, ``pending_count``, ``check_ins_today_count``,
        ``cancelled_count``. Scoped to properties owned by ``hotel_id``.
        """

    @abstractmethod
    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        """Return booking if it exists and belongs to user_id."""

    @abstractmethod
    async def get_by_id_for_hotel(self, booking_id: UUID, hotel_id: UUID) -> Booking | None:
        """Return booking if it exists and belongs to a property owned by hotel_id."""

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
    async def find_expired_unpaid_bookings(self, now: datetime) -> list[Booking]:
        """Return CART or PENDING_PAYMENT bookings whose hold_expires_at has elapsed."""

    @abstractmethod
    async def find_unreleased_terminal_bookings(self) -> list[Booking]:
        """Return CANCELLED/EXPIRED bookings whose inventory hold has not yet been released."""

    @abstractmethod
    async def add_status_history(self, row: BookingStatusHistory) -> None:
        """Persist a new row in booking_status_history."""

    @abstractmethod
    async def save_and_record_status_history(
        self, booking: Booking, row: BookingStatusHistory
    ) -> None:
        """Persist booking changes and the status history row in a single transaction."""

    @abstractmethod
    async def find_last_status_history_by_reason(
        self, booking_id: UUID, reason: str
    ) -> BookingStatusHistory | None:
        """Return the most recent history row for this booking matching reason exactly, or None."""

    @abstractmethod
    async def find_last_status_history_by_reason_prefix(
        self, booking_id: UUID, reason_prefix: str
    ) -> BookingStatusHistory | None:
        """Return the most recent history row whose reason starts with prefix, or None."""

    @abstractmethod
    async def get_property_stats(self, property_id: UUID) -> dict:
        """Return active booking count and current-month revenue for a property.

        Returns a dict with keys: active_bookings (int), monthly_revenue (float).
        Active bookings = CONFIRMED or CHECKED_IN bookings where checkout >= today.
        Monthly revenue = sum of total_amount for CONFIRMED/CHECKED_IN bookings created this month.
        """
