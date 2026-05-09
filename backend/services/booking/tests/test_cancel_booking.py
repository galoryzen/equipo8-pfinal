"""Unit tests for CancelBookingUseCase (CONFIRMED-only cancellation)."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from contracts.events.booking import BOOKING_CANCELLED

from app.application.exceptions import (
    BookingNotFoundError,
    CancellationNotAllowedError,
    CatalogUnavailableError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.use_cases.cancel_booking import CancelBookingUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")


def _booking(status: BookingStatus = BookingStatus.CONFIRMED) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=status,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=None,
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=True,
        guests_count=1,
        nightly_breakdown=None,
        taxes=Decimal("0"),
        service_fee=Decimal("0"),
        confirmation_payment_intent_id=None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestCancelBookingUseCase:
    async def test_confirmed_cancellation_succeeds_when_policy_allows(self):
        """Check-in far ahead with 48h policy → CONFIRMED may be cancelled."""
        booking = _booking(status=BookingStatus.CONFIRMED)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        frozen_now = datetime(2026, 4, 1, 12, 0, 0)
        uc = CancelBookingUseCase(repo, catalog, events=events, clock=lambda: frozen_now)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "CANCELLED"
        assert booking.status == BookingStatus.CANCELLED
        assert booking.inventory_released is True
        catalog.release_hold.assert_awaited_once()
        repo.add_status_history.assert_awaited_once()
        history_row = repo.add_status_history.await_args.args[0]
        assert history_row.from_status == BookingStatus.CONFIRMED
        assert history_row.to_status == BookingStatus.CANCELLED
        assert history_row.reason == "user_cancelled_confirmed"
        events.publish.assert_awaited_once()
        envelope = events.publish.await_args.args[0]
        assert envelope.event_type == BOOKING_CANCELLED
        assert envelope.payload["booking_id"] == str(BOOKING_ID)
        assert envelope.payload["user_id"] == str(USER_ID)
        assert envelope.payload["reason"] == "traveler_cancelled"
        # Default _booking() carries policy_refund_percent_applied=100 (FULL).
        assert envelope.payload["refund_percent"] == 100

    async def test_publishes_50_percent_for_partial_booking(self):
        """PARTIAL booking with 50% must publish refund_percent=50, not 100."""
        booking = _booking(status=BookingStatus.CONFIRMED)
        booking.policy_type_applied = CancellationPolicyType.PARTIAL
        booking.policy_hours_limit_applied = 24
        booking.policy_refund_percent_applied = 50

        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        frozen_now = datetime(2026, 4, 1, 12, 0, 0)
        uc = CancelBookingUseCase(repo, catalog, events=events, clock=lambda: frozen_now)
        await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        events.publish.assert_awaited_once()
        envelope = events.publish.await_args.args[0]
        assert envelope.payload["refund_percent"] == 50

    async def test_blocks_partial_with_null_refund_percent(self):
        """PARTIAL with NULL percent → block (data invariant). No transition, no event."""
        booking = _booking(status=BookingStatus.CONFIRMED)
        booking.policy_type_applied = CancellationPolicyType.PARTIAL
        booking.policy_hours_limit_applied = 24
        booking.policy_refund_percent_applied = None

        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        frozen_now = datetime(2026, 4, 1, 12, 0, 0)
        uc = CancelBookingUseCase(repo, catalog, events=events, clock=lambda: frozen_now)
        with pytest.raises(CancellationNotAllowedError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        repo.save.assert_not_awaited()
        events.publish.assert_not_awaited()

    async def test_policy_blocks_confirmed_cancel_without_booking_cancelled_event(self):
        """Inside 48h window before check-in → no transition, no BOOKING_CANCELLED."""
        booking = _booking(status=BookingStatus.CONFIRMED)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        frozen_now = datetime(2026, 5, 31, 12, 0, 0)
        uc = CancelBookingUseCase(repo, catalog, events=events, clock=lambda: frozen_now)

        with pytest.raises(CancellationNotAllowedError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        repo.save.assert_not_awaited()
        events.publish.assert_not_awaited()

    async def test_booking_not_found_does_not_publish_booking_cancelled_event(self):
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        uc = CancelBookingUseCase(repo, catalog, events=events)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        events.publish.assert_not_awaited()

    @pytest.mark.parametrize(
        "status",
        [
            BookingStatus.CART,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.PENDING_CONFIRMATION,
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
            BookingStatus.EXPIRED,
        ],
    )
    async def test_rejects_any_non_confirmed_status(self, status):
        """Only CONFIRMED is cancellable. PENDING_CONFIRMATION is in the hotel's hands."""
        booking = _booking(status=status)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        events = AsyncMock()

        uc = CancelBookingUseCase(repo, catalog, events=events)
        with pytest.raises(InvalidBookingStateError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        catalog.release_hold.assert_not_awaited()
        repo.save.assert_not_awaited()
        events.publish.assert_not_awaited()

    async def test_returns_cancelled_even_when_catalog_release_fails(self):
        """State transition + refund event MUST persist even if release fails —
        reconciler picks up the inventory release later."""
        booking = _booking(status=BookingStatus.CONFIRMED)
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = booking
        catalog = AsyncMock(spec=CatalogInventoryPort)
        catalog.release_hold.side_effect = CatalogUnavailableError("down")
        events = AsyncMock()

        frozen_now = datetime(2026, 4, 1, 12, 0, 0)
        uc = CancelBookingUseCase(repo, catalog, events=events, clock=lambda: frozen_now)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert out.status == "CANCELLED"
        assert booking.inventory_released is False
        # Only the pre-release save happened; the post-release save was skipped.
        assert repo.save.await_count == 1
        events.publish.assert_awaited_once()
