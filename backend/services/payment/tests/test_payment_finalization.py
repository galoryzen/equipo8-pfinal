import uuid
from unittest.mock import AsyncMock

import pytest

from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.application.exceptions import (
    BookingNotPayableError,
    BookingSnapshotError,
    InvalidMockPaymentTokenError,
    PaymentAlreadyTerminalError,
    PaymentIntentNotFoundError,
    PaymentNotAllowedError,
)
from app.application.use_cases.payment_finalization import PaymentFinalizationService
from app.domain.event_names import PAYMENT_COMPLETED, PAYMENT_FAILED
from app.domain.models import PaymentIntentStatus
from tests.conftest import make_payment_intent


@pytest.mark.asyncio
async def test_finalize_from_confirm_succeeds_and_applies_terminal_success():
    intent = make_payment_intent(mock_payment_token="tok_mock_ok")
    fresh = make_payment_intent(id=intent.id, booking_id=intent.booking_id, user_id=intent.user_id)

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_success = AsyncMock()
    booking = AsyncMock()
    events = AsyncMock()
    gw = MockPaymentGateway()

    svc = PaymentFinalizationService(repo, booking, events, gw)
    out = await svc.finalize_from_confirm(intent, intent.user_id, "tok_mock_ok")

    assert out.status == "succeeded"
    repo.persist_success.assert_awaited_once()
    booking.notify_payment_confirmed.assert_awaited_once_with(intent.booking_id, intent.id)
    events.publish.assert_awaited()
    call_kw = events.publish.call_args[0]
    assert call_kw[0] == PAYMENT_COMPLETED


@pytest.mark.asyncio
async def test_finalize_from_confirm_gateway_decline():
    intent = make_payment_intent(mock_payment_token="tok_mock_fail")
    fresh = make_payment_intent(id=intent.id)

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_failure = AsyncMock()
    booking = AsyncMock()
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, booking, events, MockPaymentGateway())
    out = await svc.finalize_from_confirm(intent, intent.user_id, "tok_mock_fail")

    assert out.status == "failed"
    repo.persist_failure.assert_awaited_once()
    booking.notify_payment_confirmed.assert_not_called()
    assert events.publish.call_args[0][0] == PAYMENT_FAILED


@pytest.mark.asyncio
async def test_finalize_from_confirm_wrong_user():
    intent = make_payment_intent()
    svc = PaymentFinalizationService(AsyncMock(), AsyncMock(), AsyncMock(), MockPaymentGateway())
    with pytest.raises(PaymentNotAllowedError):
        await svc.finalize_from_confirm(intent, uuid.uuid4(), intent.mock_payment_token)


@pytest.mark.asyncio
async def test_finalize_from_confirm_wrong_token():
    intent = make_payment_intent(mock_payment_token="tok_a")
    svc = PaymentFinalizationService(AsyncMock(), AsyncMock(), AsyncMock(), MockPaymentGateway())
    with pytest.raises(InvalidMockPaymentTokenError):
        await svc.finalize_from_confirm(intent, intent.user_id, "tok_b")


@pytest.mark.asyncio
async def test_finalize_from_webhook_succeeded_idempotent_variants():
    intent = make_payment_intent(status=PaymentIntentStatus.SUCCEEDED)
    svc = PaymentFinalizationService(AsyncMock(), AsyncMock(), AsyncMock(), MockPaymentGateway())

    await svc.finalize_from_webhook(intent, want_success=True)
    await svc.finalize_from_webhook(intent, want_success=False)


@pytest.mark.asyncio
async def test_finalize_from_webhook_failed_idempotent_and_raises_on_retry_success():
    failed = make_payment_intent(status=PaymentIntentStatus.FAILED)
    svc = PaymentFinalizationService(AsyncMock(), AsyncMock(), AsyncMock(), MockPaymentGateway())

    await svc.finalize_from_webhook(failed, want_success=False)

    with pytest.raises(PaymentAlreadyTerminalError):
        await svc.finalize_from_webhook(failed, want_success=True)


@pytest.mark.asyncio
async def test_apply_terminal_outcome_intent_missing_after_refresh():
    intent = make_payment_intent()
    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=None)
    svc = PaymentFinalizationService(repo, AsyncMock(), AsyncMock(), MockPaymentGateway())

    with pytest.raises(PaymentIntentNotFoundError):
        await svc.finalize_from_confirm(intent, intent.user_id, intent.mock_payment_token)


@pytest.mark.asyncio
async def test_apply_terminal_success_booking_snapshot_error_propagates():
    intent = make_payment_intent()
    fresh = make_payment_intent(id=intent.id, booking_id=intent.booking_id)

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_success = AsyncMock()
    booking = AsyncMock()
    booking.notify_payment_confirmed = AsyncMock(side_effect=BookingSnapshotError("down"))

    svc = PaymentFinalizationService(repo, booking, AsyncMock(), MockPaymentGateway())
    with pytest.raises(BookingSnapshotError):
        await svc.finalize_from_confirm(intent, intent.user_id, intent.mock_payment_token)


@pytest.mark.asyncio
async def test_apply_terminal_success_booking_not_payable_propagates():
    intent = make_payment_intent()
    fresh = make_payment_intent(id=intent.id)

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_success = AsyncMock()
    booking = AsyncMock()
    booking.notify_payment_confirmed = AsyncMock(side_effect=BookingNotPayableError("nope"))

    svc = PaymentFinalizationService(repo, booking, AsyncMock(), MockPaymentGateway())
    with pytest.raises(BookingNotPayableError):
        await svc.finalize_from_confirm(intent, intent.user_id, intent.mock_payment_token)


@pytest.mark.asyncio
async def test_finalize_from_webhook_pending_runs_failure_path():
    intent = make_payment_intent(status=PaymentIntentStatus.PENDING)
    fresh = make_payment_intent(id=intent.id, status=PaymentIntentStatus.PENDING)

    repo = AsyncMock()
    repo.get_intent_by_id = AsyncMock(return_value=fresh)
    repo.persist_failure = AsyncMock()
    events = AsyncMock()

    svc = PaymentFinalizationService(repo, AsyncMock(), events, MockPaymentGateway())
    await svc.finalize_from_webhook(intent, want_success=False)

    repo.persist_failure.assert_awaited_once()
    assert events.publish.call_args[0][0] == PAYMENT_FAILED
