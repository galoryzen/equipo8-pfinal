from unittest.mock import AsyncMock, MagicMock

import pytest

from contracts.events.base import DomainEventEnvelope
from shared.events.rabbitmq_consumer import RabbitMQEventConsumer


def test_subscribe_registers_handler():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    c.subscribe("PaymentRequested", AsyncMock())
    assert "PaymentRequested" in c._handlers


def test_subscribe_duplicate_raises():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    c.subscribe("PaymentRequested", AsyncMock())
    with pytest.raises(ValueError, match="already registered"):
        c.subscribe("PaymentRequested", AsyncMock())


@pytest.mark.asyncio
async def test_dispatch_calls_matching_handler_and_acks():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    handler = AsyncMock()
    c.subscribe("PaymentRequested", handler)

    envelope = DomainEventEnvelope(event_type="PaymentRequested", payload={"k": "v"})
    msg = MagicMock()
    msg.type = "PaymentRequested"
    msg.body = envelope.to_json().encode()
    msg.ack = AsyncMock()
    msg.nack = AsyncMock()

    await c._dispatch(msg)

    handler.assert_awaited_once()
    called_env = handler.call_args[0][0]
    assert isinstance(called_env, DomainEventEnvelope)
    assert called_env.event_type == "PaymentRequested"
    msg.ack.assert_awaited_once()
    msg.nack.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_handler_failure_nacks_without_requeue():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    handler = AsyncMock(side_effect=RuntimeError("boom"))
    c.subscribe("PaymentRequested", handler)

    envelope = DomainEventEnvelope(event_type="PaymentRequested", payload={})
    msg = MagicMock()
    msg.type = "PaymentRequested"
    msg.body = envelope.to_json().encode()
    msg.ack = AsyncMock()
    msg.nack = AsyncMock()

    await c._dispatch(msg)

    msg.nack.assert_awaited_once_with(requeue=False)
    msg.ack.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_unregistered_event_type_is_dropped():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    c.subscribe("PaymentRequested", AsyncMock())

    msg = MagicMock()
    msg.type = "SomethingElse"
    msg.body = b"{}"
    msg.ack = AsyncMock()
    msg.nack = AsyncMock()

    await c._dispatch(msg)

    msg.ack.assert_awaited_once()
    msg.nack.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_malformed_body_acks_and_drops():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    c.subscribe("PaymentRequested", AsyncMock())

    msg = MagicMock()
    msg.type = "PaymentRequested"
    msg.body = b"not-json{"
    msg.ack = AsyncMock()
    msg.nack = AsyncMock()

    await c._dispatch(msg)

    msg.ack.assert_awaited_once()
    msg.nack.assert_not_awaited()


@pytest.mark.asyncio
async def test_run_without_handlers_raises():
    c = RabbitMQEventConsumer(url="amqp://x", queue_name="q")
    with pytest.raises(RuntimeError, match="No handlers"):
        await c.run()
