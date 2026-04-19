from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.application.dto import BookingForPayment
from app.application.exceptions import BookingNotPayableError
from app.application.payment_rules import assert_booking_payable_for_intent


def test_assert_booking_payable_accepts_pending_states():
    now = datetime.now(UTC).replace(tzinfo=None)
    snap = BookingForPayment(
        id=uuid4(),
        status="PENDING_PAYMENT",
        total_amount=Decimal("10.00"),
        currency_code="USD",
        hold_expires_at=now + timedelta(hours=1),
    )
    assert_booking_payable_for_intent(snap, now)


def test_assert_booking_payable_rejects_expired_hold():
    now = datetime.now(UTC).replace(tzinfo=None)
    snap = BookingForPayment(
        id=uuid4(),
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("10.00"),
        currency_code="USD",
        hold_expires_at=now - timedelta(minutes=1),
    )
    with pytest.raises(BookingNotPayableError):
        assert_booking_payable_for_intent(snap, now)
