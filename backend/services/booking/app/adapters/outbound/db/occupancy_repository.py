from datetime import date
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.occupancy_repository import (
    OccupancyDayRow,
    OccupancyRepository,
    RoomTypeOccupancyRow,
)


class SqlAlchemyOccupancyRepository(OccupancyRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_property_ids_for_hotel_ordered(self, hotel_id: UUID) -> list[UUID]:
        sql = text(
            """
            SELECT p.id
            FROM catalog.property p
            WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            ORDER BY p.id ASC
            """
        )
        rows = (await self._session.execute(sql, {"hotel_id": str(hotel_id)})).all()
        return [UUID(str(r.id)) for r in rows]

    async def property_belongs_to_hotel(self, property_id: UUID, hotel_id: UUID) -> bool:
        sql = text(
            """
            SELECT EXISTS(
              SELECT 1 FROM catalog.property p
              WHERE p.id = CAST(:property_id AS uuid) AND p.hotel_id = CAST(:hotel_id AS uuid)
            ) AS ok
            """
        )
        row = (
            await self._session.execute(
                sql, {"property_id": str(property_id), "hotel_id": str(hotel_id)}
            )
        ).one()
        return bool(row.ok)

    async def room_type_belongs_to_property(self, room_type_id: UUID, property_id: UUID) -> bool:
        sql = text(
            """
            SELECT EXISTS(
              SELECT 1 FROM catalog.room_type rt
              WHERE rt.id = CAST(:room_type_id AS uuid)
                AND rt.property_id = CAST(:property_id AS uuid)
            ) AS ok
            """
        )
        row = (
            await self._session.execute(
                sql,
                {"room_type_id": str(room_type_id), "property_id": str(property_id)},
            )
        ).one()
        return bool(row.ok)

    async def fetch_daily_calendar_rows(
        self,
        property_id: UUID,
        date_from: date,
        date_to: date,
        *,
        room_type_id: UUID | None,
        projection: bool,
    ) -> list[OccupancyDayRow]:
        status_predicate = (
            "b.status IN ('CONFIRMED', 'CHECKED_IN')"
            if projection
            else "b.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')"
        )
        sql = text(
            f"""
            WITH days AS (
              SELECT generate_series(
                CAST(:date_from AS date),
                CAST(:date_to AS date),
                INTERVAL '1 day'
              )::date AS day
            )
            SELECT
              days.day AS day,
              (
                SELECT COUNT(*)::int
                FROM booking.booking b
                WHERE b.property_id = CAST(:property_id AS uuid)
                  AND {status_predicate}
                  AND b.checkin <= days.day
                  AND b.checkout > days.day
                  AND (
                    CAST(:filter_room_type AS uuid) IS NULL
                    OR b.room_type_id = CAST(:filter_room_type AS uuid)
                  )
              ) AS occupied,
              COALESCE(
                (
                  SELECT SUM(ic.available_units)::int
                  FROM catalog.inventory_calendar ic
                  INNER JOIN catalog.room_type rt ON rt.id = ic.room_type_id
                  WHERE rt.property_id = CAST(:property_id AS uuid)
                    AND rt.status = 'ACTIVE'
                    AND ic.day = days.day
                    AND (
                      CAST(:filter_room_type AS uuid) IS NULL
                      OR rt.id = CAST(:filter_room_type AS uuid)
                    )
                ),
                0
              ) AS inventory_available
            FROM days
            ORDER BY days.day ASC
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {
                    "property_id": str(property_id),
                    "date_from": date_from,
                    "date_to": date_to,
                    "filter_room_type": str(room_type_id) if room_type_id else None,
                },
            )
        ).all()
        return [
            OccupancyDayRow(
                day=r.day,
                occupied_rooms=int(r.occupied or 0),
                inventory_available_units=int(r.inventory_available or 0),
            )
            for r in rows
        ]

    async def fetch_daily_breakdown_for_date(
        self,
        property_id: UUID,
        day: date,
    ) -> list[RoomTypeOccupancyRow]:
        sql = text(
            """
            SELECT
              rt.id AS room_type_id,
              rt.name AS room_type_name,
              (
                SELECT COUNT(*)::int
                FROM booking.booking b
                WHERE b.property_id = CAST(:property_id AS uuid)
                  AND b.room_type_id = rt.id
                  AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
                  AND b.checkin <= CAST(:day AS date)
                  AND b.checkout > CAST(:day AS date)
              ) AS occupied,
              COALESCE(
                (
                  SELECT ic.available_units::int
                  FROM catalog.inventory_calendar ic
                  WHERE ic.room_type_id = rt.id AND ic.day = CAST(:day AS date)
                  LIMIT 1
                ),
                0
              ) AS inventory_available
            FROM catalog.room_type rt
            WHERE rt.property_id = CAST(:property_id AS uuid)
              AND rt.status = 'ACTIVE'
            ORDER BY rt.name ASC
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {
                    "property_id": str(property_id),
                    "day": day,
                },
            )
        ).all()
        return [
            RoomTypeOccupancyRow(
                room_type_id=UUID(str(r.room_type_id)),
                room_type_name=str(r.room_type_name),
                occupied_rooms=int(r.occupied or 0),
                inventory_available_units=int(r.inventory_available or 0),
            )
            for r in rows
        ]
