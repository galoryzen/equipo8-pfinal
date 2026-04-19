import uuid
from unittest.mock import AsyncMock

import pytest

from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.exceptions import (
    PaymentIntentNotFoundError,
    WebhookAuthError,
    WebhookIdempotentReplayError,
)
from app.application.use_cases.process_mock_webhook import ProcessMockWebhookUseCase
from app.domain.models import PaymentIntentStatus
from tests.conftest import make_payment_intent


@pytest.mark.asyncio
async def test_execute_raises_when_intent_not_found():
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=None)
    uc = ProcessMockWebhookUseCase(repo, AsyncMock(), MockPaymentGateway())

    with pytest.raises(PaymentIntentNotFoundError):
        await uc.execute(
            payment_intent_id=uuid.uuid4(),
            idempotency_key="k1",
            webhook_signing_secret="whsec_x",
            want_success=True,
        )


@pytest.mark.asyncio
async def test_execute_webhook_auth_error():
    intent = make_payment_intent(webhook_signing_secret="whsec_expected")
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=intent)
    uc = ProcessMockWebhookUseCase(repo, AsyncMock(), MockPaymentGateway())

    with pytest.raises(WebhookAuthError):
        await uc.execute(
            payment_intent_id=intent.id,
            idempotency_key="k1",
            webhook_signing_secret="wrong",
            want_success=True,
        )


@pytest.mark.asyncio
async def test_execute_idempotent_replay():
    intent = make_payment_intent(webhook_signing_secret="whsec_ok")
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=intent)
    repo.try_insert_webhook_event = AsyncMock(return_value=False)
    uc = ProcessMockWebhookUseCase(repo, AsyncMock(), MockPaymentGateway())

    with pytest.raises(WebhookIdempotentReplayError):
        await uc.execute(
            payment_intent_id=intent.id,
            idempotency_key="dup",
            webhook_signing_secret="whsec_ok",
            want_success=True,
        )


@pytest.mark.asyncio
async def test_execute_raises_when_intent_vanishes_after_insert():
    intent = make_payment_intent(webhook_signing_secret="whsec_ok")
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(side_effect=[intent, None])
    repo.try_insert_webhook_event = AsyncMock(return_value=True)
    uc = ProcessMockWebhookUseCase(repo, AsyncMock(), MockPaymentGateway())

    with pytest.raises(PaymentIntentNotFoundError):
        await uc.execute(
            payment_intent_id=intent.id,
            idempotency_key="k1",
            webhook_signing_secret="whsec_ok",
            want_success=True,
        )


@pytest.mark.asyncio
async def test_execute_happy_path_delegates_to_finalizer():
    intent = make_payment_intent(
        status=PaymentIntentStatus.PENDING,
        webhook_signing_secret="whsec_ok",
        mock_payment_token="tok_mock_ok",
    )
    fresh = make_payment_intent(
        id=intent.id,
        status=PaymentIntentStatus.PENDING,
        webhook_signing_secret="whsec_ok",
        mock_payment_token="tok_mock_ok",
    )

    repo = AsyncMock()
    # execute loads intent twice; finalizer refetches inside _apply_terminal_outcome
    repo.get_intent_by_id = AsyncMock(side_effect=[intent, fresh, fresh])
    repo.try_insert_webhook_event = AsyncMock(return_value=True)
    repo.persist_success = AsyncMock()
    events = AsyncMock()

    uc = ProcessMockWebhookUseCase(repo, events, MockPaymentGateway())
    await uc.execute(
        payment_intent_id=intent.id,
        idempotency_key="k1",
        webhook_signing_secret="whsec_ok",
        want_success=True,
    )

    repo.persist_success.assert_awaited_once()
    events.publish.assert_awaited()
