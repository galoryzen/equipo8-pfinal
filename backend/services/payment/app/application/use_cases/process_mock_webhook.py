from datetime import UTC, datetime
from uuid import UUID

from shared.events import DomainEventPublisher

from app.application.exceptions import (
    PaymentIntentNotFoundError,
    WebhookAuthError,
    WebhookIdempotentReplayError,
)
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.application.use_cases.payment_finalization import PaymentFinalizationService
from app.domain.models import WebhookEvent


class ProcessMockWebhookUseCase:
    def __init__(
        self,
        repo: PaymentRepository,
        events: DomainEventPublisher,
        payment_gateway: PaymentGatewayPort,
    ):
        self._repo = repo
        self._finalizer = PaymentFinalizationService(repo, events, payment_gateway)

    async def execute(
        self,
        *,
        payment_intent_id: UUID,
        idempotency_key: str,
        webhook_signing_secret: str,
        want_success: bool,
    ) -> None:
        intent = await self._repo.get_intent_by_id(payment_intent_id)
        if intent is None:
            raise PaymentIntentNotFoundError()
        if webhook_signing_secret != intent.webhook_signing_secret:
            raise WebhookAuthError()

        now = datetime.now(UTC).replace(tzinfo=None)
        row = WebhookEvent(
            idempotency_key=idempotency_key,
            payment_intent_id=intent.id,
            received_at=now,
        )
        if not await self._repo.try_insert_webhook_event(row):
            raise WebhookIdempotentReplayError()

        fresh = await self._repo.get_intent_by_id(payment_intent_id)
        if fresh is None:
            raise PaymentIntentNotFoundError()
        await self._finalizer.finalize_from_webhook(fresh, want_success=want_success)
