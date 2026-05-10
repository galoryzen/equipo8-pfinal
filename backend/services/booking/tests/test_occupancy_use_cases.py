"""Use-case tests for occupancy (mocked repository)."""

from datetime import date, timedelta
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.ports.outbound.occupancy_repository import (
    OccupancyDayRow,
    RoomTypeOccupancyRow,
)
from app.application.use_cases.get_occupancy_calendar import GetOccupancyCalendarUseCase
from app.application.use_cases.get_occupancy_daily_breakdown import (
    GetOccupancyDailyBreakdownUseCase,
)
from app.application.use_cases.get_occupancy_projection import GetOccupancyProjectionUseCase


HOTEL = UUID("e0000000-0000-0000-0000-000000000001")
PROP = UUID("30000000-0000-0000-0000-000000000001")
RT_STANDARD = UUID("60000000-0000-0000-0000-000000000001")


@pytest.mark.asyncio
async def test_calendar_rejects_range_over_90_days():
    repo = AsyncMock()
    uc = GetOccupancyCalendarUseCase(repo)
    df = date(2026, 1, 1)
    dt = df + timedelta(days=90)
    with pytest.raises(ValueError, match=r"90"):
        await uc.execute(
            hotel_id=HOTEL,
            date_from=df,
            date_to=dt,
            property_id=PROP,
            room_type_id=None,
        )
    repo.fetch_daily_calendar_rows.assert_not_called()


@pytest.mark.asyncio
async def test_calendar_classifies_high_medium_low():
    repo = AsyncMock()
    repo.fetch_daily_calendar_rows.return_value = [
        OccupancyDayRow(day=date(2026, 6, 1), occupied_rooms=9, inventory_available_units=1),
        OccupancyDayRow(day=date(2026, 6, 2), occupied_rooms=6, inventory_available_units=4),
        OccupancyDayRow(day=date(2026, 6, 3), occupied_rooms=3, inventory_available_units=7),
    ]
    repo.property_belongs_to_hotel.return_value = True
    uc = GetOccupancyCalendarUseCase(repo)
    out = await uc.execute(
        hotel_id=HOTEL,
        date_from=date(2026, 6, 1),
        date_to=date(2026, 6, 3),
        property_id=PROP,
        room_type_id=None,
    )
    levels = [d["occupancy_level"] for d in out["days"]]
    assert levels == ["HIGH", "MEDIUM", "LOW"]
    repo.fetch_daily_calendar_rows.assert_awaited_once_with(
        PROP,
        date(2026, 6, 1),
        date(2026, 6, 3),
        room_type_id=None,
        projection=False,
    )


@pytest.mark.asyncio
async def test_calendar_default_property_first_ordered():
    repo = AsyncMock()
    repo.list_property_ids_for_hotel_ordered.return_value = [
        UUID("10000000-0000-0000-0000-000000000001"),
        PROP,
    ]
    repo.fetch_daily_calendar_rows.return_value = []
    uc = GetOccupancyCalendarUseCase(repo)
    await uc.execute(
        hotel_id=HOTEL,
        date_from=date(2026, 6, 1),
        date_to=date(2026, 6, 2),
        property_id=None,
        room_type_id=None,
    )
    repo.fetch_daily_calendar_rows.assert_awaited()
    args = repo.fetch_daily_calendar_rows.await_args[0]
    assert args[0] == UUID("10000000-0000-0000-0000-000000000001")


@pytest.mark.asyncio
async def test_calendar_room_type_must_belong_to_property():
    repo = AsyncMock()
    repo.property_belongs_to_hotel.return_value = True
    repo.room_type_belongs_to_property.return_value = False
    uc = GetOccupancyCalendarUseCase(repo)
    with pytest.raises(PermissionError):
        await uc.execute(
            hotel_id=HOTEL,
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 3),
            property_id=PROP,
            room_type_id=RT_STANDARD,
        )


@pytest.mark.asyncio
async def test_projection_uses_repo_projection_flag_and_merges_alerts():
    repo = AsyncMock()
    repo.fetch_daily_calendar_rows.return_value = [
        OccupancyDayRow(day=date(2026, 5, 10), occupied_rooms=1, inventory_available_units=9),
        OccupancyDayRow(day=date(2026, 5, 11), occupied_rooms=1, inventory_available_units=9),
    ]
    repo.property_belongs_to_hotel.return_value = True
    uc = GetOccupancyProjectionUseCase(repo)
    out = await uc.execute(
        hotel_id=HOTEL,
        property_id=PROP,
        days=2,
        today=date(2026, 5, 10),
    )
    repo.fetch_daily_calendar_rows.assert_awaited_once_with(
        PROP,
        date(2026, 5, 10),
        date(2026, 5, 11),
        room_type_id=None,
        projection=True,
    )
    assert len(out["days"]) == 2
    assert out["days"][0]["alert"] is not None
    assert len(out["alerts"]) == 1
    assert out["alerts"][0]["type"] == "LOW_OCCUPANCY_PERIOD"


@pytest.mark.asyncio
async def test_projection_rejects_days_out_of_bounds():
    repo = AsyncMock()
    uc = GetOccupancyProjectionUseCase(repo)
    with pytest.raises(ValueError):
        await uc.execute(hotel_id=HOTEL, property_id=PROP, days=91, today=date(2026, 1, 1))


@pytest.mark.asyncio
async def test_daily_breakdown_per_room_type():
    repo = AsyncMock()
    repo.property_belongs_to_hotel.return_value = True
    repo.fetch_daily_breakdown_for_date.return_value = [
        RoomTypeOccupancyRow(
            room_type_id=RT_STANDARD,
            room_type_name="Standard",
            occupied_rooms=7,
            inventory_available_units=3,
        )
    ]
    uc = GetOccupancyDailyBreakdownUseCase(repo)
    out = await uc.execute(hotel_id=HOTEL, property_id=PROP, day=date(2026, 7, 1))
    assert out["room_types"][0]["occupancy_rate"] == 70.0
    assert out["room_types"][0]["available_rooms"] == 3
