import logging
import secrets
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PaymentRequestedPayload
from shared.events import DomainEventPublisher

from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.application.use_cases.payment_finalization import PaymentFinalizationService
from app.domain.models import PaymentIntent, PaymentIntentStatus

logger = logging.getLogger(__name__)


class ProcessPaymentRequestedUseCase:
    def __init__(
        self,
        repo: PaymentRepository,
        events: DomainEventPublisher,
        payment_gateway: PaymentGatewayPort,
    ):
        self._repo = repo
        self._finalizer = PaymentFinalizationService(repo, events, payment_gateway)

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        payload = PaymentRequestedPayload.model_validate(envelope.payload)

        intent = await self._repo.get_intent_by_start_idempotency_key(payload.idempotency_key)
        if intent is None:
            intent = await self._create_intent(payload)
            logger.info(
                "Created intent from event intent_id=%s booking_id=%s idempotency_key=%s",
                intent.id,
                intent.booking_id,
                payload.idempotency_key,
            )

        await self._finalizer.finalize_from_event(intent)

    async def _create_intent(self, payload: PaymentRequestedPayload) -> PaymentIntent:
        token_suffix = "_decline" if payload.force_decline else ""
        now = datetime.now(UTC).replace(tzinfo=None)
        intent = PaymentIntent(
            id=uuid.uuid4(),
            booking_id=payload.booking_id,
            user_id=payload.user_id,
            amount=payload.amount,
            currency_code=payload.currency,
            status=PaymentIntentStatus.PENDING,
            mock_payment_token=f"tok_mock_{uuid.uuid4().hex}{token_suffix}",
            webhook_signing_secret=f"whsec_{secrets.token_urlsafe(24)}",
            start_idempotency_key=payload.idempotency_key,
            payment_id=None,
            created_at=now,
            updated_at=now,
        )
        return await self._repo.add_intent(intent)
