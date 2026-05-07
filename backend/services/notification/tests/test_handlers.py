from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import (
    BOOKING_CONFIRMED,
    BOOKING_REJECTED,
    BookingConfirmedPayload,
    BookingRejectedPayload,
)
from contracts.events.payment import PAYMENT_SUCCEEDED, PaymentSucceededPayload

from app.adapters.inbound.events.handlers import (
    make_booking_confirmed_handler,
    make_booking_rejected_handler,
    make_payment_succeeded_handler,
)
from app.application.ports.outbound.property_client import PropertySummary
from app.application.ports.outbound.user_contact_client import UserContact
from app.domain.models import DevicePlatform, DeviceToken


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


def _rejected_envelope(reason: str | None = "no rooms available"):
    payload = BookingRejectedPayload(booking_id=uuid4(), user_id=uuid4(), reason=reason)
    return DomainEventEnvelope(event_type=BOOKING_REJECTED, payload=payload.model_dump(mode="json"))


class _SessionRecorder:
    """Tracks commit/rollback calls across all sessions a session_factory yields.

    The booking handlers open multiple sessions (email, then push) on the same
    factory. AsyncMock.return_value reuses the same context manager, so we can
    sum commits/rollbacks across runs.
    """

    def __init__(self):
        self.session = AsyncMock()
        self.session.add = MagicMock()

    def factory(self):
        factory = MagicMock()
        cm = AsyncMock()
        cm.__aenter__.return_value = self.session
        cm.__aexit__.return_value = False
        factory.return_value = cm

        # Default idempotency check: row not present, so the use case proceeds.
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        self.session.execute.return_value = result
        return factory


def _device(user_id) -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=user_id,
        platform=DevicePlatform.IOS.value,
        token="ExponentPushToken[xxx]",
        is_active=True,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_booking_confirmed_handler_runs_email_and_push():
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties = AsyncMock()
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(), name="Luna", city_name="Cartagena", country="Colombia", image_url=None
    )
    email_sender = AsyncMock()
    email_sender.send.return_value = "msg-1"
    push_sender = AsyncMock()
    push_sender.send.return_value = ["push-1"]

    # Patch the device-token query: the use case calls
    # SqlAlchemyDeviceTokenRepository(session).list_active_by_user_id, which
    # ultimately runs session.execute. Override the result for that path by
    # replacing exec to return an active device.
    user_id = uuid4()
    contacts.get_contact.return_value = UserContact(id=user_id, full_name="Ana", email="ana@test.com")

    # The push handler asks the device-token adapter for active tokens. We
    # don't want the real adapter touching SQLAlchemy in this unit test, so
    # bypass it by stubbing list_active_by_user_id at the class level.
    from app.adapters.outbound.db import device_token_repository as dtr_module

    async def _fake_list(self, _user_id):
        return [_device(_user_id)]

    monkey_target = dtr_module.SqlAlchemyDeviceTokenRepository
    original = monkey_target.list_active_by_user_id
    monkey_target.list_active_by_user_id = _fake_list  # type: ignore[assignment]
    try:
        handler = make_booking_confirmed_handler(factory, contacts, properties, email_sender, push_sender)
        await handler(_envelope())
    finally:
        monkey_target.list_active_by_user_id = original  # type: ignore[assignment]

    email_sender.send.assert_awaited_once()
    push_sender.send.assert_awaited_once()
    assert push_sender.send.await_args.kwargs["data"]["type"] == "BOOKING_CONFIRMED"
    # Two successful sessions (email + push) should both commit.
    assert rec.session.commit.await_count == 2
    rec.session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_booking_confirmed_handler_email_failure_rolls_back_and_reraises():
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.side_effect = RuntimeError("auth unreachable")
    properties = AsyncMock()
    email_sender = AsyncMock()
    push_sender = AsyncMock()

    handler = make_booking_confirmed_handler(factory, contacts, properties, email_sender, push_sender)
    with pytest.raises(RuntimeError, match="auth unreachable"):
        await handler(_envelope())

    rec.session.rollback.assert_awaited_once()
    rec.session.commit.assert_not_awaited()
    push_sender.send.assert_not_awaited()


