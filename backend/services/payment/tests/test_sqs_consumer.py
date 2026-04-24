import json
from unittest.mock import AsyncMock

import pytest
from contracts.events.base import DomainEventEnvelope
from shared.events.sqs_consumer import SqsEventConsumer

QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/thub-payment-worker"


def _eventbridge_envelope_body(event_type: str, payload: dict | None = None) -> str:
    """Build an SQS Body matching the shape EventBridge emits (detail-type + detail)."""
    envelope = DomainEventEnvelope(event_type=event_type, payload=payload or {})
    return json.dumps(
        {
            "version": "0",
            "id": "evt-1",
            "detail-type": event_type,
            "source": "travelhub.booking",
            "account": "123",
            "time": "2026-01-01T00:00:00Z",
            "region": "us-east-1",
            "resources": [],
            "detail": json.loads(envelope.to_json()),
        }
    )


def _msg(body: str, receipt: str = "r-1") -> dict:
    return {"Body": body, "ReceiptHandle": receipt}


def test_subscribe_registers_handler():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    c.subscribe("PaymentRequested", AsyncMock())
    assert "PaymentRequested" in c._handlers


def test_subscribe_duplicate_raises():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    c.subscribe("PaymentRequested", AsyncMock())
    with pytest.raises(ValueError, match="already registered"):
        c.subscribe("PaymentRequested", AsyncMock())


@pytest.mark.asyncio
async def test_dispatch_calls_handler_and_deletes_on_success():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    handler = AsyncMock()
    c.subscribe("PaymentRequested", handler)

    sqs = AsyncMock()
    body = _eventbridge_envelope_body("PaymentRequested", {"booking_id": "b-1"})

    await c._dispatch(sqs, _msg(body))

    handler.assert_awaited_once()
    envelope = handler.call_args[0][0]
    assert isinstance(envelope, DomainEventEnvelope)
    assert envelope.event_type == "PaymentRequested"
    assert envelope.payload == {"booking_id": "b-1"}

    sqs.delete_message.assert_awaited_once_with(QueueUrl=QUEUE_URL, ReceiptHandle="r-1")


@pytest.mark.asyncio
async def test_dispatch_handler_failure_does_not_delete():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    handler = AsyncMock(side_effect=RuntimeError("boom"))
    c.subscribe("PaymentRequested", handler)

    sqs = AsyncMock()
    body = _eventbridge_envelope_body("PaymentRequested")

    await c._dispatch(sqs, _msg(body))

    handler.assert_awaited_once()
    # No delete → SQS redelivers after VT; DLQ after maxReceiveCount.
    sqs.delete_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_malformed_body_is_deleted_as_poison_pill():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    c.subscribe("PaymentRequested", AsyncMock())

    sqs = AsyncMock()
    await c._dispatch(sqs, _msg("not-json{"))

    sqs.delete_message.assert_awaited_once_with(QueueUrl=QUEUE_URL, ReceiptHandle="r-1")


@pytest.mark.asyncio
async def test_dispatch_malformed_envelope_is_deleted_as_poison_pill():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    c.subscribe("PaymentRequested", AsyncMock())

    sqs = AsyncMock()
    body = json.dumps(
        {
            "detail-type": "PaymentRequested",
            "detail": {"event_type": 123},  # event_type must be str
        }
    )

    await c._dispatch(sqs, _msg(body))

    sqs.delete_message.assert_awaited_once_with(QueueUrl=QUEUE_URL, ReceiptHandle="r-1")


@pytest.mark.asyncio
async def test_dispatch_unregistered_event_type_is_deleted_and_warned():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    c.subscribe("PaymentRequested", AsyncMock())

    sqs = AsyncMock()
    body = _eventbridge_envelope_body("SomethingElse")

    await c._dispatch(sqs, _msg(body))

    sqs.delete_message.assert_awaited_once_with(QueueUrl=QUEUE_URL, ReceiptHandle="r-1")


@pytest.mark.asyncio
async def test_run_without_handlers_raises():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    with pytest.raises(RuntimeError, match="No handlers"):
        await c.run()


@pytest.mark.asyncio
async def test_close_sets_stop_flag():
    c = SqsEventConsumer(queue_url=QUEUE_URL)
    assert not c._stop.is_set()
    await c.close()
    assert c._stop.is_set()
