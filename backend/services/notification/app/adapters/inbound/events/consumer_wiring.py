from dataclasses import dataclass

import httpx
from contracts.events.booking import BOOKING_CONFIRMED
from contracts.events.payment import PAYMENT_FAILED
from shared.events import DomainEventConsumer, build_event_consumer

from app.adapters.inbound.events.handlers import make_booking_confirmed_handler, make_payment_failed_handler
from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.email import build_email_sender
from app.adapters.outbound.http.auth_client import HttpAuthClient
from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.config import settings

_SUPPORTED_WORKER_BACKENDS = {"rabbitmq", "sqs"}


@dataclass
class WorkerResources:
    """Bundle of consumer + owned resources so worker.py can close them on shutdown."""

    consumer: DomainEventConsumer
    http_client: httpx.AsyncClient


def build_worker_resources() -> WorkerResources:
    consumer_backend = settings.EVENT_CONSUMER_BACKEND.lower()
    if consumer_backend not in _SUPPORTED_WORKER_BACKENDS:
        raise ValueError(
            f"notification worker requires EVENT_CONSUMER_BACKEND in {sorted(_SUPPORTED_WORKER_BACKENDS)}, "
            f"got {settings.EVENT_CONSUMER_BACKEND!r}"
        )

    http_client = httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS)
    user_contacts = HttpAuthClient(
        http_client, settings.AUTH_SERVICE_URL, settings.INTERNAL_SERVICE_TOKEN
    )
    properties = HttpCatalogClient(
        http_client, settings.CATALOG_SERVICE_URL, settings.INTERNAL_SERVICE_TOKEN
    )
    email_sender = build_email_sender(
        settings.EMAIL_SENDER_BACKEND,
        from_address=settings.SES_FROM_ADDRESS,
        aws_region=settings.AWS_REGION,
    )

    handler = make_booking_confirmed_handler(async_session, user_contacts, properties, email_sender)
    payment_failed_handler = make_payment_failed_handler(async_session, user_contacts, email_sender)

    consumer = build_event_consumer(
        settings.EVENT_CONSUMER_BACKEND,
        rabbitmq_url=settings.RABBITMQ_URL,
        queue_name=settings.BOOKING_CONFIRMED_QUEUE,
        sqs_queue_url=settings.EVENT_QUEUE_URL,
        sqs_region=settings.AWS_REGION,
    )
    consumer.subscribe(BOOKING_CONFIRMED, handler)
    consumer.subscribe(PAYMENT_FAILED, payment_failed_handler)
    return WorkerResources(consumer=consumer, http_client=http_client)
