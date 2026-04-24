from decimal import Decimal
from uuid import UUID, uuid4

from app.application.ports.outbound.payment_gateway_port import (
    AuthorizationOutcome,
    PaymentGatewayPort,
    RefundOutcome,
)


class MockPaymentGateway(PaymentGatewayPort):
    """In-process mock PSP: deterministic decline when the token contains the substring `_decline`."""

    def authorize_payment_instrument(self, payment_instrument_token: str) -> AuthorizationOutcome:
        if "_decline" in payment_instrument_token:
            return AuthorizationOutcome(succeeded=False, decline_reason="mock_declined")
        return AuthorizationOutcome(succeeded=True)

    def refund_payment(self, payment_id: UUID, amount: Decimal) -> RefundOutcome:  # noqa: ARG002
        # No failure simulation in MVP — mock PSP always refunds.
        return RefundOutcome(succeeded=True, reference=f"mock_refund_{uuid4().hex}")
