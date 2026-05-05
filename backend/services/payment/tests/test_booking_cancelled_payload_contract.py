"""Regression guard for the async cancel → refund event contract."""

from uuid import uuid4

import pytest
from contracts.events.booking import (
    BOOKING_CANCELLED,
    BOOKING_REJECTED,
    BookingCancelledPayload,
    BookingRejectedPayload,
)
from pydantic import ValidationError


def test_booking_cancelled_event_type_constant():
    assert BOOKING_CANCELLED == "BookingCancelled"


def test_booking_cancelled_payload_round_trip_with_refund_percent():
    bid, uid = uuid4(), uuid4()
    payload = BookingCancelledPayload(
        booking_id=bid, user_id=uid, reason="traveler_cancelled", refund_percent=50
    )
    dumped = payload.model_dump(mode="json")
    assert dumped["booking_id"] == str(bid)
    assert dumped["user_id"] == str(uid)
    assert dumped["reason"] == "traveler_cancelled"
    assert dumped["refund_percent"] == 50
    # Field names stable for publishers/consumers
    assert set(dumped.keys()) >= {"booking_id", "user_id", "reason", "refund_percent"}


def test_booking_cancelled_payload_refund_percent_is_required():
    bid, uid = uuid4(), uuid4()
    with pytest.raises(ValidationError) as exc:
        BookingCancelledPayload(booking_id=bid, user_id=uid, reason="traveler_cancelled")
    # Missing field name surfaces in the error
    assert "refund_percent" in str(exc.value)


@pytest.mark.parametrize("bad_value", [-1, 101, 200])
def test_booking_cancelled_payload_rejects_out_of_range_refund_percent(bad_value):
    bid, uid = uuid4(), uuid4()
    with pytest.raises(ValidationError):
        BookingCancelledPayload(
            booking_id=bid, user_id=uid, reason="x", refund_percent=bad_value
        )


def test_booking_rejected_payload_refund_percent_defaults_to_100():
    """Backwards-compat: in-flight events queued before refund_percent existed."""
    bid, uid = uuid4(), uuid4()
    # Validate from a dict that omits refund_percent (simulates a stale message body).
    payload = BookingRejectedPayload.model_validate(
        {
            "booking_id": str(bid),
            "user_id": str(uid),
            "reason": "overbooked",
        }
    )
    assert payload.refund_percent == 100
    assert BOOKING_REJECTED == "BookingRejected"


@pytest.mark.parametrize("bad_value", [-1, 101])
def test_booking_rejected_payload_rejects_out_of_range_refund_percent(bad_value):
    bid, uid = uuid4(), uuid4()
    with pytest.raises(ValidationError):
        BookingRejectedPayload(
            booking_id=bid, user_id=uid, reason="x", refund_percent=bad_value
        )
