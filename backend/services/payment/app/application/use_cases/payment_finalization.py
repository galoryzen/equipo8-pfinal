import logging
import uuid
from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import (
    BookingNotPayableError,
    BookingSnapshotError,
    InvalidMockPaymentTokenError,
    PaymentAlreadyTerminalError,
    PaymentIntentNotFoundError,
    PaymentNotAllowedError,
)
from app.application.ports.outbound.booking_client_port import BookingServiceClient
from app.application.ports.outbound.domain_event_publisher import DomainEventPublisher
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.event_names import PAYMENT_COMPLETED, PAYMENT_FAILED
from app.domain.models import (
    Payment,
    PaymentAttempt,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentTransactionStatus,
)
from app.schemas.payment import ConfirmPaymentOut

logger = logging.getLogger(__name__)


class PaymentFinalizationService:
    """Shared terminal transition for synchronous confirm and async mock webhook."""

    def __init__(
        self,
        repo: PaymentRepository,
        booking: BookingServiceClient,
        events: DomainEventPublisher,
        payment_gateway: PaymentGatewayPort,
    ):
        self._repo = repo
        self._booking = booking
        self._events = events
        self._payment_gateway = payment_gateway

    async def finalize_from_confirm(
        self,
        intent: PaymentIntent,
        user_id: UUID,
        submitted_token: str,
    ) -> ConfirmPaymentOut:
        if intent.status == PaymentIntentStatus.SUCCEEDED:
            return ConfirmPaymentOut(
                status="already_succeeded",
                payment_intent_id=intent.id,
                booking_id=intent.booking_id,
            )
        if intent.status == PaymentIntentStatus.FAILED:
            raise PaymentAlreadyTerminalError("Create a new payment intent to retry")

        if intent.user_id != user_id:
            raise PaymentNotAllowedError()
        if submitted_token != intent.mock_payment_token:
            raise InvalidMockPaymentTokenError("Payment token does not match this intent")
        outcome = self._payment_gateway.authorize_payment_instrument(submitted_token)
        success = outcome.succeeded
        await self._apply_terminal_outcome(intent, success, context="sync_confirm")
        return ConfirmPaymentOut(
            status="succeeded" if success else "failed",
            payment_intent_id=intent.id,
            booking_id=intent.booking_id,
        )

    async def finalize_from_webhook(
        self,
        intent: PaymentIntent,
        want_success: bool,
    ) -> None:
        if intent.status == PaymentIntentStatus.SUCCEEDED:
            if want_success:
                return
            logger.warning("Webhook wanted failure but intent already succeeded: %s", intent.id)
            return
        if intent.status == PaymentIntentStatus.FAILED:
            if not want_success:
                return
            raise PaymentAlreadyTerminalError("Intent already failed; create a new payment intent")

        await self._apply_terminal_outcome(intent, want_success, context="webhook")

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
            try:
                await self._booking.notify_payment_confirmed(intent.booking_id, intent.id)
            except (BookingSnapshotError, BookingNotPayableError):
                logger.exception(
                    "Payment captured but booking callback failed (intent=%s context=%s)",
                    intent.id,
                    context,
                )
                raise
            await self._events.publish(
                PAYMENT_COMPLETED,
                {
                    "payment_intent_id": str(intent.id),
                    "booking_id": str(intent.booking_id),
                    "payment_id": str(charge.id),
                    "amount": str(intent.amount),
                    "currency": intent.currency_code,
                },
            )
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
        await self._events.publish(
            PAYMENT_FAILED,
            {
                "payment_intent_id": str(intent.id),
                "booking_id": str(intent.booking_id),
                "reason": attempt.detail,
            },
        )
