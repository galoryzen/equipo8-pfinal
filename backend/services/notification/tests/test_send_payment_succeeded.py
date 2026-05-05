from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PAYMENT_SUCCEEDED, PaymentSucceededPayload

from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.user_contact_client import UserContact, UserContactClient
from app.application.use_cases.send_payment_succeeded import (
    SendPaymentSucceededEmailUseCase,
)
from app.domain.models import NotificationStatus


def _make_envelope() -> DomainEventEnvelope:
    payload = PaymentSucceededPayload(
        payment_intent_id=uuid4(),
        booking_id=uuid4(),
        payment_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("150.00"),
        currency="USD",
    )
    return DomainEventEnvelope(event_type=PAYMENT_SUCCEEDED, payload=payload.model_dump(mode="json"))


def _mocks():
    repo = AsyncMock(spec=NotificationRepository)
    contacts = AsyncMock(spec=UserContactClient)
    sender = AsyncMock(spec=EmailSender)
    return repo, contacts, sender


@pytest.mark.asyncio
async def test_happy_path_sends_email_and_marks_sent():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Carlos", email="carlos@test.com")
    sender.send.return_value = "msg-789"

    envelope = _make_envelope()
    uc = SendPaymentSucceededEmailUseCase(repo, contacts, sender)
    await uc.execute(envelope)

    sender.send.assert_awaited_once()
    call_kwargs = sender.send.await_args.kwargs
    assert call_kwargs["to"] == "carlos@test.com"
    assert "Pago aprobado" in call_kwargs["subject"]
    assert "Carlos" in call_kwargs["text"]
    assert "Referencia de transacci\u00f3n" in call_kwargs["html"]
    assert "Total cobrado" in call_kwargs["html"]

    repo.create.assert_awaited_once()
    created = repo.create.await_args.args[0]
    assert created.event_id == envelope.event_id
    assert created.to_email == "carlos@test.com"
    assert created.type == "PAYMENT_SUCCEEDED"
    assert created.status == NotificationStatus.PENDING

    repo.mark_sent.assert_awaited_once()
    assert repo.mark_sent.await_args.args[1] == "msg-789"


@pytest.mark.asyncio
async def test_skips_when_event_already_processed():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id.return_value = True

    envelope = _make_envelope()
    uc = SendPaymentSucceededEmailUseCase(repo, contacts, sender)
    await uc.execute(envelope)

    sender.send.assert_not_awaited()
    repo.create.assert_not_awaited()
    repo.mark_sent.assert_not_awaited()


@pytest.mark.asyncio
async def test_marks_failed_and_reraises_when_sender_errors():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Carlos", email="carlos@test.com")
    sender.send.side_effect = RuntimeError("SES throttled")

    envelope = _make_envelope()
    uc = SendPaymentSucceededEmailUseCase(repo, contacts, sender)
    with pytest.raises(RuntimeError, match="throttled"):
        await uc.execute(envelope)

    repo.create.assert_awaited_once()
    repo.mark_failed.assert_awaited_once()
    repo.mark_sent.assert_not_awaited()
