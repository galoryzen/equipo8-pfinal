from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class HotelPeriodAggregate:
    total_bookings: int
    confirmed_room_nights: float
    active_room_nights: float
    revenue_captured: Decimal
    avg_rating: float | None
    capacity_room_nights: float


@dataclass(frozen=True)
class BookingTrendPoint:
    day: date
    bookings: int


@dataclass(frozen=True)
class RecentActivityItem:
    activity_type: str
    description: str
    occurred_at: str


@dataclass(frozen=True)
class UpcomingCheckinItem:
    guest: str
    room_type: str
    checkin: date
    checkout: date
    status: str
    amount: Decimal


class DashboardMetricsRepository(ABC):
    @abstractmethod
    async def aggregate_hotel_period(
        self,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
        *,
        period_end_exclusive: date,
    ) -> HotelPeriodAggregate:
        """Aggregate dashboard inputs for one hotel and one stay/payment window.

        ``period_end_exclusive`` is ``date_to + 1 day`` (checkout-exclusive overlap rule).
        """

    @abstractmethod
    async def count_active_cancellations(
        self, hotel_id: UUID, date_from: date, *, period_end_exclusive: date
    ) -> int:
        """Return cancelled bookings overlapping the requested window."""

    @abstractmethod
    async def list_booking_trends(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[BookingTrendPoint]:
        """Return bookings grouped by check-in day within the requested window."""

    @abstractmethod
    async def list_recent_activity(
        self, hotel_id: UUID, date_from: date, date_to: date, *, limit: int = 10
    ) -> list[RecentActivityItem]:
        """Return latest activity rows for dashboard timeline."""

    @abstractmethod
    async def list_upcoming_checkins(
        self, hotel_id: UUID, *, limit: int = 10
    ) -> list[UpcomingCheckinItem]:
        """Return next check-ins for hotel properties ordered by check-in date."""
