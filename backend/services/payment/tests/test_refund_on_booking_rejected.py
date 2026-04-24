import uuid
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_REJECTED

from app.application.ports.outbound.payment_gateway_port import RefundOutcome
from app.application.use_cases.refund_on_booking_rejected import (
    RefundOnBookingRejectedUseCase,
)
from app.domain.models import Payment, PaymentIntentStatus, PaymentTransactionStatus, Refund
from tests.conftest import make_payment_intent


def _envelope(booking_id: uuid.UUID) -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=BOOKING_REJECTED,
        payload={
            "booking_id": str(booking_id),
            "user_id": str(uuid.uuid4()),
            "reason": "overbooked",
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
async def test_refund_happy_path_creates_row_and_calls_gateway():
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("150.00"),
    )
    payment = _payment(intent.id, Decimal("150.00"))

    repo = AsyncMock()
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_abc")
    )

    uc = RefundOnBookingRejectedUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id))

    gateway.refund_payment.assert_called_once_with(payment.id, payment.authorized_amount)
    repo.add_refund.assert_awaited_once()
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.payment_id == payment.id
    assert refund.amount == Decimal("150.00")
    assert refund.status == "SUCCEEDED"
    assert refund.reason == "hotel_rejected"


@pytest.mark.asyncio
async def test_refund_noop_when_no_intent_for_booking():
    repo = AsyncMock()
    repo.get_intent_by_booking_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock()

    uc = RefundOnBookingRejectedUseCase(repo, gateway)
    await uc.execute(_envelope(uuid.uuid4()))

    gateway.refund_payment.assert_not_called()
    repo.add_refund.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "non_success_status",
    [PaymentIntentStatus.PENDING, PaymentIntentStatus.FAILED],
)
async def test_refund_noop_when_intent_not_succeeded(non_success_status):
    booking_id = uuid.uuid4()
    intent = make_payment_intent(booking_id=booking_id, status=non_success_status)

    repo = AsyncMock()
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock()
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock()

    uc = RefundOnBookingRejectedUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id))

    repo.get_payment_by_intent_id.assert_not_awaited()
    gateway.refund_payment.assert_not_called()
    repo.add_refund.assert_not_awaited()


@pytest.mark.asyncio
async def test_refund_idempotent_when_refund_row_already_exists():
    booking_id = uuid.uuid4()
    intent = make_payment_intent(booking_id=booking_id, status=PaymentIntentStatus.SUCCEEDED)
    payment = _payment(intent.id)
    existing_refund = Refund(
        id=uuid.uuid4(),
        payment_id=payment.id,
        amount=payment.authorized_amount,
        status="SUCCEEDED",
        reason="hotel_rejected",
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )

    repo = AsyncMock()
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=existing_refund)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock()

    uc = RefundOnBookingRejectedUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id))

    gateway.refund_payment.assert_not_called()
    repo.add_refund.assert_not_awaited()


@pytest.mark.asyncio
async def test_refund_noop_when_payment_row_missing_for_succeeded_intent():
    """Defensive guard for data-invariant violation: intent SUCCEEDED but no Payment row."""
    booking_id = uuid.uuid4()
    intent = make_payment_intent(booking_id=booking_id, status=PaymentIntentStatus.SUCCEEDED)

    repo = AsyncMock()
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock()

    uc = RefundOnBookingRejectedUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id))

    gateway.refund_payment.assert_not_called()
    repo.add_refund.assert_not_awaited()
