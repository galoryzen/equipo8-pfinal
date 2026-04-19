"""Transition booking to CONFIRMED after a successful payment (payment service callback)."""

from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import BookingStatus


class ConfirmBookingAfterPaymentUseCase:
    """Idempotent confirmation: same payment_intent_id replays as success."""

    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID, payment_intent_id: UUID) -> None:
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise BookingNotFoundError()

        if booking.status == BookingStatus.CONFIRMED:
            if booking.confirmation_payment_intent_id == payment_intent_id:
                return
            raise InvalidBookingStateError("Booking already confirmed with a different payment")

        if booking.status not in (BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_CONFIRMATION):
            raise InvalidBookingStateError(
                f"Cannot confirm payment for booking in state {booking.status.value}"
            )

        now = datetime.now(UTC).replace(tzinfo=None)
        if booking.hold_expires_at is not None and booking.hold_expires_at <= now:
            raise InvalidBookingStateError("Booking hold has expired")

        booking.status = BookingStatus.CONFIRMED
        booking.confirmation_payment_intent_id = payment_intent_id
        booking.updated_at = now
        await self._repo.save(booking)
