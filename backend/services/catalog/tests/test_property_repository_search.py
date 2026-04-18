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
