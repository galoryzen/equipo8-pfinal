from typing import Any
from uuid import UUID

from app.application.exceptions import NoActiveTokensError
from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.push_sender import PushSender


class SendTestPushNotificationUseCase:
    def __init__(self, repo: DeviceTokenRepository, push: PushSender):
        self._repo = repo
        self._push = push

    async def execute(
        self,
        *,
        user_id: UUID,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[str]:
        devices = await self._repo.list_active_by_user_id(user_id)
        if not devices:
            raise NoActiveTokensError(f"No active device tokens for user {user_id}")
        tokens = [d.token for d in devices]
        return await self._push.send(tokens=tokens, title=title, body=body, data=data)
