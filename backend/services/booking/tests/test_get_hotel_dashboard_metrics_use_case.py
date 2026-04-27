from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest

from app.application.ports.outbound.dashboard_metrics_repository import HotelPeriodAggregate
from app.application.use_cases.get_hotel_dashboard_metrics import GetHotelDashboardMetricsUseCase


@pytest.mark.asyncio
async def test_execute_calls_repo_twice_and_returns_shape(monkeypatch):
    hotel = UUID("c0000000-0000-0000-0000-000000000001")

    async def fake_resolve(_uid):
        return hotel

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_dashboard_metrics.resolve_hotel_id_for_user",
        fake_resolve,
    )

    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock(
        side_effect=[
            HotelPeriodAggregate(
                total_bookings=2,
                confirmed_room_nights=4.0,
                active_room_nights=5.0,
                revenue_captured=Decimal("100"),
                avg_rating=4.0,
                capacity_room_nights=10.0,
            ),
            HotelPeriodAggregate(
                total_bookings=1,
                confirmed_room_nights=2.0,
                active_room_nights=3.0,
                revenue_captured=Decimal("50"),
                avg_rating=3.0,
                capacity_room_nights=10.0,
            ),
        ]
    )
    repo.count_active_cancellations = AsyncMock(return_value=1)
    repo.list_booking_trends = AsyncMock(return_value=[])
    repo.list_recent_activity = AsyncMock(return_value=[])
    repo.list_upcoming_checkins = AsyncMock(return_value=[])

    uc = GetHotelDashboardMetricsUseCase(repo)
    out = await uc.execute(
        hotel_id=hotel,
        date_from=date(2026, 2, 1),
        date_to=date(2026, 2, 7),
    )

    assert "metrics" in out
    assert out["metrics"]["totalBookings"]["value"] == 2
    assert out["activeCancellations"] == 1
    assert out["availableRooms"] == 5.0
    assert repo.aggregate_hotel_period.await_count == 2
    first_args, first_kw = repo.aggregate_hotel_period.await_args_list[0]
    assert first_args[0] == hotel
    assert first_args[1] == date(2026, 2, 1)
    assert first_args[2] == date(2026, 2, 7)
    assert first_kw["period_end_exclusive"] == date(2026, 2, 8)


@pytest.mark.asyncio
async def test_execute_invalid_range(monkeypatch):
    async def fake_resolve(_uid):
        return UUID("c0000000-0000-0000-0000-000000000001")

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_dashboard_metrics.resolve_hotel_id_for_user",
        fake_resolve,
    )
    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock()
    repo.count_active_cancellations = AsyncMock()
    repo.list_booking_trends = AsyncMock()
    repo.list_recent_activity = AsyncMock()
    repo.list_upcoming_checkins = AsyncMock()
    uc = GetHotelDashboardMetricsUseCase(repo)
    with pytest.raises(ValueError, match="inválido"):
        await uc.execute(
            hotel_id=UUID("c0000000-0000-0000-0000-000000000001"),
            date_from=date(2026, 3, 10),
            date_to=date(2026, 3, 1),
        )
    repo.aggregate_hotel_period.assert_not_called()


@pytest.mark.asyncio
async def test_execute_rejects_date_to_in_future(monkeypatch):
    async def fake_resolve(_uid):
        return UUID("c0000000-0000-0000-0000-000000000001")

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_dashboard_metrics.resolve_hotel_id_for_user",
        fake_resolve,
    )
    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock()
    uc = GetHotelDashboardMetricsUseCase(repo)
    with pytest.raises(ValueError, match="posterior"):
        await uc.execute(
            hotel_id=UUID("c0000000-0000-0000-0000-000000000001"),
            date_from=date(2099, 1, 1),
            date_to=date(2099, 1, 31),
        )
    repo.aggregate_hotel_period.assert_not_called()
