from uuid import UUID

from shared.events import DomainEventPublisher

from app.application.exceptions import PaymentIntentNotFoundError
from app.application.ports.outbound.booking_client_port import BookingServiceClient
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.application.use_cases.payment_finalization import PaymentFinalizationService
from app.schemas.payment import ConfirmPaymentOut


class ConfirmPaymentIntentUseCase:
    def __init__(
        self,
        repo: PaymentRepository,
        booking: BookingServiceClient,
        events: DomainEventPublisher,
        payment_gateway: PaymentGatewayPort,
    ):
        self._repo = repo
        self._finalizer = PaymentFinalizationService(repo, booking, events, payment_gateway)

    async def execute(
        self,
        *,
        payment_intent_id: UUID,
        user_id: UUID,
        payment_token: str,
    ) -> ConfirmPaymentOut:
        intent = await self._repo.get_intent_by_id(payment_intent_id)
        if intent is None:
            raise PaymentIntentNotFoundError()
        return await self._finalizer.finalize_from_confirm(intent, user_id, payment_token)
