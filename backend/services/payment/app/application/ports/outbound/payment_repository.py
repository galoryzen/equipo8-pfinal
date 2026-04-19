from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Payment, PaymentAttempt, PaymentIntent, WebhookEvent


class PaymentRepository(ABC):
    @abstractmethod
    async def get_intent_by_id(self, intent_id: UUID) -> PaymentIntent | None:
        pass

    @abstractmethod
    async def get_intent_by_start_idempotency_key(self, key: str) -> PaymentIntent | None:
        pass

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
    async def try_insert_webhook_event(self, row: WebhookEvent) -> bool:
        """Return True if inserted, False if idempotency key already existed."""
