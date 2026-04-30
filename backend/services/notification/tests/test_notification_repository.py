from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.adapters.outbound.db.notification_repository import SqlAlchemyNotificationRepository
from app.domain.models import (
    Notification,
    NotificationChannel,
    NotificationStatus,
)


def _make_notification() -> Notification:
    return Notification(
        id=uuid4(),
        event_id=uuid4(),
        booking_id=uuid4(),
        user_id=uuid4(),
        channel=NotificationChannel.EMAIL,
        type="BOOKING_CONFIRMED",
        status=NotificationStatus.PENDING,
        to_email="ana@test.com",
        created_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_exists_by_event_id_returns_true_when_row_present():
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = uuid4()
    session.execute.return_value = result

    repo = SqlAlchemyNotificationRepository(session)
    assert await repo.exists_by_event_id(uuid4()) is True
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_exists_by_event_id_returns_false_when_missing():
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    session.execute.return_value = result

    repo = SqlAlchemyNotificationRepository(session)
    assert await repo.exists_by_event_id(uuid4()) is False


@pytest.mark.asyncio
async def test_create_adds_and_flushes():
    session = AsyncMock()
    session.add = AsyncMock()
    repo = SqlAlchemyNotificationRepository(session)
    notification = _make_notification()

    await repo.create(notification)

    session.add.assert_called_once_with(notification)
    session.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_sent_updates_status_and_provider_id():
    notification = _make_notification()
    session = AsyncMock()
    session.get.return_value = notification

    repo = SqlAlchemyNotificationRepository(session)
    await repo.mark_sent(notification.id, "ses-msg-1")

    assert notification.status == NotificationStatus.SENT
    assert notification.provider_message_id == "ses-msg-1"
    assert notification.sent_at is not None
    session.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_sent_is_noop_when_missing():
    session = AsyncMock()
    session.get.return_value = None
    repo = SqlAlchemyNotificationRepository(session)

    await repo.mark_sent(uuid4(), "irrelevant")
    session.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_mark_failed_updates_status():
    notification = _make_notification()
    session = AsyncMock()
    session.get.return_value = notification

    repo = SqlAlchemyNotificationRepository(session)
    await repo.mark_failed(notification.id)

    assert notification.status == NotificationStatus.FAILED
    session.flush.assert_awaited_once()
