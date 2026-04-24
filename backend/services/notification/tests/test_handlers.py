from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CONFIRMED, BookingConfirmedPayload

from app.adapters.inbound.events.handlers import make_booking_confirmed_handler
from app.application.ports.outbound.property_client import PropertySummary
from app.application.ports.outbound.user_contact_client import UserContact


def _envelope():
    payload = BookingConfirmedPayload(
        booking_id=uuid4(),
        user_id=uuid4(),
        property_id=uuid4(),
        checkin=date(2026, 5, 1),
        checkout=date(2026, 5, 5),
        guests_count=1,
        total_amount=Decimal("300.00"),
        currency_code="USD",
    )
    return DomainEventEnvelope(event_type=BOOKING_CONFIRMED, payload=payload.model_dump(mode="json"))


def _session_factory_with(mock_session):
    """Return a callable that yields mock_session from `async with`."""
    factory = MagicMock()
    cm = AsyncMock()
    cm.__aenter__.return_value = mock_session
    cm.__aexit__.return_value = False
    factory.return_value = cm
    # Default: the idempotency check returns "not present" so the use case
    # proceeds past the early-exit branch. Tests can override.
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = result
    return factory


@pytest.mark.asyncio
async def test_handler_commits_on_success():
    session = AsyncMock()
    factory = _session_factory_with(session)
    contacts = AsyncMock()
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties = AsyncMock()
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(), name="Luna", city_name="Cartagena", country="Colombia", image_url=None
    )
    email_sender = AsyncMock()
    email_sender.send.return_value = "msg-1"

    handler = make_booking_confirmed_handler(factory, contacts, properties, email_sender)
    await handler(_envelope())

    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_handler_rolls_back_and_reraises_on_failure():
    session = AsyncMock()
    factory = _session_factory_with(session)
    contacts = AsyncMock()
    contacts.get_contact.side_effect = RuntimeError("auth unreachable")
    properties = AsyncMock()
    email_sender = AsyncMock()

    handler = make_booking_confirmed_handler(factory, contacts, properties, email_sender)
    with pytest.raises(RuntimeError, match="auth unreachable"):
        await handler(_envelope())

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
