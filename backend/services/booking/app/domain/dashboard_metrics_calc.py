"""Pure helpers for hotel dashboard metrics (unit-tested, cache-ready boundary)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal


def inclusive_days(date_from: date, date_to: date) -> int:
    if date_to < date_from:
        return 0
    return (date_to - date_from).days + 1


def previous_equivalent_range(date_from: date, date_to: date) -> tuple[date, date]:
    """Return the inclusive date range immediately before ``date_from`` with the same length."""
    span = inclusive_days(date_from, date_to)
    if span <= 0:
        return date_from, date_to
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=span - 1)
    return prev_from, prev_to


def pct_variation(current: float, previous: float) -> float:
    """Percent change vs previous period; handles zero / near-zero previous."""
    if previous == 0.0:
        return 100.0 if current > 0.0 else 0.0
    return round((current - previous) / previous * 100.0, 4)


def occupancy_rate(confirmed_room_nights: float, capacity_room_nights: float) -> float:
    """Occupancy in [0, 1]; ``capacity_room_nights`` must be >= 1 to avoid division by zero."""
    denom = max(1.0, float(capacity_room_nights))
    return min(1.0, max(0.0, float(confirmed_room_nights) / denom))


@dataclass(frozen=True)
class PeriodRawMetrics:
    total_bookings: int
    confirmed_room_nights: float
    revenue_captured: Decimal
    avg_rating: float | None
    capacity_room_nights: float


def build_dashboard_metrics(
    current: PeriodRawMetrics,
    previous: PeriodRawMetrics,
) -> dict:
    """Shape API payload ``metrics`` object from two windows (no I/O)."""
    cur_occ = occupancy_rate(current.confirmed_room_nights, current.capacity_room_nights)
    prev_occ = occupancy_rate(previous.confirmed_room_nights, previous.capacity_room_nights)

    cur_rating = current.avg_rating
    prev_rating = previous.avg_rating

    def rating_variation() -> float:
        if cur_rating is None and prev_rating is None:
            return 0.0
        if prev_rating is None or prev_rating == 0.0:
            return 100.0 if (cur_rating or 0.0) > 0.0 else 0.0
        if cur_rating is None:
            cur = 0.0
        else:
            cur = cur_rating
        return pct_variation(cur, prev_rating)

    return {
        "totalBookings": {
            "value": current.total_bookings,
            "variation": pct_variation(float(current.total_bookings), float(previous.total_bookings)),
        },
        "revenue": {
            "value": float(current.revenue_captured),
            "variation": pct_variation(
                float(current.revenue_captured), float(previous.revenue_captured)
            ),
        },
        "occupancyRate": {
            "value": round(cur_occ * 100.0, 4),
            "variation": round(pct_variation(cur_occ * 100.0, prev_occ * 100.0), 4),
        },
        "averageRating": {
            "value": cur_rating,
            "variation": round(rating_variation(), 4),
        },
    }
