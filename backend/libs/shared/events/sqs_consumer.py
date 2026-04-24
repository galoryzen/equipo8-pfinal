import asyncio
import json
import logging

import aioboto3
from contracts.events.base import DomainEventEnvelope
from shared.events.consumer_port import DomainEventConsumer, EventHandler

logger = logging.getLogger(__name__)

_WAIT_TIME_SECONDS = 20
_MAX_MESSAGES = 10
_VISIBILITY_TIMEOUT = 60


class SqsEventConsumer(DomainEventConsumer):
    """Long-polling SQS consumer for EventBridge-routed domain events.

    SQS Body is expected to be the EventBridge envelope (JSON with top-level
    `detail-type` and `detail` fields). Handlers receive a validated
    DomainEventEnvelope reconstructed from `detail`.

    Ack/nack semantics mirror RabbitMQEventConsumer: delete on success, do
    nothing on handler failure (SQS redelivers after visibility timeout; DLQ
    after maxReceiveCount), delete on poison pill (malformed Body or envelope)
    or unregistered event type.
    """

    def __init__(self, queue_url: str, region: str | None = None):
        self._queue_url = queue_url
        self._region = region
        self._handlers: dict[str, EventHandler] = {}
        self._stop = asyncio.Event()

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type in self._handlers:
            raise ValueError(f"Handler already registered for {event_type!r}")
        self._handlers[event_type] = handler

    async def run(self) -> None:
        if not self._handlers:
            raise RuntimeError("No handlers registered; call subscribe() first")
        self._stop.clear()
        session = aioboto3.Session()
        async with session.client("sqs", region_name=self._region) as sqs:
            logger.info(
                "SQS consumer ready queue=%s bindings=%s",
                self._queue_url,
                list(self._handlers),
            )
            while not self._stop.is_set():
                resp = await sqs.receive_message(
                    QueueUrl=self._queue_url,
                    WaitTimeSeconds=_WAIT_TIME_SECONDS,
                    MaxNumberOfMessages=_MAX_MESSAGES,
                    VisibilityTimeout=_VISIBILITY_TIMEOUT,
                )
                for msg in resp.get("Messages", []):
                    if self._stop.is_set():
                        break
                    await self._dispatch(sqs, msg)

    async def _dispatch(self, sqs_client, msg: dict) -> None:
        receipt = msg["ReceiptHandle"]
        body = msg.get("Body", "")

        try:
            outer = json.loads(body)
        except Exception:
            logger.exception("Malformed SQS Body body=%r", body[:200])
            await sqs_client.delete_message(QueueUrl=self._queue_url, ReceiptHandle=receipt)
            return

        event_type = outer.get("detail-type", "")
        handler = self._handlers.get(event_type)
        if handler is None:
            logger.warning("Dropping SQS message with unregistered event_type=%s", event_type)
            await sqs_client.delete_message(QueueUrl=self._queue_url, ReceiptHandle=receipt)
            return

        try:
            envelope = DomainEventEnvelope.model_validate(outer.get("detail", {}))
        except Exception:
            logger.exception(
                "Malformed envelope in SQS detail event_type=%s detail=%r",
                event_type,
                str(outer.get("detail"))[:200],
            )
            await sqs_client.delete_message(QueueUrl=self._queue_url, ReceiptHandle=receipt)
            return

        try:
            await handler(envelope)
        except Exception:
            logger.exception(
                "Handler failed event_type=%s event_id=%s",
                envelope.event_type,
                envelope.event_id,
            )
            # Do not delete → SQS redelivers after VT; DLQ after maxReceiveCount.
            return

        await sqs_client.delete_message(QueueUrl=self._queue_url, ReceiptHandle=receipt)

    async def close(self) -> None:
        self._stop.set()
