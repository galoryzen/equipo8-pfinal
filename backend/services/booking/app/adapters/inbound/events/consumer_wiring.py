from contracts.events.payment import PAYMENT_FAILED, PAYMENT_SUCCEEDED
from shared.events import DomainEventConsumer, build_event_consumer

from app.adapters.inbound.events.handlers import make_payment_result_handler
from app.adapters.outbound.db.session import async_session
from app.config import settings

_SUPPORTED_WORKER_BACKENDS = {"rabbitmq", "sqs"}


def build_worker_consumer() -> DomainEventConsumer:
    backend = settings.EVENT_BUS_BACKEND.lower()
    if backend not in _SUPPORTED_WORKER_BACKENDS:
        raise ValueError(
            f"booking worker requires EVENT_BUS_BACKEND in {sorted(_SUPPORTED_WORKER_BACKENDS)}, "
            f"got {settings.EVENT_BUS_BACKEND!r}"
        )

    handler = make_payment_result_handler(async_session)

    consumer = build_event_consumer(
        settings.EVENT_BUS_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        queue_name=settings.PAYMENT_RESULT_QUEUE,
    )
    consumer.subscribe(PAYMENT_SUCCEEDED, handler)
    consumer.subscribe(PAYMENT_FAILED, handler)
    return consumer
