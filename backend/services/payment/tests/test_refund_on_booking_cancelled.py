import uuid
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CANCELLED

from app.application.ports.outbound.payment_gateway_port import RefundOutcome
from app.application.use_cases.refund_on_booking_cancelled import RefundOnBookingCancelledUseCase
from app.domain.models import Payment, PaymentIntentStatus, PaymentTransactionStatus, Refund
from tests.conftest import make_payment_intent


def _envelope(booking_id: uuid.UUID) -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=BOOKING_CANCELLED,
        payload={
            "booking_id": str(booking_id),
            "user_id": str(uuid.uuid4()),
            "reason": "traveler_cancelled",
        },
    )


def _payment(intent_id: uuid.UUID, amount: Decimal = Decimal("150.00")) -> Payment:
    now = datetime.now(UTC).replace(tzinfo=None)
    return Payment(
        id=uuid.uuid4(),
        booking_id=uuid.uuid4(),
        provider="mock_psp",
        status=PaymentTransactionStatus.CAPTURED,
        authorized_amount=amount,
        captured_amount=amount,
        currency_code="USD",
        payment_token="tok_mock_ok",
        provider_reference=str(intent_id),
        processed_at=now,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_happy_path():
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("150.00"),
    )
    payment = _payment(intent.id, Decimal("150.00"))

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(return_value=None)
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_cancel")
    )

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id))

    gateway.refund_payment.assert_called_once_with(payment.id, payment.authorized_amount)
    repo.add_refund.assert_awaited_once()
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.reason == "traveler_cancelled"
    assert refund.status == "SUCCEEDED"


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_idempotent_second_event_no_extra_refund():
    """Same BOOKING_CANCELLED envelope twice: one gateway refund, one DB row."""
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("90.00"),
    )
    payment = _payment(intent.id, Decimal("90.00"))
    existing = Refund(
        id=uuid.uuid4(),
        payment_id=payment.id,
        amount=payment.authorized_amount,
        status="SUCCEEDED",
        reason="traveler_cancelled",
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(side_effect=[None, existing])
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_once")
    )

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    env = _envelope(booking_id)
    await uc.execute(env)
    await uc.execute(env)

    assert gateway.refund_payment.call_count == 1
    assert repo.add_refund.await_count == 1
    assert repo.get_intent_by_booking_id.await_count == 1
