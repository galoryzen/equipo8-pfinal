import httpx
import pytest
import respx

from app.adapters.outbound.push.expo_push_sender import (
    EXPO_PUSH_URL,
    ExpoPushSender,
    ExpoPushSenderError,
)
from app.adapters.outbound.push.logging_push_sender import LoggingPushSender


@pytest.mark.asyncio
@respx.mock
async def test_send_returns_message_ids_on_success():
    respx.post(EXPO_PUSH_URL).mock(
        return_value=httpx.Response(
            200,
            json={"data": [{"status": "ok", "id": "exp-1"}, {"status": "ok", "id": "exp-2"}]},
        )
    )
    async with httpx.AsyncClient() as client:
        sender = ExpoPushSender(client, access_token=None)
        ids = await sender.send(tokens=["t1", "t2"], title="Hello", body="World", data={"k": "v"})
    assert ids == ["exp-1", "exp-2"]


@pytest.mark.asyncio
@respx.mock
async def test_send_attaches_authorization_header_when_access_token_set():
    route = respx.post(EXPO_PUSH_URL).mock(
        return_value=httpx.Response(200, json={"data": [{"status": "ok", "id": "exp-1"}]})
    )
    async with httpx.AsyncClient() as client:
        sender = ExpoPushSender(client, access_token="secret-123")
        await sender.send(tokens=["t1"], title="Hi", body="There")

    sent = route.calls[0].request
    assert sent.headers.get("authorization") == "Bearer secret-123"


@pytest.mark.asyncio
@respx.mock
async def test_send_returns_empty_id_on_per_message_error():
    respx.post(EXPO_PUSH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {"status": "ok", "id": "exp-1"},
                    {
                        "status": "error",
                        "message": "DeviceNotRegistered",
                        "details": {"error": "DeviceNotRegistered"},
                    },
                ]
            },
        )
    )
    async with httpx.AsyncClient() as client:
        sender = ExpoPushSender(client)
        ids = await sender.send(tokens=["t1", "t2"], title="Hi", body="There")
    assert ids == ["exp-1", ""]


@pytest.mark.asyncio
@respx.mock
async def test_send_raises_on_http_error_status():
    respx.post(EXPO_PUSH_URL).mock(return_value=httpx.Response(503, text="Service Unavailable"))
    async with httpx.AsyncClient() as client:
        sender = ExpoPushSender(client)
        with pytest.raises(ExpoPushSenderError):
            await sender.send(tokens=["t1"], title="Hi", body="There")


@pytest.mark.asyncio
async def test_send_returns_empty_list_for_no_tokens():
    async with httpx.AsyncClient() as client:
        sender = ExpoPushSender(client)
        # Should not even hit the network — respx not mounted, would error if it did.
        ids = await sender.send(tokens=[], title="Hi", body="There")
    assert ids == []


@pytest.mark.asyncio
async def test_logging_push_sender_returns_synthetic_ids():
    sender = LoggingPushSender()
    ids = await sender.send(tokens=["t1", "t2"], title="Hi", body="There")
    assert len(ids) == 2
    assert all(i.startswith("local-push-") for i in ids)
