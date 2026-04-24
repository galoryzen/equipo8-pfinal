"""Transition booking to PENDING_CONFIRMATION after the PSP authorizes the payment."""

from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import BookingStatus, new_status_history_row


class MarkBookingPendingConfirmationUseCase:
    """Idempotent transition PENDING_PAYMENT → PENDING_CONFIRMATION. Replays with the same intent are no-op."""

    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID, payment_intent_id: UUID) -> None:
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise BookingNotFoundError()

        if booking.status == BookingStatus.PENDING_CONFIRMATION:
            if booking.confirmation_payment_intent_id == payment_intent_id:
                return
            raise InvalidBookingStateError(
                "Booking already associated with a different payment intent"
            )

        if booking.status != BookingStatus.PENDING_PAYMENT:
            raise InvalidBookingStateError(
                f"Cannot mark booking pending confirmation from state {booking.status.value}"
            )

        now = datetime.now(UTC).replace(tzinfo=None)
        if booking.hold_expires_at is not None and booking.hold_expires_at <= now:
            raise InvalidBookingStateError("Booking hold has expired")

        booking.status = BookingStatus.PENDING_CONFIRMATION
        booking.confirmation_payment_intent_id = payment_intent_id
        booking.updated_at = now
        await self._repo.save(booking)
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.PENDING_PAYMENT,
                to_status=BookingStatus.PENDING_CONFIRMATION,
                reason=f"payment_succeeded:{payment_intent_id}",
            )
        )
