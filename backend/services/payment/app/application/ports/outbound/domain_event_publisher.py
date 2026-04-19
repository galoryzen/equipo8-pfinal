from abc import ABC, abstractmethod
from typing import Any


class DomainEventPublisher(ABC):
    @abstractmethod
    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        """Stub for bus/outbox — default implementation logs only."""
