import pytest

from contracts.events.booking import BOOKING_REJECTED
from contracts.events.payment import PAYMENT_REQUESTED
from shared.events.rabbitmq_consumer import RabbitMQEventConsumer


def test_build_worker_consumer_registers_payment_requested_and_booking_rejected(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "EVENT_CONSUMER_BACKEND", "rabbitmq")
    monkeypatch.setattr(settings, "EVENT_PUBLISHER_BACKEND", "rabbitmq")
    monkeypatch.setattr(settings, "RABBITMQ_URL", "amqp://localhost:5672/")
    monkeypatch.setattr(settings, "PAYMENT_REQUESTED_QUEUE", "payment.payment-requested")

    from app.adapters.inbound.events.consumer_wiring import build_worker_consumer

    consumer = build_worker_consumer()

    assert isinstance(consumer, RabbitMQEventConsumer)
    assert PAYMENT_REQUESTED in consumer._handlers
    assert BOOKING_REJECTED in consumer._handlers


def test_build_worker_consumer_rejects_logging_backend(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "EVENT_CONSUMER_BACKEND", "logging")

    from app.adapters.inbound.events.consumer_wiring import build_worker_consumer

    with pytest.raises(ValueError, match=r"payment worker requires EVENT_CONSUMER_BACKEND"):
        build_worker_consumer()
