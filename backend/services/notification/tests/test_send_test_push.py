from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.exceptions import NoActiveTokensError
from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.push_sender import PushSender
from app.application.use_cases.send_test_push import SendTestPushNotificationUseCase
from app.domain.models import DevicePlatform, DeviceToken


def _device(user_id, token: str) -> DeviceToken:
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


@pytest.mark.asyncio
async def test_sends_to_all_active_tokens_for_user():
    user_id = uuid4()
    devices = [_device(user_id, "tok-1"), _device(user_id, "tok-2")]
    repo = AsyncMock(spec=DeviceTokenRepository)
    repo.list_active_by_user_id.return_value = devices
    push = AsyncMock(spec=PushSender)
    push.send.return_value = ["msg-1", "msg-2"]

    uc = SendTestPushNotificationUseCase(repo, push)
    ids = await uc.execute(user_id=user_id, title="Hi", body="There")

    repo.list_active_by_user_id.assert_awaited_once_with(user_id)
    push.send.assert_awaited_once_with(tokens=["tok-1", "tok-2"], title="Hi", body="There", data=None)
    assert ids == ["msg-1", "msg-2"]


@pytest.mark.asyncio
async def test_raises_when_user_has_no_active_tokens():
    user_id = uuid4()
    repo = AsyncMock(spec=DeviceTokenRepository)
    repo.list_active_by_user_id.return_value = []
    push = AsyncMock(spec=PushSender)

    uc = SendTestPushNotificationUseCase(repo, push)
    with pytest.raises(NoActiveTokensError):
        await uc.execute(user_id=user_id, title="Hi", body="There")

    push.send.assert_not_awaited()
