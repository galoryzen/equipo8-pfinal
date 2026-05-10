"""Projected occupancy from forward-looking reservations (future window).

Only **CONFIRMED** and **CHECKED_IN** bookings count toward projection occupancy.
Cancelled / rejected / cart / expired stays are excluded by the repository filter.
"""

from datetime import date, timedelta
from uuid import UUID

from app.application.ports.outbound.occupancy_repository import OccupancyRepository
from app.domain.occupancy_calc import (
    merge_low_occupancy_periods,
    occupancy_level,
    occupancy_rate_percent,
)

MAX_PROJECTION_DAYS = 90


class GetOccupancyProjectionUseCase:
    def __init__(self, repo: OccupancyRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        hotel_id: UUID,
        property_id: UUID | None,
        days: int,
        today: date | None = None,
    ) -> dict:
        if days < 1 or days > MAX_PROJECTION_DAYS:
            raise ValueError("days debe estar entre 1 y 90")

        today_d = today or date.today()
        date_from = today_d
        date_to = today_d + timedelta(days=days - 1)

        pid = await self._resolve_property(hotel_id, property_id)

        rows = await self._repo.fetch_daily_calendar_rows(
            pid,
            date_from,
            date_to,
            room_type_id=None,
            projection=True,
        )

        days_out: list[dict] = []
        rate_pairs: list[tuple[date, float]] = []

        for row in rows:
            blocked = 0
            total = row.occupied_rooms + row.inventory_available_units + blocked
            rate = occupancy_rate_percent(row.occupied_rooms, total)
            level = occupancy_level(rate)
            alert = None
            if rate < 50.0:
                alert = {
                    "type": "LOW_OCCUPANCY",
                    "message": "Low projected occupancy",
                }
            days_out.append(
                {
                    "date": row.day.isoformat(),
                    "occupancy_rate": rate,
                    "occupancy_level": level,
                    "alert": alert,
                }
            )
            rate_pairs.append((row.day, rate))

        merged = merge_low_occupancy_periods(rate_pairs, low_threshold=50.0)
        alerts_out = [
            {
                "type": "LOW_OCCUPANCY_PERIOD",
                "date_from": p.date_from.isoformat(),
                "date_to": p.date_to.isoformat(),
                "average_occupancy_rate": p.average_occupancy_rate,
            }
            for p in merged
        ]

        return {
            "property_id": str(pid),
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "days": days_out,
            "alerts": alerts_out,
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
