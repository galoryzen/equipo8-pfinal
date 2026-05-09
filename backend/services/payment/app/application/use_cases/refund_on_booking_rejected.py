"""Refund the traveler when a booking is rejected by the hotel.

Triggered by `BookingRejected` consumed from the bus. Per
`docs/flujo-reembolso.md` §3.4–3.5, this is always a 100% refund of
`payment.authorized_amount`. No event is published after the refund (§3.2);
notification service will later consume `BookingRejected` directly or
subscribe to a `PaymentRefunded` event when that's added.
"""

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingRejectedPayload

from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.application.use_cases.refund_booking_payment_common import refund_eligible_payment_for_booking


class RefundOnBookingRejectedUseCase:
    """Idempotent: at most one refund row per payment_id."""

    def __init__(self, repo: PaymentRepository, gateway: PaymentGatewayPort):
        self._repo = repo
        self._gateway = gateway

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        payload = BookingRejectedPayload.model_validate(envelope.payload)
        # Default of 100 in the payload schema covers any in-flight legacy events
        # that were queued before refund_percent was added.
        await refund_eligible_payment_for_booking(
            self._repo,
            self._gateway,
            payload.booking_id,
            refund_reason="hotel_rejected",
            refund_percent=payload.refund_percent,
        )
