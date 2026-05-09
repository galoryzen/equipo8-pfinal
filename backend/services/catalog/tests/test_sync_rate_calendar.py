from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4
from unittest.mock import AsyncMock

import pytest

from app.application.use_cases.sync_rate_calendar import SyncRateCalendarUseCase


class TestSyncRateCalendarWeekendPremium:
    @pytest.mark.asyncio
    async def test_applies_weekend_premium_as_percentage(self):
        room_type_id = uuid4()
        rate_plan_id = uuid4()
        today = date.today()

        repo = AsyncMock()
        repo.get_room_tariffs.return_value = {
            "base": {
                "room_type_id": room_type_id,
                "base_price": Decimal("100"),
                "weekend_premium": Decimal("10"),
            },
            "seasonal_rules": [],
        }
        repo.list_rate_plans_for_room_type.return_value = [rate_plan_id]
        repo.update_rate_calendar = AsyncMock()

        use_case = SyncRateCalendarUseCase(repo)
        await use_case.execute(room_type_id)

        repo.update_rate_calendar.assert_called_once()
        call_args = repo.update_rate_calendar.call_args[0]
        prices = call_args[1]

        friday = today + timedelta(days=(4 - today.weekday()) % 7)
        saturday = today + timedelta(days=(5 - today.weekday()) % 7)

        weekend_price = None
        weekday_price = None
        for p in prices[:7]:
            if p["day"] in (friday, saturday):
                weekend_price = p["price_amount"]
            else:
                weekday_price = p["price_amount"]

        assert weekday_price == Decimal("100")
        assert weekend_price == Decimal("110")