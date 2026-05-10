"""Per room-type occupancy breakdown for one property and one day."""

from datetime import date
from uuid import UUID

from app.application.ports.outbound.occupancy_repository import OccupancyRepository
from app.domain.occupancy_calc import occupancy_level, occupancy_rate_percent


class GetOccupancyDailyBreakdownUseCase:
    def __init__(self, repo: OccupancyRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        hotel_id: UUID,
        property_id: UUID,
        day: date,
    ) -> dict:
        if not await self._repo.property_belongs_to_hotel(property_id, hotel_id):
            raise PermissionError("No autorizado para consultar esta propiedad")

        rows = await self._repo.fetch_daily_breakdown_for_date(property_id, day)
        room_types_out: list[dict] = []
        for row in rows:
            blocked = 0
            total = row.occupied_rooms + row.inventory_available_units + blocked
            rate = occupancy_rate_percent(row.occupied_rooms, total)
            room_types_out.append(
                {
                    "room_type_id": str(row.room_type_id),
                    "room_type_name": row.room_type_name,
                    "total_rooms": total,
                    "occupied_rooms": row.occupied_rooms,
                    "blocked_rooms": blocked,
                    "available_rooms": max(0, total - row.occupied_rooms - blocked),
                    "occupancy_rate": rate,
                    "occupancy_level": occupancy_level(rate),
                }
            )

        return {
            "property_id": str(property_id),
            "date": day.isoformat(),
            "room_types": room_types_out,
        }
