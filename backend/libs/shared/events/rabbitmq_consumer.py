import asyncio
import logging

import aio_pika
from aio_pika.abc import (
    AbstractRobustChannel,
    AbstractRobustConnection,
    AbstractRobustQueue,
)

from contracts.events.base import DomainEventEnvelope
from shared.events.consumer_port import DomainEventConsumer, EventHandler

logger = logging.getLogger(__name__)

DEFAULT_EXCHANGE = "thub.domain.events"


class RabbitMQEventConsumer(DomainEventConsumer):
    def __init__(
        self,
        url: str,
        queue_name: str,
        exchange_name: str = DEFAULT_EXCHANGE,
        prefetch: int = 1,
    ):
        self._url = url
        self._queue_name = queue_name
        self._exchange_name = exchange_name
        self._prefetch = prefetch
        self._handlers: dict[str, EventHandler] = {}
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractRobustChannel | None = None
        self._queue: AbstractRobustQueue | None = None
        self._stop = asyncio.Event()

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type in self._handlers:
            raise ValueError(f"Handler already registered for {event_type!r}")
        self._handlers[event_type] = handler

    async def run(self) -> None:
        if not self._handlers:
            raise RuntimeError("No handlers registered; call subscribe() first")
        self._connection = await aio_pika.connect_robust(self._url)
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=self._prefetch)
        exchange = await self._channel.declare_exchange(
            self._exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        self._queue = await self._channel.declare_queue(self._queue_name, durable=True)
        for event_type in self._handlers:
            await self._queue.bind(exchange, routing_key=event_type)
        logger.info(
            "RabbitMQ consumer ready queue=%s bindings=%s",
            self._queue_name,
            list(self._handlers),
        )
        async with self._queue.iterator() as it:
            async for message in it:
                if self._stop.is_set():
                    break
                await self._dispatch(message)

    async def _dispatch(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        event_type = message.type or ""
        handler = self._handlers.get(event_type)
        if handler is None:
            logger.warning("Dropping message with unregistered event_type=%s", event_type)
            await message.ack()
            return
        try:
            envelope = DomainEventEnvelope.model_validate_json(message.body)
        except Exception:
            logger.exception("Malformed envelope body=%r", message.body[:200])
            await message.ack()
            return
        try:
            await handler(envelope)
        except Exception:
            logger.exception(
                "Handler failed event_type=%s event_id=%s",
                envelope.event_type,
                envelope.event_id,
            )
            await message.nack(requeue=False)
            return
        await message.ack()

    async def close(self) -> None:
        self._stop.set()
        if self._connection is not None:
            await self._connection.close()
            self._connection = None
            self._channel = None
            self._queue = None
