from contracts.events.payment import PAYMENT_REQUESTED
from shared.events import (
    DomainEventConsumer,
    build_event_consumer,
    build_event_publisher,
)

from app.adapters.inbound.events.handlers import make_payment_requested_handler
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.config import settings

_SUPPORTED_WORKER_BACKENDS = {"rabbitmq", "sqs"}


def build_worker_consumer() -> DomainEventConsumer:
    backend = settings.EVENT_BUS_BACKEND.lower()
    if backend not in _SUPPORTED_WORKER_BACKENDS:
        raise ValueError(
            f"payment worker requires EVENT_BUS_BACKEND in {sorted(_SUPPORTED_WORKER_BACKENDS)}, "
            f"got {settings.EVENT_BUS_BACKEND!r}"
        )

    publisher = build_event_publisher(
        settings.EVENT_BUS_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        eventbridge_bus_name=settings.EVENTBRIDGE_BUS_NAME,
        eventbridge_region=settings.EVENTBRIDGE_REGION,
    )
    gateway = MockPaymentGateway()
    handler = make_payment_requested_handler(async_session, publisher, gateway)

    consumer = build_event_consumer(
        settings.EVENT_BUS_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        queue_name=settings.PAYMENT_REQUESTED_QUEUE,
    )
    consumer.subscribe(PAYMENT_REQUESTED, handler)
    return consumer
