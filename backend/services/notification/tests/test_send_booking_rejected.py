from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_REJECTED, BookingRejectedPayload

from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.user_contact_client import UserContact, UserContactClient
from app.application.use_cases.send_booking_rejected import (
    SendBookingRejectedEmailUseCase,
)
from app.domain.models import BOOKING_REJECTED_TYPE, NotificationChannel, NotificationStatus


def _envelope(reason: str | None = "Hotel overbooked") -> DomainEventEnvelope:
    payload = BookingRejectedPayload(booking_id=uuid4(), user_id=uuid4(), reason=reason)
    return DomainEventEnvelope(event_type=BOOKING_REJECTED, payload=payload.model_dump(mode="json"))


def _mocks():
    repo = AsyncMock(spec=NotificationRepository)
    contacts = AsyncMock(spec=UserContactClient)
    sender = AsyncMock(spec=EmailSender)
    return repo, contacts, sender


@pytest.mark.asyncio
async def test_happy_path_sends_rejection_email_and_marks_sent():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    sender.send.return_value = "msg-rej-1"

    envelope = _envelope("Hotel overbooked")
    uc = SendBookingRejectedEmailUseCase(repo, contacts, sender)
    await uc.execute(envelope)

    sender.send.assert_awaited_once()
    kwargs = sender.send.await_args.kwargs
    assert kwargs["to"] == "ana@test.com"
    assert "Reserva rechazada" in kwargs["subject"]
    assert "Ana" in kwargs["text"]
    assert "Hotel overbooked" in kwargs["html"]
    assert "100" in kwargs["html"]  # refund_percent

    repo.create.assert_awaited_once()
    created = repo.create.await_args.args[0]
    assert created.channel == NotificationChannel.EMAIL
    assert created.type == BOOKING_REJECTED_TYPE
    assert created.status == NotificationStatus.PENDING

    repo.mark_sent.assert_awaited_once()


@pytest.mark.asyncio
async def test_omits_reason_block_when_payload_has_no_reason():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    sender.send.return_value = "msg-no-reason"

    uc = SendBookingRejectedEmailUseCase(repo, contacts, sender)
    await uc.execute(_envelope(reason=None))

    html = sender.send.await_args.kwargs["html"]
    assert "Motivo" not in html


@pytest.mark.asyncio
async def test_skips_when_event_already_processed():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id_and_channel.return_value = True

    uc = SendBookingRejectedEmailUseCase(repo, contacts, sender)
    await uc.execute(_envelope())

    contacts.get_contact.assert_not_awaited()
    sender.send.assert_not_awaited()
    repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_marks_failed_and_reraises_when_sender_errors():
    repo, contacts, sender = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    sender.send.side_effect = RuntimeError("SES throttled")

    uc = SendBookingRejectedEmailUseCase(repo, contacts, sender)
    with pytest.raises(RuntimeError, match="throttled"):
        await uc.execute(_envelope())

    repo.create.assert_awaited_once()
    repo.mark_failed.assert_awaited_once()
    repo.mark_sent.assert_not_awaited()
