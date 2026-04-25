"""SqlAlchemyPropertyRepository.search — smoke tests with mocked session."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql

from app.adapters.outbound.db.property_repository import SqlAlchemyPropertyRepository


@pytest.mark.asyncio
async def test_search_returns_empty_when_count_is_zero():
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[count_result, rows_result])

    repo = SqlAlchemyPropertyRepository(session)
    items, total = await repo.search(
        checkin=date(2026, 4, 1),
        checkout=date(2026, 4, 3),
        guests=2,
        city_id=uuid4(),
    )

    assert total == 0
    assert items == []
    assert session.execute.await_count == 2


@pytest.mark.asyncio
async def test_search_sql_requires_single_room_capacity_at_least_guests():
    """1 booking = 1 room_type → search filters by capacity >= guests, not SUM.

    The generated SQL must check `room_type.capacity >= <guests>` directly, not a
    sum of capacities across room types.
    """
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[count_result, rows_result])

    repo = SqlAlchemyPropertyRepository(session)
    guests_threshold = 7
    await repo.search(
        checkin=date(2026, 4, 1),
        checkout=date(2026, 4, 3),
        guests=guests_threshold,
        city_id=None,
    )

    first_stmt = session.execute.await_args_list[0].args[0]
    sql = str(
        first_stmt.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    lower = sql.lower()
    assert f"capacity >= {guests_threshold}" in lower
    # And no SUM-based capacity aggregation
    assert "sum(" not in lower or "capacity" not in lower.split("sum(", 1)[1].split(")", 1)[0]


@pytest.mark.asyncio
async def test_search_min_price_is_avg_of_cheapest_full_stay():
    """Search ``min_price`` is ``MIN(stay total) / nights``, not the cheapest single night.

    Pre-fix behavior was ``MIN(effective_price)`` over all (rate_plan, day) rows in the
    window — so a property with nights at $140 and $150 surfaced as $140/night yet
    booked at $290 total. Lock in the new shape: SUM of per-night effective prices
    grouped per rate plan, HAVING full date coverage, MIN across plans, divided by
    nights at the SQL level.
    """
    session = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.unique.return_value.all.return_value = []
    session.execute = AsyncMock(side_effect=[count_result, rows_result])

    repo = SqlAlchemyPropertyRepository(session)
    nights = 2
    await repo.search(
        checkin=date(2026, 5, 1),
        checkout=date(2026, 5, 3),
        guests=2,
        city_id=None,
    )

    first_stmt = session.execute.await_args_list[0].args[0]
    sql = str(
        first_stmt.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    lower = sql.lower()
    # Three-level aggregation markers — the SUM of effective prices, the HAVING that
    # drops rate plans missing nights, and the divide-by-nights for per-night display.
    assert "sum(best_per_day_sq.eff)" in lower
    assert "sum(best_per_day_sq.base)" in lower
    assert f"having count(best_per_day_sq.day) = {nights}" in lower
    # Postgres dialect wraps the divisor in a cast — match the prefix and the literal.
    assert "min(stay_total_sq.sum_eff) /" in lower
    assert f"as numeric(12, 2)) as min_price" in lower or f"/ {nights}" in lower
