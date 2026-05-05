from contracts.events.payment import PAYMENT_FAILED, PAYMENT_SUCCEEDED
from shared.events import DomainEventConsumer, build_event_consumer, build_event_publisher

from app.adapters.inbound.events.handlers import make_payment_result_handler
from app.adapters.outbound.db.session import async_session
from app.config import settings

_SUPPORTED_WORKER_BACKENDS = {"rabbitmq", "sqs"}


def build_worker_consumer() -> DomainEventConsumer:
    backend = settings.EVENT_CONSUMER_BACKEND.lower()
    if backend not in _SUPPORTED_WORKER_BACKENDS:
        raise ValueError(
            f"booking worker requires EVENT_CONSUMER_BACKEND in {sorted(_SUPPORTED_WORKER_BACKENDS)}, "
            f"got {settings.EVENT_CONSUMER_BACKEND!r}"
        )

    events = build_event_publisher(
        settings.EVENT_PUBLISHER_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        eventbridge_bus_name=settings.EVENTBRIDGE_BUS_NAME,
        eventbridge_region=settings.EVENTBRIDGE_REGION,
        eventbridge_source=f"travelhub.{settings.SERVICE_NAME}",
    )

    handler = make_payment_result_handler(async_session, events)

    consumer = build_event_consumer(
        settings.EVENT_CONSUMER_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        queue_name=settings.PAYMENT_RESULT_QUEUE,
        sqs_queue_url=settings.EVENT_QUEUE_URL,
        sqs_region=settings.AWS_REGION,
    )
    consumer.subscribe(PAYMENT_SUCCEEDED, handler)
    consumer.subscribe(PAYMENT_FAILED, handler)
    return consumer
