from contracts.events.booking import BOOKING_REJECTED
from contracts.events.payment import PAYMENT_REQUESTED
from shared.events import (
    DomainEventConsumer,
    build_event_consumer,
    build_event_publisher,
)

from app.adapters.inbound.events.handlers import (
    make_booking_rejected_handler,
    make_payment_requested_handler,
)
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway
from app.config import settings

_SUPPORTED_WORKER_BACKENDS = {"rabbitmq", "sqs"}


def build_worker_consumer() -> DomainEventConsumer:
    consumer_backend = settings.EVENT_CONSUMER_BACKEND.lower()
    if consumer_backend not in _SUPPORTED_WORKER_BACKENDS:
        raise ValueError(
            f"payment worker requires EVENT_CONSUMER_BACKEND in {sorted(_SUPPORTED_WORKER_BACKENDS)}, "
            f"got {settings.EVENT_CONSUMER_BACKEND!r}"
        )

    publisher = build_event_publisher(
        settings.EVENT_PUBLISHER_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        eventbridge_bus_name=settings.EVENTBRIDGE_BUS_NAME,
        eventbridge_region=settings.EVENTBRIDGE_REGION,
        eventbridge_source=f"travelhub.{settings.SERVICE_NAME}",
    )
    gateway = MockPaymentGateway()
    payment_requested_handler = make_payment_requested_handler(async_session, publisher, gateway)
    booking_rejected_handler = make_booking_rejected_handler(async_session, gateway)

    consumer = build_event_consumer(
        settings.EVENT_CONSUMER_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        queue_name=settings.PAYMENT_REQUESTED_QUEUE,
        sqs_queue_url=settings.EVENT_QUEUE_URL,
        sqs_region=settings.AWS_REGION,
    )
    consumer.subscribe(PAYMENT_REQUESTED, payment_requested_handler)
    consumer.subscribe(BOOKING_REJECTED, booking_rejected_handler)
    return consumer
