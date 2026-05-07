from unittest.mock import AsyncMock

import pytest

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.use_cases.delete_device_token import DeleteDeviceTokenUseCase


@pytest.mark.asyncio
async def test_delete_delegates_to_repo():
    repo = AsyncMock(spec=DeviceTokenRepository)
    uc = DeleteDeviceTokenUseCase(repo)

    await uc.execute(token="ExponentPushToken[abc]")

    repo.deactivate_by_token.assert_awaited_once_with("ExponentPushToken[abc]")
