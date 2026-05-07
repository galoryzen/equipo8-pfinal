from uuid import UUID

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.domain.models import DevicePlatform, DeviceToken


class RegisterDeviceTokenUseCase:
    def __init__(self, repo: DeviceTokenRepository):
        self._repo = repo

    async def execute(self, *, user_id: UUID, platform: DevicePlatform, token: str) -> DeviceToken:
        return await self._repo.upsert_by_token(user_id=user_id, platform=platform, token=token)
