from datetime import date
from decimal import Decimal

import pytest

from app.domain.dashboard_metrics_calc import (
    PeriodRawMetrics,
    build_dashboard_metrics,
    inclusive_days,
    occupancy_rate,
    pct_variation,
    previous_equivalent_range,
)


def test_inclusive_days():
    assert inclusive_days(date(2026, 1, 1), date(2026, 1, 1)) == 1
    assert inclusive_days(date(2026, 1, 1), date(2026, 1, 7)) == 7
    assert inclusive_days(date(2026, 1, 10), date(2026, 1, 3)) == 0


def test_previous_equivalent_range():
    p_from, p_to = previous_equivalent_range(date(2026, 1, 10), date(2026, 1, 16))
    assert p_from == date(2026, 1, 3)
    assert p_to == date(2026, 1, 9)


def test_pct_variation_basic():
    assert pct_variation(150.0, 100.0) == 50.0
    assert pct_variation(50.0, 100.0) == -50.0


def test_pct_variation_zero_previous():
    assert pct_variation(0.0, 0.0) == 0.0
    assert pct_variation(10.0, 0.0) == 100.0


def test_occupancy_rate_caps_and_floor():
    assert occupancy_rate(5.0, 10.0) == 0.5
    assert occupancy_rate(0.0, 0.0) == 0.0
    assert occupancy_rate(99.0, 1.0) == 1.0


def test_build_dashboard_metrics_empty_previous():
    cur = PeriodRawMetrics(
        total_bookings=2,
        confirmed_room_nights=4.0,
        revenue_captured=Decimal("200.00"),
        avg_rating=4.5,
        capacity_room_nights=10.0,
    )
    prev = PeriodRawMetrics(
        total_bookings=0,
        confirmed_room_nights=0.0,
        revenue_captured=Decimal("0"),
        avg_rating=None,
        capacity_room_nights=10.0,
    )
    out = build_dashboard_metrics(cur, prev)
    assert out["totalBookings"]["value"] == 2
    assert out["totalBookings"]["variation"] == 100.0
    assert out["revenue"]["variation"] == 100.0
    assert out["occupancyRate"]["value"] == 40.0
    assert out["averageRating"]["value"] == 4.5


def test_build_dashboard_metrics_rating_both_none():
    cur = PeriodRawMetrics(0, 0.0, Decimal("0"), None, 7.0)
    prev = PeriodRawMetrics(0, 0.0, Decimal("0"), None, 7.0)
    out = build_dashboard_metrics(cur, prev)
    assert out["averageRating"]["value"] is None
    assert out["averageRating"]["variation"] == 0.0


@pytest.mark.parametrize(
    ("cur", "prev", "expected_var"),
    [
        (5.0, 4.0, 25.0),
        (None, 4.0, -100.0),
    ],
)
def test_build_dashboard_rating_variation(cur, prev, expected_var):
    current = PeriodRawMetrics(1, 1.0, Decimal("1"), cur, 10.0)
    previous = PeriodRawMetrics(1, 1.0, Decimal("1"), prev, 10.0)
    out = build_dashboard_metrics(current, previous)
    assert out["averageRating"]["variation"] == pytest.approx(expected_var)
