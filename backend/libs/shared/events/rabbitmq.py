import logging

import aio_pika
from aio_pika.abc import AbstractRobustConnection

from contracts.events.base import DomainEventEnvelope
from shared.events.port import DomainEventPublisher

logger = logging.getLogger(__name__)

DEFAULT_EXCHANGE = "thub.domain.events"


class RabbitMQEventPublisher(DomainEventPublisher):
    def __init__(self, url: str, exchange_name: str = DEFAULT_EXCHANGE):
        self._url = url
        self._exchange_name = exchange_name
        self._connection: AbstractRobustConnection | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def _ensure_connected(self) -> aio_pika.abc.AbstractExchange:
        if self._exchange is not None:
            return self._exchange
        self._connection = await aio_pika.connect_robust(self._url)
        channel = await self._connection.channel()
        self._exchange = await channel.declare_exchange(
            self._exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        logger.info("Connected to RabbitMQ exchange=%s", self._exchange_name)
        return self._exchange

    async def publish(self, envelope: DomainEventEnvelope) -> None:
        exchange = await self._ensure_connected()
        message = aio_pika.Message(
            body=envelope.to_json().encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            message_id=str(envelope.event_id),
            type=envelope.event_type,
        )
        await exchange.publish(message, routing_key=envelope.event_type)

    async def close(self) -> None:
        if self._connection is not None:
            await self._connection.close()
            self._connection = None
            self._exchange = None
