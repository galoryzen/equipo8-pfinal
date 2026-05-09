from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import Notification, NotificationChannel


class NotificationRepository(ABC):
    @abstractmethod
    async def exists_by_event_id_and_channel(self, event_id: UUID, channel: NotificationChannel) -> bool:
        """True if a notification row already exists for this (event, channel) pair.

        Idempotency is per-channel because a single domain event can fan out to
        multiple delivery channels (e.g. EMAIL + PUSH).
        """

    @abstractmethod
    async def create(self, notification: Notification) -> None:
        """Insert a new notification row (typically in PENDING status)."""

    @abstractmethod
    async def mark_sent(self, notification_id: UUID, provider_message_id: str) -> None:
        """Transition to SENT, record provider id and sent_at timestamp."""

    @abstractmethod
    async def mark_failed(self, notification_id: UUID) -> None:
        """Transition to FAILED (e.g. provider returned an error)."""
