import logging

import aioboto3
from contracts.events.base import DomainEventEnvelope
from shared.events.port import DomainEventPublisher

logger = logging.getLogger(__name__)


class EventBridgeEventPublisher(DomainEventPublisher):
    def __init__(self, bus_name: str, source: str, region: str | None = None):
        self._bus_name = bus_name
        self._source = source
        self._region = region
        self._session = aioboto3.Session()

    async def publish(self, envelope: DomainEventEnvelope) -> None:
        async with self._session.client("events", region_name=self._region) as client:
            resp = await client.put_events(
                Entries=[
                    {
                        "EventBusName": self._bus_name,
                        "Source": self._source,
                        "DetailType": envelope.event_type,
                        "Detail": envelope.to_json(),
                    }
                ]
            )

        failed = resp.get("FailedEntryCount", 0)
        if failed:
            entry = (resp.get("Entries") or [{}])[0]
            raise RuntimeError(
                f"EventBridge put_events failed: "
                f"code={entry.get('ErrorCode')!r} message={entry.get('ErrorMessage')!r} "
                f"event_type={envelope.event_type} event_id={envelope.event_id}"
            )

        logger.debug(
            "Published event_type=%s event_id=%s bus=%s",
            envelope.event_type,
            envelope.event_id,
            self._bus_name,
        )
