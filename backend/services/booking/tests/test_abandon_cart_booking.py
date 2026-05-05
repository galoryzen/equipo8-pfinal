"""Unit tests for AbandonCartBookingUseCase (CART-only abandonment)."""

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
from app.application.use_cases.abandon_cart_booking import AbandonCartBookingUseCase
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
        nightly_breakdown=None,
        taxes=Decimal("0"),
        service_fee=Decimal("0"),
        confirmation_payment_intent_id=None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestAbandonCartBookingUseCase:
    async def test_cart_transitions_to_expired_and_releases_inventory(self):
        booking = _booking()
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = AbandonCartBookingUseCase(repo, catalog)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "EXPIRED"
        assert booking.status == BookingStatus.EXPIRED
        assert booking.inventory_released is True
        catalog.release_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=booking.checkin,
            checkout=booking.checkout,
        )
        # Two saves: one state-only, one flipping inventory_released.
        assert repo.save.await_count == 2
        repo.add_status_history.assert_awaited_once()
        history_row = repo.add_status_history.await_args.args[0]
        assert history_row.from_status == BookingStatus.CART
        assert history_row.to_status == BookingStatus.EXPIRED
        assert history_row.reason == "user_cancelled_cart"
        assert history_row.changed_by == USER_ID

    async def test_raises_when_booking_not_found(self):
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = AbandonCartBookingUseCase(repo, catalog)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()

    @pytest.mark.parametrize(
        "status",
        [
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.PENDING_CONFIRMATION,
            BookingStatus.CONFIRMED,
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
            BookingStatus.EXPIRED,
        ],
    )
    async def test_rejects_any_non_cart_status(self, status):
        """Stale local cart pointing at an advanced booking must NOT be cancelled here."""
        booking = _booking(status=status)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = AbandonCartBookingUseCase(repo, catalog)
        with pytest.raises(InvalidBookingStateError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        repo.save.assert_not_awaited()

    async def test_returns_expired_even_when_catalog_release_fails(self):
        """State transition MUST persist even if the inline release fails —
        reconciler picks it up later."""
        booking = _booking()
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        catalog.release_hold.side_effect = CatalogUnavailableError("down")

        uc = AbandonCartBookingUseCase(repo, catalog)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "EXPIRED"
        assert booking.inventory_released is False
        # Only the pre-release save happened; the post-release save was skipped.
        assert repo.save.await_count == 1
