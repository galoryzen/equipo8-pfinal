from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.notification_repository import NotificationRepository
from app.domain.models import Notification, NotificationStatus


class SqlAlchemyNotificationRepository(NotificationRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def exists_by_event_id(self, event_id: UUID) -> bool:
        result = await self._session.execute(
            select(Notification.id).where(Notification.event_id == event_id).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, notification: Notification) -> None:
        self._session.add(notification)
        await self._session.flush()

    async def mark_sent(self, notification_id: UUID, provider_message_id: str) -> None:
        notification = await self._session.get(Notification, notification_id)
        if notification is None:
            return
        notification.status = NotificationStatus.SENT
        notification.provider_message_id = provider_message_id
        notification.sent_at = datetime.now(UTC).replace(tzinfo=None)
        await self._session.flush()

    async def mark_failed(self, notification_id: UUID) -> None:
        notification = await self._session.get(Notification, notification_id)
        if notification is None:
            return
        notification.status = NotificationStatus.FAILED
        await self._session.flush()
