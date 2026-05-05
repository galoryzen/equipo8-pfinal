"""Tests for ConfirmBookingAfterPaymentUseCase.

Verifies that when a PaymentSucceeded event is processed the booking is
automatically transitioned all the way to CONFIRMED status and the
BookingConfirmed domain event is published.
"""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from contracts.events.booking import BOOKING_CONFIRMED

from app.application.use_cases.confirm_booking_after_payment import (
    ConfirmBookingAfterPaymentUseCase,
)
from app.domain.models import Booking, BookingStatus, CancellationPolicyType

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _booking(
    bid: UUID,
    status: BookingStatus,
    *,
    hold_expires_at: datetime | None = None,
    confirmation: UUID | None = None,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid,
        user_id=uuid4(),
        status=status,
        checkin=date(2026, 4, 10),
        checkout=date(2026, 4, 12),
        hold_expires_at=hold_expires_at,
        total_amount=Decimal("200.00"),
        currency_code="USD",
        property_id=uuid4(),
        room_type_id=uuid4(),
        rate_plan_id=uuid4(),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=False,
        confirmation_payment_intent_id=confirmation,
        guests_count=2,
        created_at=now,
        updated_at=now,
    )


def _make_repo(booking: Booking, *, inventory_ok: bool = True) -> AsyncMock:
    """Return a mock BookingRepository pre-configured for the given booking."""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=booking)
    repo.check_inventory = AsyncMock(return_value=inventory_ok)
    repo.update = AsyncMock()
    repo.decrement_inventory = AsyncMock()
    repo.add_status_history = AsyncMock()
    repo.save_and_record_status_history = AsyncMock()
    return repo


# ---------------------------------------------------------------------------
# happy path: payment confirmed, inventory available → CONFIRMED
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_orchestration_confirms_booking():
    """PENDING_PAYMENT → PENDING_CONFIRMATION → CONFIRMED when inventory is available."""
    bid = uuid4()
    intent_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=2)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=future)

    repo = _make_repo(b)

    # After mark step get_by_id should return booking in PENDING_CONFIRMATION
    async def get_by_id_side_effect(booking_id):
        return b

    repo.get_by_id = AsyncMock(side_effect=get_by_id_side_effect)
    events = AsyncMock()

    uc = ConfirmBookingAfterPaymentUseCase(repo, events)
    await uc.execute(bid, intent_id)

    # Booking must reach CONFIRMED
    assert b.status == BookingStatus.CONFIRMED

    # Inventory must have been decremented
    repo.decrement_inventory.assert_awaited_once()

    # Status history row for PENDING_CONFIRMATION → CONFIRMED must be recorded
    repo.add_status_history.assert_awaited_once()
    row = repo.add_status_history.await_args.args[0]
    assert row.from_status == BookingStatus.PENDING_CONFIRMATION
    assert row.to_status == BookingStatus.CONFIRMED
    assert row.reason == "payment_auto_confirmed"

    # BookingConfirmed event must be published
    events.publish.assert_awaited_once()
    envelope = events.publish.await_args.args[0]
    assert envelope.event_type == BOOKING_CONFIRMED
    assert envelope.payload["booking_id"] == str(bid)


@pytest.mark.asyncio
async def test_booking_confirmed_payload_has_correct_fields():
    """Published BookingConfirmed payload contains all required fields."""
    bid = uuid4()
    intent_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=2)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=future)

    repo = _make_repo(b)
    events = AsyncMock()

    uc = ConfirmBookingAfterPaymentUseCase(repo, events)
    await uc.execute(bid, intent_id)

    payload = events.publish.await_args.args[0].payload
    assert payload["booking_id"] == str(b.id)
    assert payload["user_id"] == str(b.user_id)
    assert payload["property_id"] == str(b.property_id)
    assert payload["checkin"] == str(b.checkin)
    assert payload["checkout"] == str(b.checkout)
    assert payload["guests_count"] == b.guests_count
    assert payload["total_amount"] == str(b.total_amount)
    assert payload["currency_code"] == b.currency_code


# ---------------------------------------------------------------------------
# inventory unavailable → stays PENDING_CONFIRMATION, no event published
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_inventory_leaves_booking_pending_confirmation():
    """When inventory is exhausted the booking stays in PENDING_CONFIRMATION."""
    bid = uuid4()
    intent_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=2)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=future)

    repo = _make_repo(b, inventory_ok=False)
    events = AsyncMock()

    uc = ConfirmBookingAfterPaymentUseCase(repo, events)
    await uc.execute(bid, intent_id)

    # Booking must reach PENDING_CONFIRMATION (mark step) but not CONFIRMED
    assert b.status == BookingStatus.PENDING_CONFIRMATION

    # No further DB operations for the confirm step
    repo.update.assert_not_awaited()
    repo.decrement_inventory.assert_not_awaited()

    # No BookingConfirmed event when inventory check fails
    events.publish.assert_not_awaited()


# ---------------------------------------------------------------------------
# idempotency: already PENDING_CONFIRMATION with same intent → auto-confirms
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_idempotent_replay_already_pending_confirmation_auto_confirms():
    """Replaying a PAYMENT_SUCCEEDED for a booking already in PENDING_CONFIRMATION
    with the same intent triggers the auto-confirm step (idempotent orchestration)."""
    bid = uuid4()
    intent_id = uuid4()
    b = _booking(bid, BookingStatus.PENDING_CONFIRMATION, confirmation=intent_id)

    repo = _make_repo(b)
    events = AsyncMock()

    uc = ConfirmBookingAfterPaymentUseCase(repo, events)
    await uc.execute(bid, intent_id)

    assert b.status == BookingStatus.CONFIRMED
    events.publish.assert_awaited_once()


# ---------------------------------------------------------------------------
# mark step raises → exception propagates (event bus will retry)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mark_failure_propagates():
    """If the mark-pending-confirmation step fails the exception propagates."""
    from app.application.exceptions import InvalidBookingStateError

    bid = uuid4()
    b = _booking(bid, BookingStatus.CONFIRMED)  # Wrong state for mark step

    repo = _make_repo(b)
    events = AsyncMock()

    uc = ConfirmBookingAfterPaymentUseCase(repo, events)

    with pytest.raises(InvalidBookingStateError):
        await uc.execute(bid, uuid4())

    # Confirm step must not have run
    events.publish.assert_not_awaited()
