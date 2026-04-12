"""Rating source: list/search uses same aggregate rules as property detail (review table)."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.property_repository import (
    SqlAlchemyPropertyRepository,
    _quantize_avg_from_raw,
)


def test_quantize_avg_matches_detail_endpoint_rules():
    """Same AVG + quantize(2) + HALF_UP as get_review_stats (e.g. 14/3 → 4.67)."""
    avg_raw = float(Decimal("14") / Decimal("3"))
    q, n = _quantize_avg_from_raw(avg_raw, 3)
    assert n == 3
    assert q == Decimal("4.67")


def test_quantize_avg_none_when_no_reviews():
    assert _quantize_avg_from_raw(None, 0) == (None, 0)


@pytest.mark.asyncio
async def test_review_stats_map_batches_and_fills_missing_with_zero():
    pid_a = uuid4()
    pid_b = uuid4()
    row_a = (pid_a, 5.0, 2)

    result_rows = MagicMock()
    result_rows.all.return_value = [row_a]

    session = AsyncMock()
    session.execute = AsyncMock(return_value=result_rows)

    repo = SqlAlchemyPropertyRepository(session)
    m = await repo._review_stats_map([pid_a, pid_b])

    assert m[pid_a] == (Decimal("5.00"), 2)
    assert m[pid_b] == (None, 0)
