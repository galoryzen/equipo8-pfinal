"""Unit tests for domain cancellation policy evaluation (no DB, no use case)."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import pytest

from app.domain.cancellation_policy import evaluate_cancellation_policy
from app.domain.models import Booking, BookingStatus, CancellationPolicyType

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")

# Well before any 48h deadline.
WITHIN_WINDOW = datetime(2026, 4, 1, 12, 0, 0)
# After the 48h deadline for a 2026-06-01 check-in.
AFTER_DEADLINE = datetime(2026, 5, 31, 12, 0, 0)


def _base_booking(**kwargs) -> Booking:
    defaults = dict(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=BookingStatus.CONFIRMED,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=None,
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
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
        created_at=datetime(2026, 4, 1, 12, 0, 0),
        updated_at=datetime(2026, 4, 1, 12, 0, 0),
    )
    defaults.update(kwargs)
    return Booking(**defaults)


def test_full_policy_within_window_allows_with_stored_percent():
    booking = _base_booking(policy_refund_percent_applied=100)
    result = evaluate_cancellation_policy(booking, at=WITHIN_WINDOW)
    assert result.allowed is True
    assert result.refund_percent == 100


def test_full_policy_with_null_percent_defaults_to_100():
    """FULL implies 100% by convention; missing column shouldn't block the user."""
    booking = _base_booking(policy_refund_percent_applied=None)
    result = evaluate_cancellation_policy(booking, at=WITHIN_WINDOW)
    assert result.allowed is True
    assert result.refund_percent == 100


def test_partial_policy_within_window_returns_stored_percent():
    booking = _base_booking(
        policy_type_applied=CancellationPolicyType.PARTIAL,
        policy_hours_limit_applied=24,
        policy_refund_percent_applied=50,
    )
    result = evaluate_cancellation_policy(booking, at=WITHIN_WINDOW)
    assert result.allowed is True
    assert result.refund_percent == 50


def test_partial_policy_with_null_percent_blocks_cancellation():
    """PARTIAL with NULL percent is a data invariant violation — block to avoid 100% over-refund."""
    booking = _base_booking(
        policy_type_applied=CancellationPolicyType.PARTIAL,
        policy_hours_limit_applied=24,
        policy_refund_percent_applied=None,
    )
    result = evaluate_cancellation_policy(booking, at=WITHIN_WINDOW)
    assert result.allowed is False
    assert result.refund_percent == 0


def test_non_refundable_blocks_with_zero_percent():
    booking = _base_booking(
        policy_type_applied=CancellationPolicyType.NON_REFUNDABLE,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
    )
    result = evaluate_cancellation_policy(booking, at=WITHIN_WINDOW)
    assert result.allowed is False
    assert result.refund_percent == 0


@pytest.mark.parametrize(
    "policy_type, percent",
    [
        (CancellationPolicyType.FULL, 100),
        (CancellationPolicyType.PARTIAL, 50),
    ],
)
def test_past_deadline_blocks_for_full_and_partial(policy_type, percent):
    booking = _base_booking(
        policy_type_applied=policy_type,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=percent,
    )
    result = evaluate_cancellation_policy(booking, at=AFTER_DEADLINE)
    assert result.allowed is False
    assert result.refund_percent == 0


def test_zero_or_missing_hours_limit_skips_time_check():
    """Without a time gate the user may cancel any time and gets the stored percent."""
    booking = _base_booking(
        policy_type_applied=CancellationPolicyType.PARTIAL,
        policy_hours_limit_applied=0,
        policy_refund_percent_applied=50,
    )
    # Even one second before check-in is OK when there's no hours limit.
    result = evaluate_cancellation_policy(booking, at=AFTER_DEADLINE)
    assert result.allowed is True
    assert result.refund_percent == 50
