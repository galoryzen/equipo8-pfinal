from datetime import datetime
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import (
    get_current_user_id,
    get_db_session,
    get_delete_device_token_use_case,
    get_register_device_token_use_case,
    get_send_test_push_use_case,
)
from app.application.exceptions import NoActiveTokensError
from app.application.use_cases.delete_device_token import DeleteDeviceTokenUseCase
from app.application.use_cases.register_device_token import RegisterDeviceTokenUseCase
from app.application.use_cases.send_test_push import SendTestPushNotificationUseCase
from app.config import settings
from app.domain.models import DevicePlatform, DeviceToken
from app.main import app

USER_ID = UUID("11111111-1111-1111-1111-111111111111")


@pytest.fixture
def client():
    async def _no_session():
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _no_session
    app.dependency_overrides[get_current_user_id] = lambda: USER_ID
    yield TestClient(app)
    app.dependency_overrides.clear()


def _device_row(token: str = "ExponentPushToken[abc]") -> DeviceToken:
    now = datetime.utcnow()
    return DeviceToken(
        id=uuid4(),
        user_id=USER_ID,
        platform=DevicePlatform.IOS.value,
        token=token,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def test_register_device_token_returns_201_with_row(client):
    uc = AsyncMock(spec=RegisterDeviceTokenUseCase)
    uc.execute.return_value = _device_row("ExponentPushToken[abc]")
    app.dependency_overrides[get_register_device_token_use_case] = lambda: uc

    resp = client.post(
        "/api/v1/notifications/device-tokens",
        json={"platform": "IOS", "token": "ExponentPushToken[abc]"},
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["platform"] == "IOS"
    assert body["token"] == "ExponentPushToken[abc]"
    assert body["is_active"] is True
    uc.execute.assert_awaited_once()
    args = uc.execute.await_args.kwargs
    assert args["user_id"] == USER_ID
    assert args["platform"] == DevicePlatform.IOS
    assert args["token"] == "ExponentPushToken[abc]"


def test_register_device_token_rejects_invalid_platform(client):
    resp = client.post(
        "/api/v1/notifications/device-tokens",
        json={"platform": "WATCH", "token": "x"},
    )
    assert resp.status_code == 422


def test_register_requires_authentication():
    # Drop only the auth override so the real `get_current_user_id` runs.
    async def _no_session():
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _no_session
    try:
        c = TestClient(app)
        resp = c.post(
            "/api/v1/notifications/device-tokens",
            json={"platform": "IOS", "token": "tok"},
        )
        assert resp.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_delete_device_token_returns_204(client):
    uc = AsyncMock(spec=DeleteDeviceTokenUseCase)
    app.dependency_overrides[get_delete_device_token_use_case] = lambda: uc

    resp = client.delete("/api/v1/notifications/device-tokens/ExponentPushToken%5Babc%5D")

    assert resp.status_code == 204
    uc.execute.assert_awaited_once_with(token="ExponentPushToken[abc]")


def test_test_push_returns_message_ids_when_debug_true(client, monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", True)
    uc = AsyncMock(spec=SendTestPushNotificationUseCase)
    uc.execute.return_value = ["msg-1", "msg-2"]
    app.dependency_overrides[get_send_test_push_use_case] = lambda: uc

    resp = client.post("/api/v1/notifications/test", json={"title": "Hi", "body": "There"})

    assert resp.status_code == 200, resp.text
    assert resp.json() == {"status": "sent", "message_ids": ["msg-1", "msg-2"]}


def test_test_push_returns_404_when_debug_false(client, monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", False)
    uc = AsyncMock(spec=SendTestPushNotificationUseCase)
    app.dependency_overrides[get_send_test_push_use_case] = lambda: uc

    resp = client.post("/api/v1/notifications/test", json={"title": "Hi", "body": "There"})

    assert resp.status_code == 404
    uc.execute.assert_not_awaited()


def test_test_push_returns_404_when_no_active_tokens(client, monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", True)
    uc = AsyncMock(spec=SendTestPushNotificationUseCase)
    uc.execute.side_effect = NoActiveTokensError("none")
    app.dependency_overrides[get_send_test_push_use_case] = lambda: uc

    resp = client.post("/api/v1/notifications/test", json={"title": "Hi", "body": "There"})

    assert resp.status_code == 404
    assert resp.json()["code"] == "NO_ACTIVE_TOKENS"
