import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from contracts.events.base import DomainEventEnvelope
from shared.events.eventbridge import EventBridgeEventPublisher


def _mock_session_with_client(client_mock: AsyncMock) -> MagicMock:
    """Build a Session mock whose .client() returns an async context manager
    yielding `client_mock`. Matches the aioboto3 API surface."""
    session = MagicMock()
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client_mock)
    cm.__aexit__ = AsyncMock(return_value=None)
    session.client = MagicMock(return_value=cm)
    return session


@pytest.mark.asyncio
async def test_publish_calls_put_events_with_expected_shape():
    client = AsyncMock()
    client.put_events = AsyncMock(return_value={"FailedEntryCount": 0, "Entries": [{}]})
    session = _mock_session_with_client(client)

    pub = EventBridgeEventPublisher(
        bus_name="thub.domain.events",
        source="travelhub.payment",
        region="us-east-1",
    )
    pub._session = session

    envelope = DomainEventEnvelope(
        event_type="PaymentSucceeded",
        payload={"booking_id": "b-1", "payment_id": "p-1"},
    )

    await pub.publish(envelope)

    session.client.assert_called_once_with("events", region_name="us-east-1")
    client.put_events.assert_awaited_once()
    kwargs = client.put_events.await_args.kwargs
    entries = kwargs["Entries"]
    assert len(entries) == 1
    entry = entries[0]
    assert entry["EventBusName"] == "thub.domain.events"
    assert entry["Source"] == "travelhub.payment"
    assert entry["DetailType"] == "PaymentSucceeded"
    # Detail must be the full envelope JSON so consumers can reconstruct it.
    detail = json.loads(entry["Detail"])
    assert detail["event_type"] == "PaymentSucceeded"
    assert detail["payload"] == {"booking_id": "b-1", "payment_id": "p-1"}


@pytest.mark.asyncio
async def test_publish_raises_when_put_events_reports_failure():
    client = AsyncMock()
    client.put_events = AsyncMock(
        return_value={
            "FailedEntryCount": 1,
            "Entries": [{"ErrorCode": "InternalException", "ErrorMessage": "boom"}],
        }
    )
    session = _mock_session_with_client(client)

    pub = EventBridgeEventPublisher(
        bus_name="thub.domain.events",
        source="travelhub.payment",
    )
    pub._session = session

    envelope = DomainEventEnvelope(event_type="PaymentFailed", payload={})

    with pytest.raises(RuntimeError, match="InternalException"):
        await pub.publish(envelope)


@pytest.mark.asyncio
async def test_publish_uses_instance_session(monkeypatch):
    """Smoke: avoid real aioboto3.Session() network calls during test."""
    with patch("shared.events.eventbridge.aioboto3.Session") as SessionCtor:
        pub = EventBridgeEventPublisher(
            bus_name="b",
            source="travelhub.payment",
        )
        SessionCtor.assert_called_once()
        assert pub._session is SessionCtor.return_value
