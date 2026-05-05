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


def _envelope(booking_id: uuid.UUID, *, refund_percent: int = 100) -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=BOOKING_CANCELLED,
        payload={
            "booking_id": str(booking_id),
            "user_id": str(uuid.uuid4()),
            "reason": "traveler_cancelled",
            "refund_percent": refund_percent,
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
async def test_refund_on_booking_cancelled_full_refund_path():
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
    await uc.execute(_envelope(booking_id, refund_percent=100))

    gateway.refund_payment.assert_called_once_with(payment.id, payment.authorized_amount)
    repo.add_refund.assert_awaited_once()
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.amount == Decimal("150.00")
    assert refund.reason == "traveler_cancelled"
    assert refund.status == "SUCCEEDED"


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_partial_50_percent_refunds_half():
    """PARTIAL policy with 50% must refund half the authorized amount, not the full amount."""
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("360.00"),
    )
    payment = _payment(intent.id, Decimal("360.00"))

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(return_value=None)
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_partial")
    )

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id, refund_percent=50))

    gateway.refund_payment.assert_called_once_with(payment.id, Decimal("180.00"))
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.amount == Decimal("180.00")


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_rounds_half_up_at_half_cent():
    """authorized=100.01, percent=50 → 50.005 → ROUND_HALF_UP → 50.01."""
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("100.01"),
    )
    payment = _payment(intent.id, Decimal("100.01"))

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(return_value=None)
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_round")
    )

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id, refund_percent=50))

    gateway.refund_payment.assert_called_once_with(payment.id, Decimal("50.01"))
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.amount == Decimal("50.01")


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_quantization_matches_source_precision():
    """Currency-agnostic: a zero-decimal authorized amount yields a zero-decimal refund."""
    booking_id = uuid.uuid4()
    # Simulate a future zero-decimal currency: authorized has no fractional digits.
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("100"),
    )
    payment = _payment(intent.id, Decimal("100"))

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(return_value=None)
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock(
        return_value=RefundOutcome(succeeded=True, reference="mock_refund_jpy")
    )

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id, refund_percent=50))

    refund: Refund = repo.add_refund.await_args.args[0]
    # The refund must inherit the source's exponent: Decimal("50"), not Decimal("50.00").
    assert refund.amount == Decimal("50")
    assert refund.amount.as_tuple().exponent == Decimal("100").as_tuple().exponent


@pytest.mark.asyncio
async def test_refund_on_booking_cancelled_zero_percent_skips_gateway_records_zero():
    """Defensive: zero-percent event still writes a zero refund row for idempotency."""
    booking_id = uuid.uuid4()
    intent = make_payment_intent(
        booking_id=booking_id,
        status=PaymentIntentStatus.SUCCEEDED,
        amount=Decimal("200.00"),
    )
    payment = _payment(intent.id, Decimal("200.00"))

    repo = AsyncMock()
    repo.find_refund_by_booking_id = AsyncMock(return_value=None)
    repo.get_intent_by_booking_id = AsyncMock(return_value=intent)
    repo.get_payment_by_intent_id = AsyncMock(return_value=payment)
    repo.find_refund_by_payment_id = AsyncMock(return_value=None)
    repo.add_refund = AsyncMock()

    gateway = MagicMock()
    gateway.refund_payment = MagicMock()

    uc = RefundOnBookingCancelledUseCase(repo, gateway)
    await uc.execute(_envelope(booking_id, refund_percent=0))

    gateway.refund_payment.assert_not_called()
    repo.add_refund.assert_awaited_once()
    refund: Refund = repo.add_refund.await_args.args[0]
    assert refund.amount == Decimal("0.00")
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
    env = _envelope(booking_id, refund_percent=100)
    await uc.execute(env)
    await uc.execute(env)

    assert gateway.refund_payment.call_count == 1
    assert repo.add_refund.await_count == 1
    assert repo.get_intent_by_booking_id.await_count == 1
