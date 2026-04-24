"""Unit tests for manager (hotel operator) use cases."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.exceptions import PromotionError
from app.application.ports.outbound.manager_repository import ManagerRepository
from app.application.use_cases.create_promotion import CreatePromotionUseCase
from app.application.use_cases.delete_promotion import DeletePromotionUseCase
from app.application.use_cases.get_hotel_metrics import GetHotelMetricsUseCase
from app.application.use_cases.get_rate_plan_cancellation_policy import GetRatePlanCancellationPolicyUseCase
from app.application.use_cases.get_room_type_promotion import GetRoomTypePromotionUseCase
from app.application.use_cases.list_manager_hotels import ListManagerHotelsUseCase
from app.application.use_cases.list_room_types_availability import ListRoomTypesAvailabilityUseCase
from app.application.use_cases.update_rate_plan_cancellation_policy import UpdateRatePlanCancellationPolicyUseCase
from app.schemas.manager import CreatePromotionIn, ManagerHotelItem, PromotionCreatedOut, UpdateCancellationPolicyIn


@pytest.fixture
def mock_manager_repo():
    return AsyncMock(spec=ManagerRepository)


class TestListManagerHotelsUseCase:
    async def test_builds_paginated_manager_hotels(self, mock_manager_repo):
        hid = uuid4()
        pid = uuid4()
        mock_manager_repo.list_manager_hotels.return_value = (
            [
                {
                    "id": pid,
                    "name": "Ocean View",
                    "location": "CANCÚN, MÉXICO",
                    "totalRooms": 10,
                    "occupiedRooms": 3,
                    "status": "ACTIVE",
                    "imageUrl": "https://example.com/p.jpg",
                    "categories": 2,
                }
            ],
            1,
        )
        uc = ListManagerHotelsUseCase(mock_manager_repo)

        out = await uc.execute(hotel_id=hid, page=1, page_size=10)

        assert out.total == 1
        assert len(out.items) == 1
        assert isinstance(out.items[0], ManagerHotelItem)
        assert out.items[0].name == "Ocean View"
        assert out.items[0].totalRooms == 10
        mock_manager_repo.list_manager_hotels.assert_awaited_once_with(
            hotel_id=hid, page=1, page_size=10
        )


class TestListRoomTypesAvailabilityUseCase:
    async def test_maps_room_type_rows(self, mock_manager_repo):
        prop_id = uuid4()
        rt_id = uuid4()
        rp_id = uuid4()
        mock_manager_repo.list_room_types_with_availability.return_value = (
            [
                {
                    "id": rt_id,
                    "name": "Deluxe King Suite",
                    "icon": "suite",
                    "available": 2,
                    "total": 5,
                    "rate_plan_id": rp_id,
                }
            ],
            4,
        )
        uc = ListRoomTypesAvailabilityUseCase(mock_manager_repo)

        out = await uc.execute(property_id=prop_id, page=2, page_size=5)

        assert out.total == 4
        assert out.page == 2
        assert out.items[0].icon == "suite"
        assert out.items[0].rate_plan_id == rp_id
        mock_manager_repo.list_room_types_with_availability.assert_awaited_once_with(
            property_id=prop_id, page=2, page_size=5
        )


class TestGetHotelMetricsUseCase:
    async def test_occupancy_from_repo_and_booking_fields(self, mock_manager_repo):
        mock_manager_repo.get_property_occupancy.return_value = (4, 10)
        uc = GetHotelMetricsUseCase(
            repo=mock_manager_repo,
            booking_stats={"active_bookings": 7, "monthly_revenue": 12500.5},
        )

        out = await uc.execute(property_id=uuid4())

        assert out.occupancyRate == 60.0
        assert out.activeBookings == 7
        assert out.monthlyRevenue == 12500.5

    async def test_zero_occupancy_when_no_capacity(self, mock_manager_repo):
        mock_manager_repo.get_property_occupancy.return_value = (0, 0)
        uc = GetHotelMetricsUseCase(repo=mock_manager_repo, booking_stats={})

        out = await uc.execute(property_id=uuid4())

        assert out.occupancyRate == 0.0
        assert out.activeBookings == 0
        assert out.monthlyRevenue == 0.0


class TestCreatePromotionUseCase:
    async def test_returns_created_dto(self, mock_manager_repo):
        rp_id = uuid4()
        promo_id = uuid4()
        mock_manager_repo.create_promotion.return_value = {
            "id": promo_id,
            "name": "Summer",
            "discount_type": "PERCENT",
            "discount_value": Decimal("15"),
            "start_date": date(2026, 6, 1),
            "end_date": date(2026, 8, 31),
            "is_active": True,
        }
        data = CreatePromotionIn(
            rate_plan_id=rp_id,
            name="Summer",
            discount_type="PERCENT",
            discount_value=Decimal("15"),
            start_date=date(2026, 6, 1),
            end_date=date(2026, 8, 31),
        )
        uc = CreatePromotionUseCase(mock_manager_repo)

        out = await uc.execute(property_id=uuid4(), data=data)

        assert isinstance(out, PromotionCreatedOut)
        assert out.id == promo_id
        assert out.discount_value == Decimal("15")

    async def test_value_error_becomes_promotion_error(self, mock_manager_repo):
        mock_manager_repo.create_promotion.side_effect = ValueError("rate_plan not found for this property")
        uc = CreatePromotionUseCase(mock_manager_repo)
        data = CreatePromotionIn(
            rate_plan_id=uuid4(),
            name="X",
            discount_type="FIXED",
            discount_value=Decimal("10"),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
        )

        with pytest.raises(PromotionError, match="rate_plan not found"):
            await uc.execute(property_id=uuid4(), data=data)


class TestGetRoomTypePromotionUseCase:
    async def test_returns_repo_dict(self, mock_manager_repo):
        rt_id = uuid4()
        row = {
            "id": uuid4(),
            "rate_plan_id": uuid4(),
            "name": "Deal",
            "discount_type": "PERCENT",
            "discount_value": Decimal("10"),
            "start_date": date(2026, 1, 1),
            "end_date": date(2026, 1, 15),
            "is_active": True,
        }
        mock_manager_repo.get_room_type_promotion.return_value = row
        uc = GetRoomTypePromotionUseCase(mock_manager_repo)

        out = await uc.execute(room_type_id=rt_id)

        assert out == row


class TestDeletePromotionUseCase:
    async def test_delegates_to_repo(self, mock_manager_repo):
        promo_id = uuid4()
        uc = DeletePromotionUseCase(mock_manager_repo)

        await uc.execute(promotion_id=promo_id)

        mock_manager_repo.delete_promotion.assert_awaited_once_with(promo_id)


class TestGetRatePlanCancellationPolicyUseCase:
    async def test_returns_none_when_unset(self, mock_manager_repo):
        mock_manager_repo.get_rate_plan_cancellation_policy.return_value = None
        uc = GetRatePlanCancellationPolicyUseCase(mock_manager_repo)

        out = await uc.execute(rate_plan_id=uuid4())

        assert out is None


class TestUpdateRatePlanCancellationPolicyUseCase:
    async def test_returns_updated_policy_dict(self, mock_manager_repo):
        mock_manager_repo.update_rate_plan_cancellation_policy.return_value = {
            "type": "FULL",
            "refund_percent": None,
            "hours_limit": None,
        }
        uc = UpdateRatePlanCancellationPolicyUseCase(mock_manager_repo)
        rid = uuid4()
        body = UpdateCancellationPolicyIn(type="FULL")

        out = await uc.execute(rate_plan_id=rid, data=body)

        assert out["type"] == "FULL"
        mock_manager_repo.update_rate_plan_cancellation_policy.assert_awaited_once_with(rid, body)
