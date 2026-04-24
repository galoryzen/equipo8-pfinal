from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Payment, PaymentAttempt, PaymentIntent, Refund


class PaymentRepository(ABC):
    @abstractmethod
    async def get_intent_by_id(self, intent_id: UUID) -> PaymentIntent | None:
        pass

    @abstractmethod
    async def get_intent_by_start_idempotency_key(self, key: str) -> PaymentIntent | None:
        pass

    @abstractmethod
    async def get_intent_by_booking_id(self, booking_id: UUID) -> PaymentIntent | None:
        """Look up the PaymentIntent associated with a booking. Used by the refund flow
        to verify an authorization exists before issuing a refund."""

    @abstractmethod
    async def add_intent(self, intent: PaymentIntent) -> PaymentIntent:
        pass

    @abstractmethod
    async def persist_failure(self, intent: PaymentIntent, attempt: PaymentAttempt) -> None:
        pass

    @abstractmethod
    async def persist_success(self, intent: PaymentIntent, charge: Payment) -> None:
        pass

    @abstractmethod
    async def get_payment_by_intent_id(self, intent_id: UUID) -> Payment | None:
        """Fetch the Payment row linked to an intent (via intent.payment_id)."""

    @abstractmethod
    async def add_refund(self, refund: Refund) -> None:
        """Persist a new refund row."""

    @abstractmethod
    async def find_refund_by_payment_id(self, payment_id: UUID) -> Refund | None:
        """Idempotency guard: at most one refund per payment_id."""
