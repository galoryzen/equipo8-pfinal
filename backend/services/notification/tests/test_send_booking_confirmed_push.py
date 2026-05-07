from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CONFIRMED, BookingConfirmedPayload

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.property_client import PropertyClient, PropertySummary
from app.application.ports.outbound.push_sender import PushSender
from app.application.use_cases.send_booking_confirmed_push import (
    SendBookingConfirmedPushUseCase,
)
from app.domain.models import (
    BOOKING_CONFIRMED_TYPE,
    DevicePlatform,
    DeviceToken,
    NotificationChannel,
    NotificationStatus,
)


def _envelope() -> DomainEventEnvelope:
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


def _device(user_id, token: str = "tok-1") -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=user_id,
        platform=DevicePlatform.ANDROID.value,
        token=token,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def _mocks():
    repo = AsyncMock(spec=NotificationRepository)
    devices = AsyncMock(spec=DeviceTokenRepository)
    properties = AsyncMock(spec=PropertyClient)
    push = AsyncMock(spec=PushSender)
    return repo, devices, properties, push


@pytest.mark.asyncio
async def test_happy_path_sends_push_with_booking_data_and_marks_sent():
    repo, devices, properties, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    envelope = _envelope()
    payload = BookingConfirmedPayload.model_validate(envelope.payload)
    devices.list_active_by_user_id.return_value = [
        _device(payload.user_id, "tok-a"),
        _device(payload.user_id, "tok-b"),
    ]
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(), name="Hotel Luna", city_name="Cartagena", country="Colombia", image_url=None
    )
    push.send.return_value = ["push-msg-1", "push-msg-2"]

    uc = SendBookingConfirmedPushUseCase(repo, devices, properties, push)
    await uc.execute(envelope)

    repo.exists_by_event_id_and_channel.assert_awaited_once_with(envelope.event_id, NotificationChannel.PUSH)
    push.send.assert_awaited_once()
    kwargs = push.send.await_args.kwargs
    assert kwargs["tokens"] == ["tok-a", "tok-b"]
    assert kwargs["title"] == "Booking confirmed"
    assert "Hotel Luna" in kwargs["body"]
    assert kwargs["data"] == {
        "type": BOOKING_CONFIRMED_TYPE,
        "booking_id": str(payload.booking_id),
    }

    repo.create.assert_awaited_once()
    created = repo.create.await_args.args[0]
    assert created.channel == NotificationChannel.PUSH
    assert created.type == BOOKING_CONFIRMED_TYPE
    assert created.status == NotificationStatus.PENDING
    assert created.to_email is None
    assert created.event_id == envelope.event_id

    repo.mark_sent.assert_awaited_once()
    assert repo.mark_sent.await_args.args[1] == "push-msg-1"


@pytest.mark.asyncio
async def test_skips_when_event_already_processed_for_push_channel():
    repo, devices, properties, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = True

    uc = SendBookingConfirmedPushUseCase(repo, devices, properties, push)
    await uc.execute(_envelope())

    devices.list_active_by_user_id.assert_not_awaited()
    properties.get_summary.assert_not_awaited()
    push.send.assert_not_awaited()
    repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_returns_silently_when_no_active_devices():
    repo, devices, properties, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    devices.list_active_by_user_id.return_value = []

    uc = SendBookingConfirmedPushUseCase(repo, devices, properties, push)
    await uc.execute(_envelope())  # must not raise

    push.send.assert_not_awaited()
    repo.create.assert_not_awaited()
    properties.get_summary.assert_not_awaited()


@pytest.mark.asyncio
async def test_marks_failed_and_reraises_when_push_sender_errors():
    repo, devices, properties, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    envelope = _envelope()
    payload = BookingConfirmedPayload.model_validate(envelope.payload)
    devices.list_active_by_user_id.return_value = [_device(payload.user_id)]
    properties.get_summary.return_value = PropertySummary(
        id=uuid4(), name="Luna", city_name="Cartagena", country="Colombia", image_url=None
    )
    push.send.side_effect = RuntimeError("expo 503")

    uc = SendBookingConfirmedPushUseCase(repo, devices, properties, push)
    with pytest.raises(RuntimeError, match="expo 503"):
        await uc.execute(envelope)

    repo.create.assert_awaited_once()
    repo.mark_failed.assert_awaited_once()
    repo.mark_sent.assert_not_awaited()
