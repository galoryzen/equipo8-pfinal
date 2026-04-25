from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Notification


class NotificationRepository(ABC):
    @abstractmethod
    async def exists_by_event_id(self, event_id: UUID) -> bool:
        """True if a notification row already exists for this domain event."""

    @abstractmethod
    async def create(self, notification: Notification) -> None:
        """Insert a new notification row (typically in PENDING status)."""

    @abstractmethod
    async def mark_sent(self, notification_id: UUID, provider_message_id: str) -> None:
        """Transition to SENT, record provider id and sent_at timestamp."""

    @abstractmethod
    async def mark_failed(self, notification_id: UUID) -> None:
        """Transition to FAILED (e.g. provider returned an error)."""
