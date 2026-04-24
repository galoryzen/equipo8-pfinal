import pytest

from contracts.events.payment import PAYMENT_SUCCEEDED, PAYMENT_FAILED
from shared.events.rabbitmq_consumer import RabbitMQEventConsumer


def test_build_worker_consumer_registers_both_payment_events(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "EVENT_CONSUMER_BACKEND", "rabbitmq")
    monkeypatch.setattr(settings, "RABBITMQ_URL", "amqp://localhost:5672/")
    monkeypatch.setattr(settings, "PAYMENT_RESULT_QUEUE", "booking.payment-result")

    from app.adapters.inbound.events.consumer_wiring import build_worker_consumer

    consumer = build_worker_consumer()

    assert isinstance(consumer, RabbitMQEventConsumer)
    assert PAYMENT_SUCCEEDED in consumer._handlers
    assert PAYMENT_FAILED in consumer._handlers


def test_build_worker_consumer_rejects_logging_backend(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "EVENT_CONSUMER_BACKEND", "logging")

    from app.adapters.inbound.events.consumer_wiring import build_worker_consumer

    with pytest.raises(ValueError, match=r"booking worker requires EVENT_CONSUMER_BACKEND"):
        build_worker_consumer()
