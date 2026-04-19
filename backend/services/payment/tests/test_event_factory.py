import pytest
from shared.events import build_event_publisher
from shared.events.eventbridge import EventBridgeEventPublisher
from shared.events.logging import LoggingDomainEventPublisher
from shared.events.rabbitmq import RabbitMQEventPublisher


def test_factory_returns_logging_publisher():
    pub = build_event_publisher("logging")
    assert isinstance(pub, LoggingDomainEventPublisher)


def test_factory_returns_rabbitmq_publisher_without_connecting():
    pub = build_event_publisher("rabbitmq", rabbitmq_url="amqp://localhost:5672/")
    assert isinstance(pub, RabbitMQEventPublisher)


def test_factory_rabbitmq_requires_url():
    with pytest.raises(ValueError, match="rabbitmq_url"):
        build_event_publisher("rabbitmq")


def test_factory_returns_eventbridge_stub():
    pub = build_event_publisher(
        "eventbridge",
        eventbridge_bus_name="thub-domain-events",
        eventbridge_region="us-east-1",
    )
    assert isinstance(pub, EventBridgeEventPublisher)


def test_factory_rejects_unknown_backend():
    with pytest.raises(ValueError, match="Unknown event bus backend"):
        build_event_publisher("kafka")


@pytest.mark.asyncio
async def test_eventbridge_publish_raises_not_implemented():
    from contracts.events.base import DomainEventEnvelope

    pub = build_event_publisher(
        "eventbridge",
        eventbridge_bus_name="thub-domain-events",
    )
    envelope = DomainEventEnvelope(event_type="Test", payload={})
    with pytest.raises(NotImplementedError, match="wire boto3"):
        await pub.publish(envelope)
