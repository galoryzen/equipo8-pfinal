from shared.events.consumer_port import DomainEventConsumer
from shared.events.logging import LoggingDomainEventPublisher
from shared.events.port import DomainEventPublisher


def build_event_publisher(
    backend: str,
    *,
    rabbitmq_url: str | None = None,
    eventbridge_bus_name: str | None = None,
    eventbridge_region: str | None = None,
) -> DomainEventPublisher:
    key = backend.lower()
    if key == "logging":
        return LoggingDomainEventPublisher()
    if key == "rabbitmq":
        if not rabbitmq_url:
            raise ValueError("rabbitmq_url is required when backend='rabbitmq'")
        from shared.events.rabbitmq import RabbitMQEventPublisher

        return RabbitMQEventPublisher(url=rabbitmq_url)
    if key == "eventbridge":
        if not eventbridge_bus_name:
            raise ValueError("eventbridge_bus_name is required when backend='eventbridge'")
        from shared.events.eventbridge import EventBridgeEventPublisher

        return EventBridgeEventPublisher(
            bus_name=eventbridge_bus_name,
            region=eventbridge_region,
        )
    raise ValueError(f"Unknown event bus backend: {backend!r}")


def build_event_consumer(
    backend: str,
    *,
    rabbitmq_url: str | None = None,
    queue_name: str | None = None,
    exchange_name: str = "thub.domain.events",
    sqs_queue_url: str | None = None,
    sqs_region: str | None = None,
) -> DomainEventConsumer:
    key = backend.lower()
    if key == "rabbitmq":
        if not rabbitmq_url:
            raise ValueError("rabbitmq_url is required when backend='rabbitmq'")
        if not queue_name:
            raise ValueError("queue_name is required when backend='rabbitmq'")
        from shared.events.rabbitmq_consumer import RabbitMQEventConsumer

        return RabbitMQEventConsumer(
            url=rabbitmq_url,
            queue_name=queue_name,
            exchange_name=exchange_name,
        )
    if key == "sqs":
        if not sqs_queue_url:
            raise ValueError("sqs_queue_url is required when backend='sqs'")
        from shared.events.sqs_consumer import SqsEventConsumer

        return SqsEventConsumer(queue_url=sqs_queue_url, region=sqs_region)
    raise ValueError(f"Unknown event bus backend: {backend!r}")
