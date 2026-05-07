import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.domain.models import DevicePlatform, DeviceToken


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class SqlAlchemyDeviceTokenRepository(DeviceTokenRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def upsert_by_token(self, *, user_id: UUID, platform: DevicePlatform, token: str) -> DeviceToken:
        result = await self._session.execute(select(DeviceToken).where(DeviceToken.token == token).limit(1))
        existing = result.scalar_one_or_none()
        now = _utcnow_naive()
        if existing is None:
            row = DeviceToken(
                id=uuid.uuid4(),
                user_id=user_id,
                platform=platform.value,
                token=token,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            self._session.add(row)
            await self._session.commit()
            return row
        existing.user_id = user_id
        existing.platform = platform.value
        existing.is_active = True
        existing.updated_at = now
        await self._session.commit()
        return existing

    async def list_active_by_user_id(self, user_id: UUID) -> list[DeviceToken]:
        result = await self._session.execute(
            select(DeviceToken).where(DeviceToken.user_id == user_id, DeviceToken.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def deactivate_by_token(self, token: str) -> None:
        result = await self._session.execute(select(DeviceToken).where(DeviceToken.token == token).limit(1))
        row = result.scalar_one_or_none()
        if row is None:
            return
        row.is_active = False
        row.updated_at = _utcnow_naive()
        await self._session.commit()
