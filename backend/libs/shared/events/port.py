from abc import ABC, abstractmethod

from contracts.events.base import DomainEventEnvelope


class DomainEventPublisher(ABC):
    @abstractmethod
    async def publish(self, envelope: DomainEventEnvelope) -> None:
        """Publish a domain event envelope to the configured bus backend."""

    async def close(self) -> None:
        """Release any open connections. No-op by default."""
        return None
