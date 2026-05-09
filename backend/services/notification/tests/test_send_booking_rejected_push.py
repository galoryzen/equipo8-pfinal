from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_REJECTED, BookingRejectedPayload

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.push_sender import PushSender
from app.application.use_cases.send_booking_rejected_push import (
    SendBookingRejectedPushUseCase,
)
from app.domain.models import (
    BOOKING_REJECTED_TYPE,
    DevicePlatform,
    DeviceToken,
    NotificationChannel,
    NotificationStatus,
)


def _envelope(reason: str | None = "Sin disponibilidad") -> DomainEventEnvelope:
    payload = BookingRejectedPayload(booking_id=uuid4(), user_id=uuid4(), reason=reason)
    return DomainEventEnvelope(event_type=BOOKING_REJECTED, payload=payload.model_dump(mode="json"))


def _device(user_id, token: str = "tok-1") -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=user_id,
        platform=DevicePlatform.IOS.value,
        token=token,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def _mocks():
    repo = AsyncMock(spec=NotificationRepository)
    devices = AsyncMock(spec=DeviceTokenRepository)
    push = AsyncMock(spec=PushSender)
    return repo, devices, push


@pytest.mark.asyncio
async def test_happy_path_sends_push_with_rejection_data():
    repo, devices, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    envelope = _envelope("Sin disponibilidad")
    payload = BookingRejectedPayload.model_validate(envelope.payload)
    devices.list_active_by_user_id.return_value = [_device(payload.user_id)]
    push.send.return_value = ["push-msg-r"]

    uc = SendBookingRejectedPushUseCase(repo, devices, push)
    await uc.execute(envelope)

    push.send.assert_awaited_once()
    kwargs = push.send.await_args.kwargs
    assert kwargs["title"] == "Booking rejected"
    assert "100% refund" in kwargs["body"]
    assert "Sin disponibilidad" in kwargs["body"]
    assert kwargs["data"] == {
        "type": BOOKING_REJECTED_TYPE,
        "booking_id": str(payload.booking_id),
    }

    created = repo.create.await_args.args[0]
    assert created.channel == NotificationChannel.PUSH
    assert created.type == BOOKING_REJECTED_TYPE
    assert created.status == NotificationStatus.PENDING
    repo.mark_sent.assert_awaited_once()


@pytest.mark.asyncio
async def test_body_omits_reason_when_payload_has_none():
    repo, devices, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    envelope = _envelope(reason=None)
    payload = BookingRejectedPayload.model_validate(envelope.payload)
    devices.list_active_by_user_id.return_value = [_device(payload.user_id)]
    push.send.return_value = ["push-msg-r2"]

    uc = SendBookingRejectedPushUseCase(repo, devices, push)
    await uc.execute(envelope)

    body = push.send.await_args.kwargs["body"]
    # No double-space artefact when reason is missing.
    assert "Your booking was rejected." in body
    assert "  " not in body


@pytest.mark.asyncio
async def test_skips_when_event_already_processed():
    repo, devices, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = True

    uc = SendBookingRejectedPushUseCase(repo, devices, push)
    await uc.execute(_envelope())

    devices.list_active_by_user_id.assert_not_awaited()
    push.send.assert_not_awaited()
    repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_returns_silently_when_no_active_devices():
    repo, devices, push = _mocks()
    repo.exists_by_event_id_and_channel.return_value = False
    devices.list_active_by_user_id.return_value = []

    uc = SendBookingRejectedPushUseCase(repo, devices, push)
    await uc.execute(_envelope())

    push.send.assert_not_awaited()
    repo.create.assert_not_awaited()
