import logging

from contracts.events.base import DomainEventEnvelope
from shared.events.port import DomainEventPublisher

logger = logging.getLogger(__name__)


class LoggingDomainEventPublisher(DomainEventPublisher):
    async def publish(self, envelope: DomainEventEnvelope) -> None:
        logger.info(
            "domain_event type=%s event_id=%s payload=%s",
            envelope.event_type,
            envelope.event_id,
            envelope.payload,
        )
