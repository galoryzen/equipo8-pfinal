"""Pure helpers for hotel occupancy metrics (calendar, breakdown, projection)."""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta


def occupancy_level(rate_percent: float) -> str:
    """HIGH >80, MEDIUM 50–80 inclusive, LOW <50."""
    if rate_percent > 80:
        return "HIGH"
    if rate_percent >= 50:
        return "MEDIUM"
    return "LOW"


def occupancy_rate_percent(occupied: int, total_rooms: int) -> float:
    if total_rooms <= 0:
        return 0.0
    return round((occupied / total_rooms) * 100.0, 1)


def stay_overlaps_day(checkin: date, checkout: date, day: date) -> bool:
    """Hotel night rule: count day D iff checkin <= D < checkout (checkout day excluded)."""
    return checkin <= day < checkout


@dataclass(frozen=True)
class LowOccupancyPeriod:
    date_from: date
    date_to: date
    average_occupancy_rate: float


def merge_low_occupancy_periods(
    daily_rates: Iterable[tuple[date, float]],
    *,
    low_threshold: float = 50.0,
) -> list[LowOccupancyPeriod]:
    """Group consecutive dates where projected occupancy is strictly below threshold."""
    sorted_days = sorted(daily_rates, key=lambda x: x[0])
    periods: list[LowOccupancyPeriod] = []
    run_start: date | None = None
    run_end: date | None = None
    run_rates: list[float] = []

    for d, rate in sorted_days:
        if rate >= low_threshold:
            if run_start is not None and run_end is not None and run_rates:
                periods.append(
                    LowOccupancyPeriod(
                        date_from=run_start,
                        date_to=run_end,
                        average_occupancy_rate=round(sum(run_rates) / len(run_rates), 1),
                    )
                )
            run_start = None
            run_end = None
            run_rates = []
            continue
        if run_start is None:
            run_start = d
            run_end = d
            run_rates = [rate]
        elif d == run_end + timedelta(days=1):
            run_end = d
            run_rates.append(rate)
        else:
            periods.append(
                LowOccupancyPeriod(
                    date_from=run_start,
                    date_to=run_end,
                    average_occupancy_rate=round(sum(run_rates) / len(run_rates), 1),
                )
            )
            run_start = d
            run_end = d
            run_rates = [rate]

    if run_start is not None and run_end is not None and run_rates:
        periods.append(
            LowOccupancyPeriod(
                date_from=run_start,
                date_to=run_end,
                average_occupancy_rate=round(sum(run_rates) / len(run_rates), 1),
            )
        )
    return periods
