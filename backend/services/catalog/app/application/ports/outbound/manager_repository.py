from abc import ABC, abstractmethod
from uuid import UUID

from app.schemas.manager import CreatePromotionIn, UpdateCancellationPolicyIn


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
