"""Refund the traveler when a booking is rejected by the hotel.

Triggered by `BookingRejected` consumed from the bus. Per
`docs/flujo-reembolso.md` §3.4–3.5, this is always a 100% refund of
`payment.authorized_amount`. No event is published after the refund (§3.2);
notification service will later consume `BookingRejected` directly or
subscribe to a `PaymentRefunded` event when that's added.
"""

import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingRejectedPayload

from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.models import PaymentIntentStatus, Refund

logger = logging.getLogger(__name__)


class RefundOnBookingRejectedUseCase:
    """Idempotent: at most one refund row per payment_id."""

    def __init__(self, repo: PaymentRepository, gateway: PaymentGatewayPort):
        self._repo = repo
        self._gateway = gateway

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        payload = BookingRejectedPayload.model_validate(envelope.payload)

        intent = await self._repo.get_intent_by_booking_id(payload.booking_id)
        if intent is None or intent.status != PaymentIntentStatus.SUCCEEDED:
            logger.info(
                "Refund no-op for booking=%s: no successful payment intent",
                payload.booking_id,
            )
            return

        payment = await self._repo.get_payment_by_intent_id(intent.id)
        if payment is None:
            logger.warning(
                "Intent %s in SUCCEEDED but no linked Payment row — data invariant violation",
                intent.id,
            )
            return

        existing = await self._repo.find_refund_by_payment_id(payment.id)
        if existing is not None:
            logger.info(
                "Refund already exists for payment=%s booking=%s — skip",
                payment.id,
                payload.booking_id,
            )
            return

        outcome = self._gateway.refund_payment(payment.id, payment.authorized_amount)
        status = "SUCCEEDED" if outcome.succeeded else "FAILED"
        refund = Refund(
            id=uuid.uuid4(),
            payment_id=payment.id,
            amount=payment.authorized_amount,
            status=status,
            reason="hotel_rejected",
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await self._repo.add_refund(refund)
        logger.info(
            "Refund issued: payment=%s booking=%s amount=%s status=%s",
            payment.id,
            payload.booking_id,
            payment.authorized_amount,
            status,
        )
