from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from uuid import UUID


@dataclass(frozen=True)
class OccupancyDayRow:
    day: date
    occupied_rooms: int
    inventory_available_units: int


@dataclass(frozen=True)
class RoomTypeOccupancyRow:
    room_type_id: UUID
    room_type_name: str
    occupied_rooms: int
    inventory_available_units: int


class OccupancyRepository(ABC):
    """Reads booking + catalog inventory for occupancy reporting."""

    @abstractmethod
    async def list_property_ids_for_hotel_ordered(self, hotel_id: UUID) -> list[UUID]:
        """Deterministic order (UUID ascending) for default property selection."""

    @abstractmethod
    async def property_belongs_to_hotel(self, property_id: UUID, hotel_id: UUID) -> bool:
        ...

    @abstractmethod
    async def room_type_belongs_to_property(self, room_type_id: UUID, property_id: UUID) -> bool:
        ...

    @abstractmethod
    async def fetch_daily_calendar_rows(
        self,
        property_id: UUID,
        date_from: date,
        date_to: date,
        *,
        room_type_id: UUID | None,
        projection: bool,
    ) -> list[OccupancyDayRow]:
        """One row per day in range with occupied count + inventory available sum.

        If ``projection`` is True, only CONFIRMED and CHECKED_IN count toward occupancy.
        Otherwise CONFIRMED, CHECKED_IN, and CHECKED_OUT count (stay overlap rule).

        ``total_rooms`` is computed in the use case as occupied + available + blocked (blocked=0).
        """

    @abstractmethod
    async def fetch_daily_breakdown_for_date(
        self,
        property_id: UUID,
        day: date,
    ) -> list[RoomTypeOccupancyRow]:
        """Uses CONFIRMED + CHECKED_IN + CHECKED_OUT for occupied counts."""
        ...
