from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class AuthorizationOutcome:
    """Result of authorizing a payment instrument token at the PSP (mock or real)."""

    succeeded: bool
    decline_reason: str | None = None


@dataclass(frozen=True)
class RefundOutcome:
    """Result of refunding a previously-authorized payment at the PSP."""

    succeeded: bool
    reference: str | None = None
    failure_reason: str | None = None


class PaymentGatewayPort(ABC):
    """Outbound port for the payment service provider (mock implementation in this increment)."""

    @abstractmethod
    def authorize_payment_instrument(self, payment_instrument_token: str) -> AuthorizationOutcome:
        """Authorize or decline using an opaque token (e.g. tokenization reference). Never receives PAN."""

    @abstractmethod
    def refund_payment(self, payment_id: UUID, amount: Decimal) -> RefundOutcome:
        """Refund a previously-authorized payment by its Payment id for the given amount."""
