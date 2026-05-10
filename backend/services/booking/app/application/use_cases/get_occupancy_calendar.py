"""Occupancy calendar for a property and date range (hotel partner).

Occupied nights use booking overlap ``checkin <= day < checkout``. Statuses counted:
``CONFIRMED``, ``CHECKED_IN``, and ``CHECKED_OUT`` (historical stays still occupy nights
before checkout; checkout day itself is excluded by the overlap rule).
"""

from datetime import date
from uuid import UUID

from app.application.ports.outbound.occupancy_repository import OccupancyRepository
from app.domain.occupancy_calc import occupancy_level, occupancy_rate_percent

MAX_RANGE_DAYS = 90


class GetOccupancyCalendarUseCase:
    """Daily occupancy with inventory-derived capacity (blocked rooms = 0 for now)."""

    def __init__(self, repo: OccupancyRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
        property_id: UUID | None,
        room_type_id: UUID | None,
    ) -> dict:
        if date_to < date_from:
            raise ValueError("date_from debe ser anterior o igual a date_to")
        if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
            raise ValueError("El rango máximo permitido es 90 días")

        pid = await self._resolve_property(hotel_id, property_id)
        if room_type_id is not None:
            if not await self._repo.room_type_belongs_to_property(room_type_id, pid):
                raise PermissionError(
                    "El tipo de habitación no pertenece a la propiedad indicada"
                )

        rows = await self._repo.fetch_daily_calendar_rows(
            pid,
            date_from,
            date_to,
            room_type_id=room_type_id,
            projection=False,
        )
        days_out: list[dict] = []
        for row in rows:
            blocked = 0
            total = row.occupied_rooms + row.inventory_available_units + blocked
            rate = occupancy_rate_percent(row.occupied_rooms, total)
            days_out.append(
                {
                    "date": row.day.isoformat(),
                    "total_rooms": total,
                    "occupied_rooms": row.occupied_rooms,
                    "blocked_rooms": blocked,
                    "available_rooms": max(0, total - row.occupied_rooms - blocked),
                    "occupancy_rate": rate,
                    "occupancy_level": occupancy_level(rate),
                }
            )

        return {
            "property_id": str(pid),
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "days": days_out,
        }

    async def _resolve_property(
        self, hotel_id: UUID, property_id: UUID | None
    ) -> UUID:
        if property_id is not None:
            if not await self._repo.property_belongs_to_hotel(property_id, hotel_id):
                raise PermissionError("No autorizado para consultar esta propiedad")
            return property_id
        ids = await self._repo.list_property_ids_for_hotel_ordered(hotel_id)
        if not ids:
            raise ValueError("hotel_id sin propiedades asociadas")
        return ids[0]
