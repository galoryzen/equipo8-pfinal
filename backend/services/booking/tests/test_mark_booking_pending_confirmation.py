from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.use_cases.mark_booking_pending_confirmation import (
    MarkBookingPendingConfirmationUseCase,
)
from app.domain.models import Booking, BookingStatus, CancellationPolicyType


def _booking(
    bid: UUID,
    status: BookingStatus,
    *,
    hold_expires_at=None,
    confirmation=None,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid,
        user_id=uuid4(),
        status=status,
        checkin=date(2026, 4, 10),
        checkout=date(2026, 4, 12),
        hold_expires_at=hold_expires_at,
        total_amount=Decimal("100.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=False,
        confirmation_payment_intent_id=confirmation,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_transitions_from_pending_payment_to_pending_confirmation():
    bid = uuid4()
    intent_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=future)
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = MarkBookingPendingConfirmationUseCase(repo)
    await uc.execute(booking_id=bid, payment_intent_id=intent_id)

    assert b.status == BookingStatus.PENDING_CONFIRMATION
    assert b.confirmation_payment_intent_id == intent_id
    repo.save_and_record_status_history.assert_awaited_once()
    repo.save.assert_not_awaited()


@pytest.mark.asyncio
async def test_idempotent_same_intent_from_pending_confirmation():
    bid = uuid4()
    intent_id = uuid4()
    b = _booking(bid, BookingStatus.PENDING_CONFIRMATION, confirmation=intent_id)
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = MarkBookingPendingConfirmationUseCase(repo)
    await uc.execute(booking_id=bid, payment_intent_id=intent_id)

    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_rejects_pending_confirmation_with_different_intent():
    bid = uuid4()
    b = _booking(
        bid,
        BookingStatus.PENDING_CONFIRMATION,
        confirmation=uuid4(),
    )
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = MarkBookingPendingConfirmationUseCase(repo)
    with pytest.raises(InvalidBookingStateError, match="different payment intent"):
        await uc.execute(booking_id=bid, payment_intent_id=uuid4())
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_rejects_expired_hold():
    bid = uuid4()
    past = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=past)
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = MarkBookingPendingConfirmationUseCase(repo)
    with pytest.raises(InvalidBookingStateError, match="hold has expired"):
        await uc.execute(booking_id=bid, payment_intent_id=uuid4())


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "bad_status",
    [
        BookingStatus.CART,
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
        BookingStatus.REJECTED,
    ],
)
async def test_rejects_non_pending_payment_states(bad_status):
    bid = uuid4()
    b = _booking(bid, bad_status)
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = MarkBookingPendingConfirmationUseCase(repo)
    with pytest.raises(InvalidBookingStateError, match=r"Cannot mark booking"):
        await uc.execute(booking_id=bid, payment_intent_id=uuid4())
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_booking_not_found():
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    uc = MarkBookingPendingConfirmationUseCase(repo)
    with pytest.raises(BookingNotFoundError):
        await uc.execute(booking_id=uuid4(), payment_intent_id=uuid4())
