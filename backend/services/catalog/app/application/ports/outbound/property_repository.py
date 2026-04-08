from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.domain.models import Amenity, Property, Review


class PropertyRepository(ABC):
    @abstractmethod
    async def list_amenities(self) -> list[Amenity]:
        """All amenities ordered by name."""

    @abstractmethod
    async def search_featured(self, limit: int = 10) -> list[dict]:
        """Active properties ordered by popularity with today's min price."""

    @abstractmethod
    async def search(
        self,
        checkin: date,
        checkout: date,
        guests: int,
        city_id: UUID,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        amenity_codes: list[str] | None = None,
        sort_by: str = "popularity",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Return (items_as_dicts, total_count) for paginated search by city and stay dates."""

    @abstractmethod
    async def get_by_id(self, property_id: UUID) -> Property | None:
        """Full property with eager-loaded relations."""

    @abstractmethod
    async def get_reviews(self, property_id: UUID, page: int = 1, page_size: int = 10) -> tuple[list[Review], int]:
        """Paginated reviews for a property."""

    @abstractmethod
    async def get_min_prices(self, property_ids: list[UUID], checkin: date, checkout: date) -> dict[UUID, Decimal]:
        """Min nightly price per property for the date range."""
