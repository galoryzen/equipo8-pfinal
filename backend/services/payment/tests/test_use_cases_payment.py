import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from app.application.dto import BookingForPayment
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from app.domain.models import PaymentIntent


@pytest.mark.asyncio
async def test_create_payment_intent_returns_token_and_persists():
    repo = AsyncMock()
    booking = AsyncMock()
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

    uc = CreatePaymentIntentUseCase(repo, booking)
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
