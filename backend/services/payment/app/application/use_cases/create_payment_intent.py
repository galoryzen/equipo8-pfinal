import secrets
import uuid
from datetime import UTC, datetime
from uuid import UUID

from app.application.dto import BookingForPayment
from app.application.exceptions import (
    BookingNotFoundError,
    BookingNotPayableError,
    BookingSnapshotError,
)
from app.application.payment_rules import assert_booking_payable_for_intent
from app.application.ports.outbound.booking_client_port import BookingServiceClient
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.models import PaymentIntent, PaymentIntentStatus
from app.schemas.payment import PaymentIntentCreatedOut


class CreatePaymentIntentUseCase:
    def __init__(
        self,
        repo: PaymentRepository,
        booking_client: BookingServiceClient,
    ):
        self._repo = repo
        self._booking = booking_client

    async def execute(
        self,
        *,
        booking_id: UUID,
        user_id: UUID,
        authorization_header_value: str,
        idempotency_key: str | None,
    ) -> PaymentIntentCreatedOut:
        snapshot: BookingForPayment
        try:
            snapshot = await self._booking.get_booking_for_user(booking_id, authorization_header_value)
        except BookingNotFoundError:
            raise
        except BookingSnapshotError:
            raise
        if snapshot.id != booking_id:
            raise BookingSnapshotError("Booking id mismatch")

        now = datetime.now(UTC).replace(tzinfo=None)
        try:
            assert_booking_payable_for_intent(snapshot, now)
        except BookingNotPayableError:
            raise

        if idempotency_key:
            existing = await self._repo.get_intent_by_start_idempotency_key(idempotency_key)
            if existing is not None:
                if existing.booking_id == booking_id and existing.user_id == user_id:
                    return PaymentIntentCreatedOut(
                        payment_intent_id=existing.id,
                        mock_payment_token=existing.mock_payment_token,
                        amount=existing.amount,
                        currency_code=existing.currency_code,
                        webhook_signing_secret=existing.webhook_signing_secret,
                    )
                raise BookingNotPayableError("Idempotency-Key already used for a different booking")

        mock_token = f"tok_mock_{uuid.uuid4().hex}"
        wh_secret = f"whsec_{secrets.token_urlsafe(24)}"
        intent = PaymentIntent(
            id=uuid.uuid4(),
            booking_id=booking_id,
            user_id=user_id,
            amount=snapshot.total_amount,
            currency_code=snapshot.currency_code,
            status=PaymentIntentStatus.PENDING,
            mock_payment_token=mock_token,
            start_idempotency_key=idempotency_key,
            webhook_signing_secret=wh_secret,
            payment_id=None,
            created_at=now,
            updated_at=now,
        )
        saved = await self._repo.add_intent(intent)
        return PaymentIntentCreatedOut(
            payment_intent_id=saved.id,
            mock_payment_token=saved.mock_payment_token,
            amount=saved.amount,
            currency_code=saved.currency_code,
            webhook_signing_secret=saved.webhook_signing_secret,
        )
