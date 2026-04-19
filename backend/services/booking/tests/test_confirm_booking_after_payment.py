from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.use_cases.confirm_booking_after_payment import ConfirmBookingAfterPaymentUseCase
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
async def test_confirm_idempotent_same_intent():
    intent_id = uuid4()
    bid = uuid4()
    b = _booking(bid, BookingStatus.CONFIRMED, confirmation=intent_id)
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)
    uc = ConfirmBookingAfterPaymentUseCase(repo)
    await uc.execute(booking_id=bid, payment_intent_id=intent_id)
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_confirm_rejects_expired_hold():
    bid = uuid4()
    now = datetime.now(UTC).replace(tzinfo=None)
    b = _booking(
        bid,
        BookingStatus.PENDING_CONFIRMATION,
        hold_expires_at=now - timedelta(minutes=1),
    )
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)
    uc = ConfirmBookingAfterPaymentUseCase(repo)
    with pytest.raises(InvalidBookingStateError):
        await uc.execute(booking_id=bid, payment_intent_id=uuid4())


@pytest.mark.asyncio
async def test_confirm_not_found():
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    uc = ConfirmBookingAfterPaymentUseCase(repo)
    with pytest.raises(BookingNotFoundError):
        await uc.execute(booking_id=uuid4(), payment_intent_id=uuid4())