@pytest.mark.asyncio
async def test_booking_confirmed_handler_push_failure_does_not_break_email():
    """Email commit must stand even if the push send blows up."""
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    properties = AsyncMock()
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(), name="Luna", city_name="Cartagena", country="Colombia", image_url=None
    )
    email_sender = AsyncMock()
    email_sender.send.return_value = "msg-1"
    push_sender = AsyncMock()
    push_sender.send.side_effect = RuntimeError("expo down")

    from app.adapters.outbound.db import device_token_repository as dtr_module

    async def _fake_list(self, _user_id):
        return [_device(_user_id)]

    monkey_target = dtr_module.SqlAlchemyDeviceTokenRepository
    original = monkey_target.list_active_by_user_id
    monkey_target.list_active_by_user_id = _fake_list  # type: ignore[assignment]
    try:
        handler = make_booking_confirmed_handler(factory, contacts, properties, email_sender, push_sender)
        # Push errors are caught + logged; the handler must not propagate them.
        await handler(_envelope())
    finally:
        monkey_target.list_active_by_user_id = original  # type: ignore[assignment]

    email_sender.send.assert_awaited_once()
    push_sender.send.assert_awaited_once()
    # Email session committed; push session rolled back.
    assert rec.session.commit.await_count == 1
    assert rec.session.rollback.await_count == 1


@pytest.mark.asyncio
async def test_booking_rejected_handler_runs_email_and_push():
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Ana", email="ana@test.com")
    email_sender = AsyncMock()
    email_sender.send.return_value = "msg-1"
    push_sender = AsyncMock()
    push_sender.send.return_value = ["push-1"]

    from app.adapters.outbound.db import device_token_repository as dtr_module

    async def _fake_list(self, _user_id):
        return [_device(_user_id)]

    monkey_target = dtr_module.SqlAlchemyDeviceTokenRepository
    original = monkey_target.list_active_by_user_id
    monkey_target.list_active_by_user_id = _fake_list  # type: ignore[assignment]
    try:
        handler = make_booking_rejected_handler(factory, contacts, email_sender, push_sender)
        await handler(_rejected_envelope())
    finally:
        monkey_target.list_active_by_user_id = original  # type: ignore[assignment]

    email_sender.send.assert_awaited_once()
    push_sender.send.assert_awaited_once()
    assert push_sender.send.await_args.kwargs["data"]["type"] == "BOOKING_REJECTED"
    assert rec.session.commit.await_count == 2


def _payment_succeeded_envelope():
    payload = PaymentSucceededPayload(
        payment_intent_id=uuid4(),
        booking_id=uuid4(),
        payment_id=uuid4(),
        user_id=uuid4(),
        amount=Decimal("150.00"),
        currency="USD",
    )
    return DomainEventEnvelope(event_type=PAYMENT_SUCCEEDED, payload=payload.model_dump(mode="json"))


@pytest.mark.asyncio
async def test_payment_succeeded_handler_commits_on_success():
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.return_value = UserContact(id=uuid4(), full_name="Carlos", email="carlos@test.com")
    email_sender = AsyncMock()
    email_sender.send.return_value = "msg-ok"

    handler = make_payment_succeeded_handler(factory, contacts, email_sender)
    await handler(_payment_succeeded_envelope())

    rec.session.add.assert_called_once()
    rec.session.commit.assert_awaited_once()
    rec.session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_payment_succeeded_handler_rolls_back_on_failure():
    rec = _SessionRecorder()
    factory = rec.factory()
    contacts = AsyncMock()
    contacts.get_contact.side_effect = RuntimeError("auth unreachable")
    email_sender = AsyncMock()

    handler = make_payment_succeeded_handler(factory, contacts, email_sender)
    with pytest.raises(RuntimeError, match="auth unreachable"):
        await handler(_payment_succeeded_envelope())

    rec.session.rollback.assert_awaited_once()
    rec.session.commit.assert_not_awaited()
