from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.use_cases.register_device_token import RegisterDeviceTokenUseCase
from app.domain.models import DevicePlatform, DeviceToken


def _make_token(user_id, token_value: str = "ExponentPushToken[abc123]") -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=user_id,
        platform=DevicePlatform.IOS.value,
        token=token_value,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_register_delegates_to_repo_with_correct_args():
    user_id = uuid4()
    repo = AsyncMock(spec=DeviceTokenRepository)
    repo.upsert_by_token.return_value = _make_token(user_id)

    uc = RegisterDeviceTokenUseCase(repo)
    result = await uc.execute(user_id=user_id, platform=DevicePlatform.ANDROID, token="ExpoPushToken[xyz]")

    repo.upsert_by_token.assert_awaited_once_with(
        user_id=user_id, platform=DevicePlatform.ANDROID, token="ExpoPushToken[xyz]"
    )
    assert result.user_id == user_id


@pytest.mark.asyncio
async def test_register_returns_repo_result_unchanged():
    user_id = uuid4()
    expected = _make_token(user_id)
    repo = AsyncMock(spec=DeviceTokenRepository)
    repo.upsert_by_token.return_value = expected

    uc = RegisterDeviceTokenUseCase(repo)
    result = await uc.execute(user_id=user_id, platform=DevicePlatform.IOS, token="ExponentPushToken[abc]")

    assert result is expected
