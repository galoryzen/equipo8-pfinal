from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.application.use_cases.update_base_tariff import UpdateBaseTariffUseCase
from app.application.use_cases.add_seasonal_tariff import AddSeasonalTariffUseCase
from app.application.use_cases.delete_seasonal_tariff import DeleteSeasonalTariffUseCase
from app.schemas.manager import TariffBaseIn, TariffSeasonalRuleIn


class TestUpdateBaseTariffCacheInvalidation:
    @pytest.mark.asyncio
    async def test_invalidates_cache_after_updating_tariff(self):
        room_type_id = uuid4()
        property_id = uuid4()
        repo = AsyncMock()
        repo.update_base_tariff.return_value = {
            "room_type_id": room_type_id,
            "base_price": 150,
            "weekend_premium": 10,
        }
        repo.get_property_id_for_room_type.return_value = property_id

        sync_use_case = AsyncMock()
        cache = AsyncMock()
        cache.delete_pattern = AsyncMock(return_value=5)

        use_case = UpdateBaseTariffUseCase(repo, sync_use_case, cache)
        await use_case.execute(room_type_id, TariffBaseIn(base_price=150, weekend_premium=10))

        repo.update_base_tariff.assert_awaited_once_with(room_type_id, TariffBaseIn(base_price=150, weekend_premium=10))
        sync_use_case.execute.assert_awaited_once_with(room_type_id)
        cache.delete_pattern.assert_awaited_once_with(f"property_detail:{property_id}:*")

    @pytest.mark.asyncio
    async def test_skips_cache_invalidation_when_property_not_found(self):
        room_type_id = uuid4()
        repo = AsyncMock()
        repo.update_base_tariff.return_value = {
            "room_type_id": room_type_id,
            "base_price": 150,
            "weekend_premium": 10,
        }
        repo.get_property_id_for_room_type.return_value = None

        sync_use_case = AsyncMock()
        cache = AsyncMock()
        cache.delete_pattern = AsyncMock(return_value=0)

        use_case = UpdateBaseTariffUseCase(repo, sync_use_case, cache)
        await use_case.execute(room_type_id, TariffBaseIn(base_price=150, weekend_premium=10))

        cache.delete_pattern.assert_not_awaited()


class TestAddSeasonalTariffCacheInvalidation:
    @pytest.mark.asyncio
    async def test_invalidates_cache_after_adding_seasonal_rule(self):
        room_type_id = uuid4()
        property_id = uuid4()
        repo = AsyncMock()
        repo.add_seasonal_tariff.return_value = {
            "id": uuid4(),
            "room_type_id": room_type_id,
            "name": "Summer",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
            "adjustment_type": "PERCENT",
            "adjustment_value": 20,
        }
        repo.get_property_id_for_room_type.return_value = property_id

        sync_use_case = AsyncMock()
        cache = AsyncMock()
        cache.delete_pattern = AsyncMock(return_value=5)

        use_case = AddSeasonalTariffUseCase(repo, sync_use_case, cache)
        await use_case.execute(
            room_type_id,
            TariffSeasonalRuleIn(
                name="Summer",
                start_date="2026-06-01",
                end_date="2026-08-31",
                adjustment_type="PERCENT",
                adjustment_value=20,
            ),
        )

        cache.delete_pattern.assert_awaited_once_with(f"property_detail:{property_id}:*")


class TestDeleteSeasonalTariffCacheInvalidation:
    @pytest.mark.asyncio
    async def test_invalidates_cache_after_deleting_seasonal_rule(self):
        rule_id = uuid4()
        room_type_id = uuid4()
        property_id = uuid4()
        repo = AsyncMock()
        repo.get_seasonal_rule.return_value = {
            "id": rule_id,
            "room_type_id": room_type_id,
            "name": "Summer",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
            "adjustment_type": "PERCENT",
            "adjustment_value": 20,
        }
        repo.delete_seasonal_tariff.return_value = None
        repo.get_property_id_for_room_type.return_value = property_id

        sync_use_case = AsyncMock()
        cache = AsyncMock()
        cache.delete_pattern = AsyncMock(return_value=5)

        use_case = DeleteSeasonalTariffUseCase(repo, sync_use_case, cache)
        await use_case.execute(rule_id)

        cache.delete_pattern.assert_awaited_once_with(f"property_detail:{property_id}:*")

    @pytest.mark.asyncio
    async def test_skips_invalidation_when_rule_not_found(self):
        rule_id = uuid4()
        repo = AsyncMock()
        repo.get_seasonal_rule.return_value = None

        sync_use_case = AsyncMock()
        cache = AsyncMock()
        cache.delete_pattern = AsyncMock(return_value=0)

        use_case = DeleteSeasonalTariffUseCase(repo, sync_use_case, cache)
        await use_case.execute(rule_id)

        cache.delete_pattern.assert_not_awaited()
        sync_use_case.execute.assert_not_awaited()