from abc import ABC, abstractmethod
from typing import Awaitable, Callable

from contracts.events.base import DomainEventEnvelope

EventHandler = Callable[[DomainEventEnvelope], Awaitable[None]]


class DomainEventConsumer(ABC):
    @abstractmethod
    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Register a handler for an event type. Raises ValueError if duplicated."""

    @abstractmethod
    async def run(self) -> None:
        """Start consuming. Blocks until close() is called or the loop is cancelled."""

    async def close(self) -> None:
        """Release any open connections. No-op by default."""
        return None
