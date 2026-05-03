"""Unit tests for domain cancellation policy evaluation (no DB, no use case)."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.domain.cancellation_policy import evaluate_cancellation_policy
from app.domain.models import Booking, BookingStatus, CancellationPolicyType

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")


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


def test_policy_allows_cancellation_when_before_deadline():
    """FULL with 48h limit: ``at`` is well before check-in minus 48 hours → allowed."""
    booking = _base_booking()
    at = datetime(2026, 4, 1, 12, 0, 0)
    assert evaluate_cancellation_policy(booking, at=at).allowed is True


def test_policy_blocks_cancellation_when_inside_policy_window():
    """FULL with 48h limit: ``at`` is after deadline (too close to check-in) → blocked."""
    booking = _base_booking()
    at = datetime(2026, 5, 31, 12, 0, 0)
    assert evaluate_cancellation_policy(booking, at=at).allowed is False
