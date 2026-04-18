from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID


class CatalogInventoryPort(ABC):
    """Synchronous coordination with Catalog for inventory availability."""

    @abstractmethod
    async def create_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        """Decrement availability in Catalog for the date range.

        Raises InventoryUnavailableError if Catalog rejects (409) because of
        insufficient inventory. Raises CatalogUnavailableError for network or
        server errors — caller decides retry policy.
        """

    @abstractmethod
    async def release_hold(
        self,
        room_type_id: UUID,
        checkin: date,
        checkout: date,
    ) -> None:
        """Increment availability in Catalog for the date range.

        Raises CatalogUnavailableError for network or server errors — caller
        decides retry policy.
        """
