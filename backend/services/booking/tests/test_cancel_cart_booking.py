"""Unit tests for CancelCartBookingUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.exceptions import (
    BookingNotFoundError,
    CatalogUnavailableError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.use_cases.cancel_cart_booking import CancelCartBookingUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")


def _booking(status: BookingStatus = BookingStatus.CART) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=status,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 4, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        inventory_released=False,
        guests_count=1,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestCancelCartBookingUseCase:
    async def test_cancels_and_releases_on_happy_path(self):
        booking = _booking()
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = CancelCartBookingUseCase(repo, catalog)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "CANCELLED"
        assert booking.status == BookingStatus.CANCELLED
        assert booking.inventory_released is True
        catalog.release_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=booking.checkin,
            checkout=booking.checkout,
        )
        # Two saves: one state-only, one flipping inventory_released.
        assert repo.save.await_count == 2

    async def test_raises_when_booking_not_found(self):
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = CancelCartBookingUseCase(repo, catalog)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()

    async def test_raises_when_status_not_cart(self):
        booking = _booking(status=BookingStatus.CONFIRMED)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = CancelCartBookingUseCase(repo, catalog)
        with pytest.raises(InvalidBookingStateError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        repo.save.assert_not_awaited()

    async def test_returns_200_even_when_catalog_fails(self):
        """State transition MUST persist even if the inline release fails —
        reconciler picks it up later."""
        booking = _booking()
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        catalog.release_hold.side_effect = CatalogUnavailableError("down")

        uc = CancelCartBookingUseCase(repo, catalog)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "CANCELLED"
        assert booking.inventory_released is False
        # Only the pre-release save happened; the post-release save was skipped.
        assert repo.save.await_count == 1
