"""Unit tests for occupancy_calc helpers."""

from datetime import date

import pytest

from app.domain.occupancy_calc import (
    merge_low_occupancy_periods,
    occupancy_level,
    occupancy_rate_percent,
    stay_overlaps_day,
)


@pytest.mark.parametrize(
    ("rate", "expected"),
    [
        (80.0, "MEDIUM"),
        (80.1, "HIGH"),
        (81.0, "HIGH"),
        (49.9, "LOW"),
        (50.0, "MEDIUM"),
        (0.0, "LOW"),
    ],
)
def test_occupancy_level_buckets(rate, expected):
    assert occupancy_level(rate) == expected


def test_occupancy_rate_percent_zero_total():
    assert occupancy_rate_percent(3, 0) == 0.0


def test_occupancy_rate_percent_rounding():
    assert occupancy_rate_percent(1, 3) == 33.3


def test_stay_overlap_excludes_checkout_day():
    assert stay_overlaps_day(date(2026, 6, 1), date(2026, 6, 5), date(2026, 6, 4)) is True
    assert stay_overlaps_day(date(2026, 6, 1), date(2026, 6, 5), date(2026, 6, 5)) is False


def test_merge_low_periods_groups_consecutive():
    periods = merge_low_occupancy_periods(
        [
            (date(2026, 5, 10), 40.0),
            (date(2026, 5, 11), 41.0),
            (date(2026, 5, 13), 30.0),
        ],
        low_threshold=50.0,
    )
    assert len(periods) == 2
    assert periods[0].date_from == date(2026, 5, 10)
    assert periods[0].date_to == date(2026, 5, 11)
    assert periods[0].average_occupancy_rate == 40.5
    assert periods[1].date_from == date(2026, 5, 13)
    assert periods[1].date_to == date(2026, 5, 13)
