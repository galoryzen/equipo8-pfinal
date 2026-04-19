import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.dto import BookingForPayment
from app.application.exceptions import PaymentAlreadyTerminalError
from app.application.use_cases.confirm_payment_intent import ConfirmPaymentIntentUseCase
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from app.domain.models import PaymentIntent, PaymentIntentStatus
from app.application.use_cases.payment_finalization import PaymentFinalizationService


@pytest.mark.asyncio
async def test_create_payment_intent_returns_token_and_persists():
    repo = AsyncMock()
    booking = AsyncMock()
    events = AsyncMock()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    snap = BookingForPayment(
        id=uuid.UUID("90000000-0000-0000-0000-000000000002"),
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("280.00"),
        currency_code="USD",
        hold_expires_at=future,
    )
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    saved = None

    async def _add_intent(intent: PaymentIntent):
        nonlocal saved
        saved = intent
        return intent

    repo.add_intent = AsyncMock(side_effect=_add_intent)

    uc = CreatePaymentIntentUseCase(repo, booking, events)
    out = await uc.execute(
        booking_id=snap.id,
        user_id=uuid.UUID("a0000000-0000-0000-0000-000000000002"),
        authorization_header_value="Bearer x",
        idempotency_key=None,
    )
    assert out.amount == Decimal("280.00")
    assert out.mock_payment_token.startswith("tok_mock_")
    assert out.webhook_signing_secret.startswith("whsec_")
    repo.add_intent.assert_awaited_once()
    events.publish.assert_awaited()


@pytest.mark.asyncio
async def test_confirm_idempotent_when_already_succeeded():
    repo = AsyncMock()
    booking = AsyncMock()
    events = AsyncMock()
    intent = PaymentIntent(
        id=uuid.uuid4(),
        booking_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        amount=Decimal("10.00"),
        currency_code="USD",
        status=PaymentIntentStatus.SUCCEEDED,
        mock_payment_token="tok_mock_x",
        start_idempotency_key=None,
        webhook_signing_secret="whsec_s",
        payment_id=uuid.uuid4(),
        created_at=datetime.now(UTC).replace(tzinfo=None),
        updated_at=datetime.now(UTC).replace(tzinfo=None),
    )
    repo.get_intent_by_id = AsyncMock(return_value=intent)
    uc = ConfirmPaymentIntentUseCase(repo, booking, events, MockPaymentGateway())
    out = await uc.execute(
        payment_intent_id=intent.id,
        user_id=intent.user_id,
        payment_token="tok_mock_x",
    )
    assert out.status == "already_succeeded"
    booking.notify_payment_confirmed.assert_not_called()


@pytest.mark.asyncio
async def test_finalize_raises_when_intent_failed_and_confirm_retries():
    repo = AsyncMock()
    booking = AsyncMock()
    events = AsyncMock()
    intent = PaymentIntent(
        id=uuid.uuid4(),
        booking_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        amount=Decimal("10.00"),
        currency_code="USD",
        status=PaymentIntentStatus.FAILED,
        mock_payment_token="tok_mock_x",
        start_idempotency_key=None,
        webhook_signing_secret="whsec_s",
        payment_id=None,
        created_at=datetime.now(UTC).replace(tzinfo=None),
        updated_at=datetime.now(UTC).replace(tzinfo=None),
    )
    svc = PaymentFinalizationService(repo, booking, events, MockPaymentGateway())
    with pytest.raises(PaymentAlreadyTerminalError):
        await svc.finalize_from_confirm(intent, intent.user_id, "tok_mock_x")
