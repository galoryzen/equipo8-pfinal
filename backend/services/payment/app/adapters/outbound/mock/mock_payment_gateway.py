from app.application.ports.outbound.payment_gateway_port import (
    AuthorizationOutcome,
    PaymentGatewayPort,
)


class MockPaymentGateway(PaymentGatewayPort):
    """In-process mock PSP: deterministic decline when the token contains the substring `_decline`."""

    def authorize_payment_instrument(self, payment_instrument_token: str) -> AuthorizationOutcome:
        if "_decline" in payment_instrument_token:
            return AuthorizationOutcome(succeeded=False, decline_reason="mock_declined")
        return AuthorizationOutcome(succeeded=True)
