"""Regression guard for the async cancel → refund event contract."""

from uuid import uuid4

from contracts.events.booking import BOOKING_CANCELLED, BookingCancelledPayload


def test_booking_cancelled_event_type_constant():
    assert BOOKING_CANCELLED == "BookingCancelled"


def test_booking_cancelled_payload_has_required_fields():
    bid, uid = uuid4(), uuid4()
    payload = BookingCancelledPayload(booking_id=bid, user_id=uid, reason="traveler_cancelled")
    dumped = payload.model_dump(mode="json")
    assert dumped["booking_id"] == str(bid)
    assert dumped["user_id"] == str(uid)
    assert dumped["reason"] == "traveler_cancelled"
    # Field names stable for publishers/consumers
    assert set(dumped.keys()) >= {"booking_id", "user_id", "reason"}
