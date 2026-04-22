"""Dispatch PaymentAuthorized / PaymentFailed events consumed from the bus."""

import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import (
    PAYMENT_AUTHORIZED,
    PAYMENT_FAILED,
    PaymentAuthorizedPayload,
    PaymentFailedPayload,
)

from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.use_cases.mark_booking_pending_confirmation import (
    MarkBookingPendingConfirmationUseCase,
)
from app.domain.models import BookingStatus, BookingStatusHistory

logger = logging.getLogger(__name__)


class HandlePaymentResultUseCase:
    """Dispatch a PaymentAuthorized or PaymentFailed event onto the booking domain."""

    def __init__(self, repo: BookingRepository):
        self._repo = repo
        self._mark = MarkBookingPendingConfirmationUseCase(repo)

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        if envelope.event_type == PAYMENT_AUTHORIZED:
            payload = PaymentAuthorizedPayload.model_validate(envelope.payload)
            await self._mark.execute(
                booking_id=payload.booking_id,
                payment_intent_id=payload.payment_intent_id,
            )
            return

        if envelope.event_type == PAYMENT_FAILED:
            payload = PaymentFailedPayload.model_validate(envelope.payload)
            await self._record_payment_failed(payload)
            return

        logger.warning(
            "HandlePaymentResultUseCase: unexpected event_type=%s event_id=%s",
            envelope.event_type,
            envelope.event_id,
        )

    async def _record_payment_failed(self, payload: PaymentFailedPayload) -> None:
        reason = f"payment_failed:{payload.payment_intent_id}:{payload.reason}"

        existing = await self._repo.find_last_status_history_by_reason(
            payload.booking_id, reason
        )
        if existing is not None:
            return

        booking = await self._repo.get_by_id(payload.booking_id)
        if booking is None:
            logger.warning(
                "PaymentFailed for unknown booking_id=%s intent=%s",
                payload.booking_id,
                payload.payment_intent_id,
            )
            return

        row = BookingStatusHistory(
            id=uuid.uuid4(),
            booking_id=payload.booking_id,
            from_status=BookingStatus.PENDING_PAYMENT,
            to_status=BookingStatus.PENDING_PAYMENT,
            reason=reason,
            changed_by=None,
            changed_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await self._repo.add_status_history(row)
