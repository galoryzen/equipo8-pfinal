from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class RevenuePeriodAggregate:
    total_revenue: Decimal
    sold_room_nights: float
    occupied_room_nights: float
    capacity_room_nights: float
    has_activity: bool
    currency_code: str | None


@dataclass(frozen=True)
class RevenueTrendPoint:
    day: date
    revenue: Decimal
    occupancy_rate: float


@dataclass(frozen=True)
class RevenueByRoomTypePoint:
    room_type: str
    units_sold: int
    avg_rate: Decimal
    total_revenue: Decimal


class RevenueReportRepository(ABC):
    @abstractmethod
    async def aggregate_hotel_period(
        self,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
        *,
        period_end_exclusive: date,
    ) -> RevenuePeriodAggregate:
        """Aggregate KPI inputs for one hotel and one reporting window."""

    @abstractmethod
    async def list_revenue_trends(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[RevenueTrendPoint]:
        """Return one row per day in range with revenue and occupancy rate."""

    @abstractmethod
    async def list_revenue_by_room_type(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[RevenueByRoomTypePoint]:
        """Return captured revenue breakdown grouped by room type."""
