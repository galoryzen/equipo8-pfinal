"""SqlAlchemyPropertyRepository.search — smoke tests with mocked session."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

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
