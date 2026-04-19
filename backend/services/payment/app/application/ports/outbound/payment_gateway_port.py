from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class AuthorizationOutcome:
    """Result of authorizing a payment instrument token at the PSP (mock or real)."""

    succeeded: bool
    decline_reason: str | None = None


class PaymentGatewayPort(ABC):
    """Outbound port for the payment service provider (mock implementation in this increment)."""

    @abstractmethod
    def authorize_payment_instrument(self, payment_instrument_token: str) -> AuthorizationOutcome:
        """Authorize or decline using an opaque token (e.g. tokenization reference). Never receives PAN."""
