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
