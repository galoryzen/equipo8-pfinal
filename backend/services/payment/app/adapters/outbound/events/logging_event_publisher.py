import logging
from typing import Any

from app.application.ports.outbound.domain_event_publisher import DomainEventPublisher

logger = logging.getLogger(__name__)


class LoggingDomainEventPublisher(DomainEventPublisher):
    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        logger.info("domain_event type=%s payload=%s", event_type, payload)
