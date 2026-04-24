"""Pure helpers for revenue report KPIs (unit-test friendly boundary)."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class RevenueKpiRaw:
    total_revenue: Decimal
    sold_room_nights: float
    occupied_room_nights: float
    capacity_room_nights: float
    has_activity: bool


def _safe_pct_variation(
    current: float,
    previous: float,
    *,
    previous_has_activity: bool,
) -> float:
    """Percent change vs previous period; returns 0 when previous period has no data."""
    if not previous_has_activity:
        return 0.0
    if previous == 0.0:
        return 100.0 if current > 0.0 else 0.0
    return round((current - previous) / previous * 100.0, 4)


def _safe_occupancy_percent(occupied_room_nights: float, capacity_room_nights: float) -> float:
    """Occupancy percent in [0, 100], clamped and division-by-zero safe."""
    denom = max(1.0, float(capacity_room_nights))
    ratio = min(1.0, max(0.0, float(occupied_room_nights) / denom))
    return round(ratio * 100.0, 4)


def _safe_adr(total_revenue: Decimal, sold_room_nights: float) -> float:
    denom = float(sold_room_nights)
    if denom <= 0.0:
        return 0.0
    return round(float(total_revenue) / denom, 4)


def build_revenue_report_kpis(current: RevenueKpiRaw, previous: RevenueKpiRaw) -> dict:
    """Shape report KPI payload from two windows (current and equivalent previous)."""
    cur_total_revenue = float(current.total_revenue)
    prev_total_revenue = float(previous.total_revenue)

    cur_adr = _safe_adr(current.total_revenue, current.sold_room_nights)
    prev_adr = _safe_adr(previous.total_revenue, previous.sold_room_nights)

    cur_occupancy = _safe_occupancy_percent(
        current.occupied_room_nights, current.capacity_room_nights
    )
    prev_occupancy = _safe_occupancy_percent(
        previous.occupied_room_nights, previous.capacity_room_nights
    )

    return {
        "totalRevenue": {
            "value": round(cur_total_revenue, 4),
            "variation": _safe_pct_variation(
                cur_total_revenue,
                prev_total_revenue,
                previous_has_activity=previous.has_activity,
            ),
        },
        "adr": {
            "value": cur_adr,
            "variation": _safe_pct_variation(
                cur_adr,
                prev_adr,
                previous_has_activity=previous.has_activity,
            ),
        },
        "occupancyRate": {
            "value": cur_occupancy,
            "variation": _safe_pct_variation(
                cur_occupancy,
                prev_occupancy,
                previous_has_activity=previous.has_activity,
            ),
        },
    }
