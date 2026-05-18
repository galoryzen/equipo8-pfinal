"""Server-side flags for hotel partner actions on bookings (portal list + detail)."""

from datetime import UTC, date, datetime

from app.domain.cancellation_policy import evaluate_cancellation_policy
from app.domain.models import Booking, BookingStatus


def hotel_can_register_check_out(booking: Booking, *, today: date, viewer_is_hotel: bool) -> bool:
    """True only when the hotel may call ``POST .../check-out`` for this row (see register_guest_check_out)."""
    if not viewer_is_hotel:
        return False
    return (
        booking.status == BookingStatus.CHECKED_IN
        and booking.actual_checkin_at is not None
        and booking.checkout <= today
        and booking.actual_checkout_at is None
    )


def traveler_can_cancel_booking(booking: Booking) -> bool:
    """True only when the traveler may call ``POST .../cancel`` for this booking.

    Cancellation is allowed only for CONFIRMED bookings whose policy permits it.
    """
    if booking.status != BookingStatus.CONFIRMED:
        return False
    now = datetime.now(UTC).replace(tzinfo=None)
    evaluation = evaluate_cancellation_policy(booking, at=now)
    return evaluation.allowed
