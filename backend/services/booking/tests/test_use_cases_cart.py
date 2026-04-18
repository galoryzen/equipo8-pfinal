"""Unit tests for CreateCartBookingUseCase and GetHeldRoomsUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_held_rooms import GetHeldRoomsUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import CreateCartBookingIn

PROPERTY_ID = UUID("30000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")
RATE_PLAN_ID = UUID("70000000-0000-0000-0000-000000000001")
USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
CHECKIN = date(2026, 6, 1)
CHECKOUT = date(2026, 6, 4)  # 3 nights


def _cart_booking() -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=BookingStatus.CART,
        checkin=CHECKIN,
        checkout=CHECKOUT,
        hold_expires_at=datetime(2026, 4, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        created_at=now,
        updated_at=now,
    )


def _payload() -> CreateCartBookingIn:
    return CreateCartBookingIn(
        checkin=CHECKIN,
        checkout=CHECKOUT,
        currency_code="USD",
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("100.00"),
    )


@pytest.mark.asyncio
class TestCreateCartBookingUseCase:
    async def test_creates_new_cart_when_none_exists(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.create.return_value = _cart_booking()

        uc = CreateCartBookingUseCase(repo)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        repo.find_active_cart.assert_awaited_once()
        repo.create.assert_awaited_once()
        assert out.status == "CART"
        assert out.id == BOOKING_ID
        assert out.property_id == PROPERTY_ID
        assert out.room_type_id == ROOM_TYPE_ID
        assert out.rate_plan_id == RATE_PLAN_ID

    async def test_returns_existing_cart_idempotently(self):
        existing = _cart_booking()
        repo = AsyncMock()
        repo.find_active_cart.return_value = existing

        uc = CreateCartBookingUseCase(repo)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        repo.create.assert_not_awaited()
        assert out.id == existing.id
        assert out.status == "CART"

    async def test_hold_expires_at_is_set(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.create.return_value = _cart_booking()

        uc = CreateCartBookingUseCase(repo)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        assert out.hold_expires_at is not None

    async def test_total_calculated_from_unit_price_and_nights(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.create.side_effect = fake_create

        uc = CreateCartBookingUseCase(repo)
        await uc.execute(user_id=USER_ID, payload=_payload())

        nights = (CHECKOUT - CHECKIN).days  # 3
        assert captured[0].total_amount == Decimal("100.00") * nights
        assert captured[0].unit_price == Decimal("100.00")


@pytest.mark.asyncio
class TestGetHeldRoomsUseCase:
    async def test_returns_held_room_ids(self):
        repo = AsyncMock()
        repo.find_held_room_type_ids.return_value = [ROOM_TYPE_ID]

        uc = GetHeldRoomsUseCase(repo)
        out = await uc.execute(property_id=PROPERTY_ID, checkin=CHECKIN, checkout=CHECKOUT)

        assert ROOM_TYPE_ID in out.held_room_type_ids

    async def test_returns_empty_when_no_holds(self):
        repo = AsyncMock()
        repo.find_held_room_type_ids.return_value = []

        uc = GetHeldRoomsUseCase(repo)
        out = await uc.execute(property_id=PROPERTY_ID, checkin=CHECKIN, checkout=CHECKOUT)

        assert out.held_room_type_ids == []

    async def test_passes_correct_args_to_repo(self):
        repo = AsyncMock()
        repo.find_held_room_type_ids.return_value = []

        uc = GetHeldRoomsUseCase(repo)
        await uc.execute(property_id=PROPERTY_ID, checkin=CHECKIN, checkout=CHECKOUT)

        repo.find_held_room_type_ids.assert_awaited_once_with(
            property_id=PROPERTY_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )
