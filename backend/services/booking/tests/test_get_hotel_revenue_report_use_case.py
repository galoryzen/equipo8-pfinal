from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest

from app.application.ports.outbound.revenue_report_repository import (
    RevenueByRoomTypePoint,
    RevenuePeriodAggregate,
    RevenueTrendPoint,
)
from app.application.use_cases.get_hotel_revenue_report import GetHotelRevenueReportUseCase


@pytest.mark.asyncio
async def test_execute_returns_revenue_report_payload(monkeypatch):
    """Test with PENDING_CONFIRMATION, CHECKED_IN, CHECKED_OUT bookings (no CAPTURED requirement)."""
    hotel = UUID("c0000000-0000-0000-0000-000000000001")

    async def fake_resolve(_uid):
        return hotel

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_revenue_report.resolve_hotel_id_for_user",
        fake_resolve,
    )

    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock(
        side_effect=[
            RevenuePeriodAggregate(
                total_revenue=Decimal("980"),
                sold_room_nights=9.0,
                occupied_room_nights=3.0,
                capacity_room_nights=7.0,
                has_activity=True,
                currency_code="USD",
            ),
            RevenuePeriodAggregate(
                total_revenue=Decimal("0"),
                sold_room_nights=0.0,
                occupied_room_nights=0.0,
                capacity_room_nights=7.0,
                has_activity=False,
                currency_code=None,
            ),
        ]
    )
    repo.list_revenue_trends = AsyncMock(
        return_value=[
            RevenueTrendPoint(day=date(2026, 2, 1), revenue=Decimal("280"), occupancy_rate=14.3),
            RevenueTrendPoint(day=date(2026, 2, 2), revenue=Decimal("300"), occupancy_rate=14.3),
            RevenueTrendPoint(day=date(2026, 2, 3), revenue=Decimal("0"), occupancy_rate=0.0),
            RevenueTrendPoint(day=date(2026, 2, 4), revenue=Decimal("400"), occupancy_rate=14.3),
        ]
    )
    repo.list_revenue_by_room_type = AsyncMock(
        return_value=[
            RevenueByRoomTypePoint(
                room_type="Standard",
                units_sold=2,
                avg_rate=Decimal("140"),
                total_revenue=Decimal("680"),
            ),
            RevenueByRoomTypePoint(
                room_type="Deluxe",
                units_sold=1,
                avg_rate=Decimal("80"),
                total_revenue=Decimal("400"),
            ),
        ]
    )

    uc = GetHotelRevenueReportUseCase(repo)
    out = await uc.execute(
        hotel_id=hotel,
        date_from=date(2026, 2, 1),
        date_to=date(2026, 2, 4),
    )

    assert out["kpis"]["totalRevenue"]["value"] == 980.0
    assert out["kpis"]["totalRevenue"]["variation"] == 0.0
    assert out["kpis"]["adr"]["value"] == 108.8889
    assert out["kpis"]["occupancyRate"]["value"] == 42.8571
    assert out["trends"][0]["date"] == "2026-02-01"
    assert out["revenueByRoomType"][0]["roomType"] == "Standard"
    assert out["totalAggregatedRevenue"] == 1080.0
    assert out["metadata"]["currency"] == "USD"
    assert repo.aggregate_hotel_period.await_count == 2


@pytest.mark.asyncio
async def test_execute_no_data_returns_zero_values(monkeypatch):
    hotel = UUID("c0000000-0000-0000-0000-000000000001")

    async def fake_resolve(_uid):
        return hotel

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_revenue_report.resolve_hotel_id_for_user",
        fake_resolve,
    )

    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock(
        side_effect=[
            RevenuePeriodAggregate(
                total_revenue=Decimal("0"),
                sold_room_nights=0.0,
                occupied_room_nights=0.0,
                capacity_room_nights=20.0,
                has_activity=False,
                currency_code=None,
            ),
            RevenuePeriodAggregate(
                total_revenue=Decimal("0"),
                sold_room_nights=0.0,
                occupied_room_nights=0.0,
                capacity_room_nights=20.0,
                has_activity=False,
                currency_code=None,
            ),
        ]
    )
    repo.list_revenue_trends = AsyncMock(return_value=[])
    repo.list_revenue_by_room_type = AsyncMock(return_value=[])

    uc = GetHotelRevenueReportUseCase(repo)
    out = await uc.execute(
        hotel_id=hotel,
        date_from=date(2026, 3, 1),
        date_to=date(2026, 3, 31),
    )

    assert out["kpis"]["totalRevenue"] == {"value": 0.0, "variation": 0.0}
    assert out["kpis"]["adr"] == {"value": 0.0, "variation": 0.0}
    assert out["kpis"]["occupancyRate"] == {"value": 0.0, "variation": 0.0}
    assert out["trends"] == []
    assert out["revenueByRoomType"] == []
    assert out["totalAggregatedRevenue"] == 0.0
    assert out["metadata"]["currency"] == "USD"


@pytest.mark.asyncio
async def test_execute_without_previous_period_activity_sets_variation_zero(monkeypatch):
    """No previous period activity → variations stay 0 even with current activity."""
    hotel = UUID("c0000000-0000-0000-0000-000000000001")

    async def fake_resolve(_uid):
        return hotel

    monkeypatch.setattr(
        "app.application.use_cases.get_hotel_revenue_report.resolve_hotel_id_for_user",
        fake_resolve,
    )

    repo = MagicMock()
    repo.aggregate_hotel_period = AsyncMock(
        side_effect=[
            RevenuePeriodAggregate(
                total_revenue=Decimal("680"),
                sold_room_nights=8.0,
                occupied_room_nights=2.0,
                capacity_room_nights=5.0,
                has_activity=True,
                currency_code="USD",
            ),
            RevenuePeriodAggregate(
                total_revenue=Decimal("0"),
                sold_room_nights=0.0,
                occupied_room_nights=0.0,
                capacity_room_nights=5.0,
                has_activity=False,
                currency_code=None,
            ),
        ]
    )
    repo.list_revenue_trends = AsyncMock(return_value=[])
    repo.list_revenue_by_room_type = AsyncMock(return_value=[])

    uc = GetHotelRevenueReportUseCase(repo)
    out = await uc.execute(
        hotel_id=hotel,
        date_from=date(2026, 4, 1),
        date_to=date(2026, 4, 7),
    )

    assert out["kpis"]["totalRevenue"]["variation"] == 0.0
    assert out["kpis"]["adr"]["variation"] == 0.0
    assert out["kpis"]["occupancyRate"]["variation"] == 0.0
