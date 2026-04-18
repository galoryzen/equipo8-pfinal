"""Unit tests for inventory hold use cases — mock the repo port."""

from datetime import date
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.exceptions import InsufficientInventoryError
from app.application.ports.outbound.inventory_repository import InventoryRepository
from app.application.use_cases.create_inventory_hold import CreateInventoryHoldUseCase
from app.application.use_cases.release_inventory_hold import ReleaseInventoryHoldUseCase


@pytest.fixture
def mock_inventory_repo():
    return AsyncMock(spec=InventoryRepository)


class TestCreateInventoryHoldUseCase:
    async def test_delegates_to_repo(self, mock_inventory_repo):
        room_id = uuid4()
        checkin = date(2026, 6, 1)
        checkout = date(2026, 6, 4)
        uc = CreateInventoryHoldUseCase(mock_inventory_repo)

        await uc.execute(room_type_id=room_id, checkin=checkin, checkout=checkout)

        mock_inventory_repo.create_hold.assert_awaited_once_with(room_id, checkin, checkout)

    async def test_propagates_insufficient_inventory(self, mock_inventory_repo):
        mock_inventory_repo.create_hold.side_effect = InsufficientInventoryError()
        uc = CreateInventoryHoldUseCase(mock_inventory_repo)

        with pytest.raises(InsufficientInventoryError):
            await uc.execute(
                room_type_id=uuid4(),
                checkin=date(2026, 6, 1),
                checkout=date(2026, 6, 2),
            )


class TestReleaseInventoryHoldUseCase:
    async def test_delegates_to_repo(self, mock_inventory_repo):
        room_id = uuid4()
        checkin = date(2026, 6, 1)
        checkout = date(2026, 6, 4)
        uc = ReleaseInventoryHoldUseCase(mock_inventory_repo)

        await uc.execute(room_type_id=room_id, checkin=checkin, checkout=checkout)

        mock_inventory_repo.release_hold.assert_awaited_once_with(room_id, checkin, checkout)
