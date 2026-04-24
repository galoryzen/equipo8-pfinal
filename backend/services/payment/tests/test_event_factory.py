import pytest
from shared.events import build_event_consumer, build_event_publisher
from shared.events.eventbridge import EventBridgeEventPublisher
from shared.events.logging import LoggingDomainEventPublisher
from shared.events.rabbitmq import RabbitMQEventPublisher
from shared.events.rabbitmq_consumer import RabbitMQEventConsumer
from shared.events.sqs_consumer import SqsEventConsumer


def test_factory_returns_logging_publisher():
    pub = build_event_publisher("logging")
    assert isinstance(pub, LoggingDomainEventPublisher)


def test_factory_returns_rabbitmq_publisher_without_connecting():
    pub = build_event_publisher("rabbitmq", rabbitmq_url="amqp://localhost:5672/")
    assert isinstance(pub, RabbitMQEventPublisher)


def test_factory_rabbitmq_requires_url():
    with pytest.raises(ValueError, match="rabbitmq_url"):
        build_event_publisher("rabbitmq")


def test_factory_returns_eventbridge_publisher():
    pub = build_event_publisher(
        "eventbridge",
        eventbridge_bus_name="thub-domain-events",
        eventbridge_region="us-east-1",
        eventbridge_source="travelhub.payment",
    )
    assert isinstance(pub, EventBridgeEventPublisher)


def test_factory_eventbridge_requires_source():
    with pytest.raises(ValueError, match="eventbridge_source"):
        build_event_publisher(
            "eventbridge",
            eventbridge_bus_name="thub-domain-events",
        )


def test_factory_eventbridge_requires_bus_name():
    with pytest.raises(ValueError, match="eventbridge_bus_name"):
        build_event_publisher("eventbridge", eventbridge_source="travelhub.payment")


def test_factory_rejects_unknown_backend():
    with pytest.raises(ValueError, match="Unknown event bus backend"):
        build_event_publisher("kafka")


def test_consumer_factory_returns_rabbitmq_consumer_without_connecting():
    c = build_event_consumer(
        "rabbitmq",
        rabbitmq_url="amqp://localhost:5672/",
        queue_name="payment.payment-requested",
    )
    assert isinstance(c, RabbitMQEventConsumer)


def test_consumer_factory_rabbitmq_requires_url():
    with pytest.raises(ValueError, match="rabbitmq_url"):
        build_event_consumer("rabbitmq", queue_name="q")


def test_consumer_factory_rabbitmq_requires_queue_name():
    with pytest.raises(ValueError, match="queue_name"):
        build_event_consumer("rabbitmq", rabbitmq_url="amqp://x")


def test_consumer_factory_returns_sqs_stub():
    c = build_event_consumer(
        "sqs",
        sqs_queue_url="https://sqs.us-east-1.amazonaws.com/123/queue",
        sqs_region="us-east-1",
    )
    assert isinstance(c, SqsEventConsumer)


def test_consumer_factory_sqs_requires_queue_url():
    with pytest.raises(ValueError, match="sqs_queue_url"):
        build_event_consumer("sqs")


@pytest.mark.asyncio
async def test_sqs_consumer_run_without_handlers_raises():
    c = build_event_consumer(
        "sqs",
        sqs_queue_url="https://sqs.us-east-1.amazonaws.com/123/queue",
    )
    with pytest.raises(RuntimeError, match="No handlers"):
        await c.run()


def test_consumer_factory_rejects_unknown_backend():
    with pytest.raises(ValueError, match="Unknown event bus backend"):
        build_event_consumer("kafka", rabbitmq_url="amqp://x", queue_name="q")
