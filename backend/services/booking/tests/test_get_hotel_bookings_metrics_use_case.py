from datetime import date
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.use_cases.get_hotel_bookings_metrics import GetHotelBookingsMetricsUseCase


@pytest.mark.asyncio
async def test_execute_forwards_hotel_id_and_returns_repo_counts():
    hotel_a = UUID("e0000000-0000-0000-0000-000000000001")
    hotel_b = UUID("e0000000-0000-0000-0000-000000000002")
    fixed_today = date(2026, 6, 1)

    async def fake_count(hid: UUID, *, today: date):
        assert today == fixed_today
        if hid == hotel_a:
            return {
                "confirmed_count": 2,
                "pending_count": 1,
                "check_ins_today_count": 3,
                "cancelled_count": 4,
            }
        return {
            "confirmed_count": 0,
            "pending_count": 0,
            "check_ins_today_count": 0,
            "cancelled_count": 0,
        }

    repo = AsyncMock()
    repo.count_hotel_bookings_metrics = AsyncMock(side_effect=fake_count)

    uc = GetHotelBookingsMetricsUseCase(repo, clock=lambda: fixed_today)

    out_a = await uc.execute(hotel_a)
    assert out_a["confirmed_count"] == 2
    assert out_a["pending_count"] == 1
    assert out_a["check_ins_today_count"] == 3
    assert out_a["cancelled_count"] == 4

    out_b = await uc.execute(hotel_b)
    assert out_b == {
        "confirmed_count": 0,
        "pending_count": 0,
        "check_ins_today_count": 0,
        "cancelled_count": 0,
    }

    assert repo.count_hotel_bookings_metrics.await_count == 2
    repo.count_hotel_bookings_metrics.assert_any_await(hotel_a, today=fixed_today)
    repo.count_hotel_bookings_metrics.assert_any_await(hotel_b, today=fixed_today)
