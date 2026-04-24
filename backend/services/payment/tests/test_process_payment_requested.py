import uuid
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PAYMENT_REQUESTED

from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.use_cases.process_payment_requested import ProcessPaymentRequestedUseCase
from app.domain.event_names import PAYMENT_SUCCEEDED, PAYMENT_FAILED
from app.domain.models import PaymentIntentStatus
from tests.conftest import make_payment_intent


def _build_envelope(
    *,
    booking_id=None,
    user_id=None,
    amount="100.00",
    currency="USD",
    idempotency_key="test-key",
    force_decline=False,
) -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=PAYMENT_REQUESTED,
        payload={
            "booking_id": str(booking_id or uuid.uuid4()),
            "user_id": str(user_id or uuid.uuid4()),
            "amount": amount,
            "currency": currency,
            "idempotency_key": idempotency_key,
            "force_decline": force_decline,
        },
    )


@pytest.mark.asyncio
async def test_creates_intent_with_ok_token_and_finalizes():
    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=None)

    added_intents = []

    async def fake_add_intent(intent):
        added_intents.append(intent)
        return intent

    repo.add_intent = AsyncMock(side_effect=fake_add_intent)
    repo.get_intent_by_id = AsyncMock(side_effect=lambda iid: added_intents[0] if added_intents else None)
    repo.persist_success = AsyncMock()
    events = AsyncMock()

    uc = ProcessPaymentRequestedUseCase(repo, events, MockPaymentGateway())
    await uc.execute(_build_envelope(amount="150.00", idempotency_key="k1"))

    repo.add_intent.assert_awaited_once()
    created = repo.add_intent.call_args[0][0]
    assert "_decline" not in created.mock_payment_token
    assert created.start_idempotency_key == "k1"
    assert created.amount == Decimal("150.00")
    assert created.status == PaymentIntentStatus.PENDING

    repo.persist_success.assert_awaited_once()
    assert events.publish.call_args[0][0].event_type == PAYMENT_SUCCEEDED


@pytest.mark.asyncio
async def test_creates_intent_with_decline_token_when_flag_set():
    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=None)

    added_intents = []

    async def fake_add_intent(intent):
        added_intents.append(intent)
        return intent

    repo.add_intent = AsyncMock(side_effect=fake_add_intent)
    repo.get_intent_by_id = AsyncMock(side_effect=lambda iid: added_intents[0] if added_intents else None)
    repo.persist_failure = AsyncMock()
    events = AsyncMock()

    uc = ProcessPaymentRequestedUseCase(repo, events, MockPaymentGateway())
    await uc.execute(_build_envelope(force_decline=True, idempotency_key="k2"))

    created = repo.add_intent.call_args[0][0]
    assert created.mock_payment_token.endswith("_decline")

    repo.persist_failure.assert_awaited_once()
    assert events.publish.call_args[0][0].event_type == PAYMENT_FAILED


@pytest.mark.asyncio
async def test_reuses_existing_terminal_intent_by_idempotency_key():
    existing = make_payment_intent(
        status=PaymentIntentStatus.SUCCEEDED,
        mock_payment_token="tok_mock_existing",
        start_idempotency_key="dup-key",
    )
    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=existing)
    repo.add_intent = AsyncMock()
    events = AsyncMock()

    uc = ProcessPaymentRequestedUseCase(repo, events, MockPaymentGateway())
    await uc.execute(_build_envelope(idempotency_key="dup-key"))

    # Did not create a new intent; finalize is no-op because intent is terminal.
    repo.add_intent.assert_not_awaited()
    events.publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_reuses_existing_pending_intent_by_idempotency_key():
    existing = make_payment_intent(
        status=PaymentIntentStatus.PENDING,
        mock_payment_token="tok_mock_ok",
        start_idempotency_key="retry-key",
    )
    fresh = make_payment_intent(
        id=existing.id,
        booking_id=existing.booking_id,
        status=PaymentIntentStatus.PENDING,
        mock_payment_token="tok_mock_ok",
    )

    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=existing)
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.add_intent = AsyncMock()
    repo.persist_success = AsyncMock()
    events = AsyncMock()

    uc = ProcessPaymentRequestedUseCase(repo, events, MockPaymentGateway())
    await uc.execute(_build_envelope(idempotency_key="retry-key"))

    # Did not create; did finalize.
    repo.add_intent.assert_not_awaited()
    repo.persist_success.assert_awaited_once()
    assert events.publish.call_args[0][0].event_type == PAYMENT_SUCCEEDED


@pytest.mark.asyncio
async def test_parses_payload_validates_user_id_and_booking_id():
    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=None)

    added = []

    async def fake_add(intent):
        added.append(intent)
        return intent

    repo.add_intent = AsyncMock(side_effect=fake_add)
    repo.get_intent_by_id = AsyncMock(side_effect=lambda iid: added[0])
    repo.persist_success = AsyncMock()
    events = AsyncMock()

    booking_id = uuid.uuid4()
    user_id = uuid.uuid4()
    uc = ProcessPaymentRequestedUseCase(repo, events, MockPaymentGateway())
    await uc.execute(
        _build_envelope(booking_id=booking_id, user_id=user_id, idempotency_key="parse-k")
    )

    created = repo.add_intent.call_args[0][0]
    assert created.booking_id == booking_id
    assert created.user_id == user_id
