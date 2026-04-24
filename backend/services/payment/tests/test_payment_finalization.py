from unittest.mock import AsyncMock

import pytest

from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.exceptions import PaymentIntentNotFoundError
from app.application.use_cases.payment_finalization import PaymentFinalizationService
from app.domain.event_names import PAYMENT_SUCCEEDED, PAYMENT_FAILED
from app.domain.models import PaymentIntentStatus
from tests.conftest import make_payment_intent


@pytest.mark.asyncio
async def test_finalize_from_event_pending_ok_token():
    intent = make_payment_intent(mock_payment_token="tok_mock_ok")
    fresh = make_payment_intent(
        id=intent.id, booking_id=intent.booking_id, user_id=intent.user_id,
        mock_payment_token="tok_mock_ok",
    )

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_success = AsyncMock()
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, events, MockPaymentGateway())
    await svc.finalize_from_event(intent)

    repo.persist_success.assert_awaited_once()
    assert events.publish.call_args[0][0].event_type == PAYMENT_SUCCEEDED


@pytest.mark.asyncio
async def test_finalize_from_event_pending_decline_token():
    intent = make_payment_intent(mock_payment_token="tok_mock_decline")
    fresh = make_payment_intent(
        id=intent.id, booking_id=intent.booking_id,
        mock_payment_token="tok_mock_decline",
    )

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_failure = AsyncMock()
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, events, MockPaymentGateway())
    await svc.finalize_from_event(intent)

    repo.persist_failure.assert_awaited_once()
    published = events.publish.call_args[0][0]
    assert published.event_type == PAYMENT_FAILED
    assert published.payload["reason"] == "mock_decline:event"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "terminal_status",
    [PaymentIntentStatus.SUCCEEDED, PaymentIntentStatus.FAILED],
)
async def test_finalize_from_event_already_terminal_is_noop(terminal_status):
    intent = make_payment_intent(status=terminal_status)
    repo = AsyncMock()
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, events, MockPaymentGateway())
    await svc.finalize_from_event(intent)

    repo.get_intent_by_id.assert_not_awaited()
    events.publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_apply_terminal_outcome_intent_missing_after_refresh():
    intent = make_payment_intent(mock_payment_token="tok_mock_ok")
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=None)
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, events, MockPaymentGateway())
    with pytest.raises(PaymentIntentNotFoundError):
        await svc.finalize_from_event(intent)
