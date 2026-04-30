import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PaymentFailedPayload, PaymentSucceededPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import PaymentIntentNotFoundError
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.event_names import PAYMENT_FAILED, PAYMENT_SUCCEEDED
from app.domain.models import (
    Payment,
    PaymentAttempt,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentTransactionStatus,
)

logger = logging.getLogger(__name__)


class PaymentFinalizationService:
    """Terminal transition for consumer-driven payment finalization."""

    def __init__(
        self,
        repo: PaymentRepository,
        events: DomainEventPublisher,
        payment_gateway: PaymentGatewayPort,
    ):
        self._repo = repo
        self._events = events
        self._payment_gateway = payment_gateway

    async def finalize_from_event(self, intent: PaymentIntent) -> None:
        """Consumer-driven finalize: calls the PSP with the stored token. Idempotent by intent.status."""
        if intent.status == PaymentIntentStatus.SUCCEEDED:
            return
        if intent.status == PaymentIntentStatus.FAILED:
            return
        outcome = self._payment_gateway.authorize_payment_instrument(intent.mock_payment_token)
        await self._apply_terminal_outcome(intent, outcome.succeeded, context="event")

    async def _apply_terminal_outcome(self, intent: PaymentIntent, success: bool, context: str) -> None:
        fresh = await self._repo.get_intent_by_id(intent.id)
        if fresh is None:
            raise PaymentIntentNotFoundError()
        intent = fresh

        now = datetime.now(UTC).replace(tzinfo=None)
        if success:
            charge = Payment(
                id=uuid.uuid4(),
                booking_id=intent.booking_id,
                provider="mock_psp",
                status=PaymentTransactionStatus.CAPTURED,
                authorized_amount=intent.amount,
                captured_amount=intent.amount,
                currency_code=intent.currency_code,
                payment_token=intent.mock_payment_token,
                provider_reference=str(intent.id),
                processed_at=now,
                created_at=now,
                updated_at=now,
            )
            await self._repo.persist_success(intent, charge)
            envelope = DomainEventEnvelope(
                event_type=PAYMENT_SUCCEEDED,
                payload=PaymentSucceededPayload(
                    payment_intent_id=intent.id,
                    booking_id=intent.booking_id,
                    payment_id=charge.id,
                    amount=intent.amount,
                    currency=intent.currency_code,
                ).model_dump(mode="json"),
            )
            await self._events.publish(envelope)
            return

        detail = f"mock_decline:{context}"
        attempt = PaymentAttempt(
            id=uuid.uuid4(),
            payment_intent_id=intent.id,
            outcome="failed",
            detail=detail,
            created_at=now,
        )
        await self._repo.persist_failure(intent, attempt)
        envelope = DomainEventEnvelope(
            event_type=PAYMENT_FAILED,
            payload=PaymentFailedPayload(
                payment_intent_id=intent.id,
                booking_id=intent.booking_id,
                user_id=intent.user_id,
                reason=attempt.detail,
            ).model_dump(mode="json"),
        )
        await self._events.publish(envelope)
