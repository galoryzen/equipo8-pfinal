from contracts.events.base import DomainEventEnvelope
from shared.events.port import DomainEventPublisher


class EventBridgeEventPublisher(DomainEventPublisher):
    def __init__(self, bus_name: str, region: str | None = None):
        self._bus_name = bus_name
        self._region = region

    async def publish(self, envelope: DomainEventEnvelope) -> None:
        raise NotImplementedError(
            "EventBridge publisher: wire boto3 put_events before enabling in prod "
            f"(bus={self._bus_name}, region={self._region})"
        )
