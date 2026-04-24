from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CONFIRMED, BookingConfirmedPayload

from app.application.exceptions import NotificationEnrichmentError
from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.property_client import PropertyClient, PropertySummary
from app.application.ports.outbound.user_contact_client import UserContact, UserContactClient
from app.application.use_cases.send_booking_confirmation import (
    SendBookingConfirmationEmailUseCase,
)
from app.domain.models import NotificationStatus


def _make_envelope() -> DomainEventEnvelope:
    payload = BookingConfirmedPayload(
        booking_id=uuid4(),
        user_id=uuid4(),
        property_id=uuid4(),
        checkin=date(2026, 5, 1),
        checkout=date(2026, 5, 5),
        guests_count=2,
        total_amount=Decimal("1200.00"),
        currency_code="USD",
    )
    return DomainEventEnvelope(event_type=BOOKING_CONFIRMED, payload=payload.model_dump(mode="json"))


def _mocks():
    repo = AsyncMock(spec=NotificationRepository)
    contacts = AsyncMock(spec=UserContactClient)
    properties = AsyncMock(spec=PropertyClient)
    sender = AsyncMock(spec=EmailSender)
    return repo, contacts, properties, sender


@pytest.mark.asyncio
async def test_happy_path_sends_email_and_marks_sent():
    repo, contacts, properties, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(),
        name="Hotel Luna",
        city_name="Cartagena",
        country="Colombia",
        image_url="https://cdn.example.com/luna-hero.jpg",
    )
    sender.send.return_value = "msg-123"

    envelope = _make_envelope()
    uc = SendBookingConfirmationEmailUseCase(repo, contacts, properties, sender)
    await uc.execute(envelope)

    sender.send.assert_awaited_once()
    call_kwargs = sender.send.await_args.kwargs
    assert call_kwargs["to"] == "ana@test.com"
    assert "Hotel Luna" in call_kwargs["subject"]
    assert "Ana" in call_kwargs["text"]
    assert "Cartagena" in call_kwargs["html"]
    assert "https://cdn.example.com/luna-hero.jpg" in call_kwargs["html"]
    assert "<img" in call_kwargs["html"]

    repo.create.assert_awaited_once()
    created = repo.create.await_args.args[0]
    assert created.event_id == envelope.event_id
    assert created.to_email == "ana@test.com"
    assert created.status == NotificationStatus.PENDING

    repo.mark_sent.assert_awaited_once()
    assert repo.mark_sent.await_args.args[1] == "msg-123"


@pytest.mark.asyncio
async def test_skips_when_event_already_processed():
    repo, contacts, properties, sender = _mocks()
    repo.exists_by_event_id.return_value = True

    uc = SendBookingConfirmationEmailUseCase(repo, contacts, properties, sender)
    await uc.execute(_make_envelope())

    sender.send.assert_not_awaited()
    repo.create.assert_not_awaited()
    contacts.get_contact.assert_not_awaited()
    properties.get_summary.assert_not_awaited()


@pytest.mark.asyncio
async def test_marks_failed_and_reraises_when_sender_errors():
    repo, contacts, properties, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(),
        name="Hotel Luna",
        city_name="Cartagena",
        country="Colombia",
        image_url="https://cdn.example.com/luna-hero.jpg",
    )
    sender.send.side_effect = RuntimeError("SES throttled")

    uc = SendBookingConfirmationEmailUseCase(repo, contacts, properties, sender)
    with pytest.raises(RuntimeError, match="throttled"):
        await uc.execute(_make_envelope())

    repo.create.assert_awaited_once()
    repo.mark_failed.assert_awaited_once()
    repo.mark_sent.assert_not_awaited()


@pytest.mark.asyncio
async def test_renders_without_image_tag_when_property_has_no_image():
    repo, contacts, properties, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(),
        name="Hotel Luna",
        city_name="Cartagena",
        country="Colombia",
        image_url=None,
    )
    sender.send.return_value = "msg-no-image"

    uc = SendBookingConfirmationEmailUseCase(repo, contacts, properties, sender)
    await uc.execute(_make_envelope())

    html = sender.send.await_args.kwargs["html"]
    assert "<img" not in html
    assert "Hotel Luna" in html  # text content still present


@pytest.mark.asyncio
async def test_enrichment_error_propagates_without_email_attempt():
    repo, contacts, properties, sender = _mocks()
    repo.exists_by_event_id.return_value = False
    contacts.get_contact.side_effect = NotificationEnrichmentError("auth 503")

    uc = SendBookingConfirmationEmailUseCase(repo, contacts, properties, sender)
    with pytest.raises(NotificationEnrichmentError):
        await uc.execute(_make_envelope())

    sender.send.assert_not_awaited()
    repo.create.assert_not_awaited()
