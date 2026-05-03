from abc import ABC, abstractmethod
from uuid import UUID

from app.schemas.manager import (
    AddPropertyImageIn,
    CreatePromotionIn,
    UpdateCancellationPolicyIn,
    UpdateHotelProfileIn,
)


class ManagerRepository(ABC):
    @abstractmethod
    async def list_manager_hotels(
        self,
        hotel_id: UUID,
        page: int,
        page_size: int,
    ) -> tuple[list[dict], int]:
        """Return paginated list of properties for the given hotel_id with occupancy data."""

    @abstractmethod
    async def get_property_occupancy(self, property_id: UUID) -> tuple[int, int]:
        """Return (available_today, total_capacity) for the property."""

    @abstractmethod
    async def list_room_types_with_availability(
        self,
        property_id: UUID,
        page: int,
        page_size: int,
    ) -> tuple[list[dict], int]:
        """Return paginated room types with today's available/total units."""

    @abstractmethod
    async def create_promotion(self, property_id: UUID, data: "CreatePromotionIn") -> dict:
        """Create a promotion for a rate plan belonging to this property and return it."""

    @abstractmethod
    async def get_room_type_promotion(self, room_type_id: UUID) -> dict | None:
        """Return the latest active promotion for any rate plan of this room type, or None."""

    @abstractmethod
    async def delete_promotion(self, promotion_id: UUID) -> None:
        """Delete a promotion by ID. Raises ValueError if not found."""

    @abstractmethod
    async def get_rate_plan_cancellation_policy(self, rate_plan_id: UUID) -> dict | None:
        """Return the current cancellation policy of a rate plan, or None if unset."""

    @abstractmethod
    async def update_rate_plan_cancellation_policy(
        self, rate_plan_id: UUID, data: "UpdateCancellationPolicyIn"
    ) -> dict:
        """Find-or-create a matching cancellation_policy row and link it to the rate plan."""

    @abstractmethod
    async def get_hotel_profile(self, property_id: UUID, hotel_id: UUID) -> dict:
        """Return the editable profile for a property owned by ``hotel_id``.

        Raises ``PropertyNotFoundError`` if the property does not exist or is
        not owned by the given hotel.
        """

    @abstractmethod
    async def update_hotel_profile(
        self, property_id: UUID, hotel_id: UUID, data: "UpdateHotelProfileIn"
    ) -> dict:
        """Apply a partial update to description, amenity codes and the GENERAL policy.

        Returns the same shape as ``get_hotel_profile``. Raises
        ``PropertyNotFoundError`` when the property is not owned by the hotel
        and ``AmenityNotFoundError`` when an unknown amenity code is sent.
        """

    @abstractmethod
    async def add_property_image(
        self, property_id: UUID, hotel_id: UUID, data: "AddPropertyImageIn"
    ) -> dict:
        """Append an image to the property's gallery (URL-based) and return it."""

    @abstractmethod
    async def delete_property_image(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> None:
        """Remove an image and renumber the remaining gallery rows by display_order."""

    @abstractmethod
    async def set_primary_property_image(
        self, property_id: UUID, hotel_id: UUID, image_id: UUID
    ) -> list[dict]:
        """Promote ``image_id`` to ``display_order=0`` and return the new ordered list."""
