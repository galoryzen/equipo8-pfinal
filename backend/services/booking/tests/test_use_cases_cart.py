"""Unit tests for CreateCartBookingUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.exceptions import (
    CatalogUnavailableError,
    ConflictingActiveCartError,
    InventoryUnavailableError,
)
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
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
        inventory_released=False,
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


def _catalog_mock() -> AsyncMock:
    return AsyncMock(spec=CatalogInventoryPort)


@pytest.mark.asyncio
class TestCreateCartBookingUseCase:
    async def test_creates_new_cart_when_none_exists(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.return_value = _cart_booking()
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        repo.find_active_cart.assert_awaited_once()
        catalog.create_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )
        repo.create.assert_awaited_once()
        assert out.status == "CART"
        assert out.id == BOOKING_ID

    async def test_returns_existing_cart_idempotently_without_calling_catalog(self):
        existing = _cart_booking()
        repo = AsyncMock()
        repo.find_active_cart.return_value = existing
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_not_awaited()
        repo.create.assert_not_awaited()
        assert out.id == existing.id

    async def test_new_booking_starts_inventory_released_false(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)
        await uc.execute(user_id=USER_ID, payload=_payload())

        assert captured[0].inventory_released is False

    async def test_total_calculated_from_unit_price_and_nights(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)
        await uc.execute(user_id=USER_ID, payload=_payload())

        nights = (CHECKOUT - CHECKIN).days  # 3
        assert captured[0].total_amount == Decimal("100.00") * nights
        assert captured[0].unit_price == Decimal("100.00")

    async def test_rejects_when_user_has_other_active_cart(self):
        """User can only have one active cart at a time, regardless of the room/dates."""
        other = _cart_booking()
        repo = AsyncMock()
        # No exact match (different combination) but user HAS another active cart.
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = other
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)

        with pytest.raises(ConflictingActiveCartError) as exc_info:
            await uc.execute(user_id=USER_ID, payload=_payload())

        assert exc_info.value.existing_booking_id == other.id
        catalog.create_hold.assert_not_awaited()
        repo.create.assert_not_awaited()

    async def test_inventory_unavailable_propagates_and_skips_persistence(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        catalog.create_hold.side_effect = InventoryUnavailableError()

        uc = CreateCartBookingUseCase(repo, catalog)

        with pytest.raises(InventoryUnavailableError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        repo.create.assert_not_awaited()

    async def test_catalog_unavailable_propagates_and_skips_persistence(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        catalog.create_hold.side_effect = CatalogUnavailableError("network")

        uc = CreateCartBookingUseCase(repo, catalog)

        with pytest.raises(CatalogUnavailableError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        repo.create.assert_not_awaited()

    async def test_persistence_failure_triggers_best_effort_release(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = RuntimeError("db down")
        catalog = _catalog_mock()

        uc = CreateCartBookingUseCase(repo, catalog)
        with pytest.raises(RuntimeError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_awaited_once()
        catalog.release_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )

    async def test_persistence_and_rollback_failure_still_propagates_original(self, caplog):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = RuntimeError("db down")
        catalog = _catalog_mock()
        catalog.release_hold.side_effect = CatalogUnavailableError("also down")

        uc = CreateCartBookingUseCase(repo, catalog)

        with pytest.raises(RuntimeError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        # The loud log for orphan inventory is emitted; caller still sees the db error.
        assert any("Orphan inventory hold" in r.message for r in caplog.records)
