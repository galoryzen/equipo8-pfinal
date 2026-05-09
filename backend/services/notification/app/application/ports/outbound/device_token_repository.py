from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import DevicePlatform, DeviceToken


class DeviceTokenRepository(ABC):
    @abstractmethod
    async def upsert_by_token(self, *, user_id: UUID, platform: DevicePlatform, token: str) -> DeviceToken:
        """Insert a new active token, or update the existing row keyed by `token`
        to point to the given user/platform and reactivate it."""

    @abstractmethod
    async def list_active_by_user_id(self, user_id: UUID) -> list[DeviceToken]:
        """Return all active device tokens for a user."""

    @abstractmethod
    async def deactivate_by_token(self, token: str) -> None:
        """Mark the row identified by `token` as inactive. No-op if missing."""
