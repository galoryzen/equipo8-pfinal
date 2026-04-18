"""SqlAlchemyInventoryRepository — adapter tests with mocked session.

The race-condition guarantee lives in the single-UPDATE atomic `WHERE available_units > 0`
filter; these tests verify the adapter's contract (rollback + raise on partial cover,
commit on full cover). A true multi-process race test against a real Postgres is
covered by the docker-compose verification in the plan.
"""

from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.inventory_repository import SqlAlchemyInventoryRepository
from app.application.exceptions import InsufficientInventoryError


def _session_with_rowcount(n: int) -> AsyncMock:
    session = AsyncMock()
    result = MagicMock()
    result.rowcount = n
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


class TestCreateHold:
    @pytest.mark.asyncio
    async def test_commits_when_all_days_have_capacity(self):
        session = _session_with_rowcount(3)
        repo = SqlAlchemyInventoryRepository(session)

        await repo.create_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

        session.execute.assert_awaited_once()
        session.commit.assert_awaited_once()
        session.rollback.assert_not_called()

    @pytest.mark.asyncio
    async def test_rolls_back_and_raises_when_partial_cover(self):
        # 3 nights requested but UPDATE affected only 2 rows (one day at 0 units)
        session = _session_with_rowcount(2)
        repo = SqlAlchemyInventoryRepository(session)

        room_id = uuid4()
        with pytest.raises(InsufficientInventoryError):
            await repo.create_hold(room_id, date(2026, 6, 1), date(2026, 6, 4))

        session.rollback.assert_awaited_once()
        session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_rolls_back_and_raises_when_no_rows_affected(self):
        session = _session_with_rowcount(0)
        repo = SqlAlchemyInventoryRepository(session)

        with pytest.raises(InsufficientInventoryError):
            await repo.create_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 2))

        session.rollback.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_rejects_non_positive_range(self):
        session = _session_with_rowcount(0)
        repo = SqlAlchemyInventoryRepository(session)

        with pytest.raises(InsufficientInventoryError):
            await repo.create_hold(uuid4(), date(2026, 6, 4), date(2026, 6, 4))


class TestReleaseHold:
    @pytest.mark.asyncio
    async def test_single_update_then_commit(self):
        session = _session_with_rowcount(3)
        repo = SqlAlchemyInventoryRepository(session)

        await repo.release_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

        session.execute.assert_awaited_once()
        session.commit.assert_awaited_once()
        session.rollback.assert_not_called()

    @pytest.mark.asyncio
    async def test_is_noop_safe_when_no_rows(self):
        # e.g. release called after inventory rows were archived / never existed
        session = _session_with_rowcount(0)
        repo = SqlAlchemyInventoryRepository(session)

        await repo.release_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

        session.execute.assert_awaited_once()
        session.commit.assert_awaited_once()
