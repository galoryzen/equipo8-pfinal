from datetime import datetime

from app.application.dto import BookingForPayment
from app.application.exceptions import BookingNotPayableError

_PAYABLE_STATUSES = frozenset({"PENDING_PAYMENT", "PENDING_CONFIRMATION"})


def assert_booking_payable_for_intent(snapshot: BookingForPayment, now: datetime) -> None:
    if snapshot.status not in _PAYABLE_STATUSES:
        raise BookingNotPayableError(
            f"Booking must be PENDING_PAYMENT or PENDING_CONFIRMATION, got {snapshot.status}"
        )
    if snapshot.hold_expires_at is not None and snapshot.hold_expires_at <= now:
        raise BookingNotPayableError("Booking hold has expired")
