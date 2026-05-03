"""Refund the traveler when a CONFIRMED booking is cancelled by the traveler (policy allowed)."""

import logging

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingCancelledPayload

from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.application.use_cases.refund_booking_payment_common import refund_eligible_payment_for_booking

logger = logging.getLogger(__name__)


class RefundOnBookingCancelledUseCase:
    """Idempotent: at most one refund row per payment_id."""

    _REFUND_REASON = "traveler_cancelled"

    def __init__(self, repo: PaymentRepository, gateway: PaymentGatewayPort):
        self._repo = repo
        self._gateway = gateway

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        payload = BookingCancelledPayload.model_validate(envelope.payload)
        logger.info("Processing BOOKING_CANCELLED for booking_id=%s", payload.booking_id)
        await refund_eligible_payment_for_booking(
            self._repo,
            self._gateway,
            payload.booking_id,
            refund_reason=self._REFUND_REASON,
        )
