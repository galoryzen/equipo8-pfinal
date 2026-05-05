"""Orchestrate the definitive booking creation after payment is confirmed.

Flow: PENDING_PAYMENT → PENDING_CONFIRMATION → CONFIRMED.
Triggered by a PaymentSucceeded domain event.
"""

import logging
from datetime import UTC, datetime
from uuid import UUID

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CONFIRMED, BookingConfirmedPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.use_cases.mark_booking_pending_confirmation import (
    MarkBookingPendingConfirmationUseCase,
)
from app.domain.models import BookingStatus, new_status_history_row

logger = logging.getLogger(__name__)


class ConfirmBookingAfterPaymentUseCase:
    """Orchestrate: PENDING_PAYMENT → PENDING_CONFIRMATION → CONFIRMED after PaymentSucceeded.

    When inventory is unavailable the booking stays in PENDING_CONFIRMATION so
    the hotel can review it manually.  All other failure modes propagate as
    exceptions so the event bus can retry.
    """

    def __init__(self, repo: BookingRepository, events: DomainEventPublisher) -> None:
        self._repo = repo
        self._events = events
        self._mark = MarkBookingPendingConfirmationUseCase(repo)

    async def execute(self, booking_id: UUID, payment_intent_id: UUID) -> None:
        """Run the full orchestration for a confirmed payment."""
        await self._mark.execute(booking_id, payment_intent_id)

        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise BookingNotFoundError()

        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            logger.warning(
                "ConfirmBookingAfterPaymentUseCase: booking %s is in state %s after "
                "mark step, expected PENDING_CONFIRMATION; skipping auto-confirm",
                booking_id,
                booking.status,
            )
            return

        has_inventory = await self._repo.check_inventory(booking)
        if not has_inventory:
            logger.warning(
                "ConfirmBookingAfterPaymentUseCase: no inventory available for booking %s; "
                "leaving in PENDING_CONFIRMATION for manual hotel review",
                booking_id,
            )
            return

        now = datetime.now(UTC).replace(tzinfo=None)
        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = now
        await self._repo.update(booking)
        await self._repo.decrement_inventory(booking)
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.PENDING_CONFIRMATION,
                to_status=BookingStatus.CONFIRMED,
                reason="payment_auto_confirmed",
            )
        )
        await self._events.publish(
            DomainEventEnvelope(
                event_type=BOOKING_CONFIRMED,
                payload=BookingConfirmedPayload(
                    booking_id=booking.id,
                    user_id=booking.user_id,
                    property_id=booking.property_id,
                    checkin=booking.checkin,
                    checkout=booking.checkout,
                    guests_count=booking.guests_count or 1,
                    total_amount=booking.total_amount,
                    currency_code=booking.currency_code,
                ).model_dump(mode="json"),
            )
        )
        logger.info(
            "ConfirmBookingAfterPaymentUseCase: booking %s auto-confirmed after payment %s",
            booking_id,
            payment_intent_id,
        )
