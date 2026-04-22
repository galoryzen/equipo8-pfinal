from shared.events.consumer_port import DomainEventConsumer, EventHandler


class SqsEventConsumer(DomainEventConsumer):
    """AWS SQS consumer stub. Wire boto3 receive_message/delete_message before enabling in prod."""

    def __init__(self, queue_url: str, region: str | None = None):
        self._queue_url = queue_url
        self._region = region
        self._handlers: dict[str, EventHandler] = {}

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type in self._handlers:
            raise ValueError(f"Handler already registered for {event_type!r}")
        self._handlers[event_type] = handler

    async def run(self) -> None:
        raise NotImplementedError(
            "SQS consumer: wire boto3 receive_message/delete_message before enabling in prod "
            f"(queue={self._queue_url}, region={self._region})"
        )
