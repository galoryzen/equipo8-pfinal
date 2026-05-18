from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.revenue_report_repository import (
    RevenueByRoomTypePoint,
    RevenuePeriodAggregate,
    RevenueReportRepository,
    RevenueTrendPoint,
)


class SqlAlchemyRevenueReportRepository(RevenueReportRepository):
    """Read-only aggregates for revenue report payload (single-shot DB aggregation)."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def aggregate_hotel_period(
        self,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
        *,
        period_end_exclusive: date,
    ) -> RevenuePeriodAggregate:
        sql = text(
            """
            WITH hotel_properties AS (
              SELECT p.id
              FROM catalog.property p
              WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            ),
            active_room_types AS (
              SELECT rt.id
              FROM catalog.room_type rt
              WHERE rt.property_id IN (SELECT id FROM hotel_properties)
                AND rt.status = 'ACTIVE'
            ),
            eligible_bookings AS (
              SELECT b.id, b.checkin, b.checkout, b.currency_code, b.total_amount
              FROM booking.booking b
              WHERE b.property_id IN (SELECT id FROM hotel_properties)
                AND b.status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
                AND b.created_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
            ),
            daily_occupied AS (
              SELECT eb.checkin::date AS day, COUNT(*)::float AS occupied_units
              FROM eligible_bookings eb
              GROUP BY eb.checkin::date
            ),
            daily_capacity AS (
              SELECT
                d.day,
                d.occupied_units,
                COALESCE(SUM(ic.available_units), 0)::float AS available_units,
                GREATEST(1, (SELECT COUNT(*)::int FROM active_room_types))::float AS fallback_capacity
              FROM daily_occupied d
              LEFT JOIN catalog.inventory_calendar ic
                ON ic.day = d.day
                AND ic.room_type_id IN (SELECT id FROM active_room_types)
              GROUP BY d.day, d.occupied_units
            )
            SELECT
              (
                SELECT COALESCE(SUM(eb.total_amount), 0)
                FROM eligible_bookings eb
              ) AS total_revenue,
              (
                -- ADR denominator: noches vendidas (reservas pending, checked-in o checked-out).
                SELECT COALESCE(SUM((eb.checkout - eb.checkin)::int), 0)::float
                FROM eligible_bookings eb
              ) AS sold_room_nights,
              (
                -- Ocupación para KPI: unidades confirmadas por check-in (misma base que trends).
                SELECT COALESCE(SUM(d.occupied_units), 0)::float
                FROM daily_occupied d
              ) AS occupied_room_nights,
              (
                -- Capacidad para ocupación: ocupadas + disponibles por día de check-in.
                SELECT CASE
                  WHEN EXISTS (SELECT 1 FROM daily_capacity)
                    THEN COALESCE(
                      SUM(
                        daily_capacity.occupied_units
                        + CASE
                            WHEN daily_capacity.available_units > 0
                              THEN daily_capacity.available_units
                            ELSE daily_capacity.fallback_capacity
                          END
                      ),
                      0
                    )::float
                  ELSE 1::float
                END
                FROM daily_capacity
              ) AS capacity_room_nights,
              (
                -- "Sin período anterior" se define como ventana sin actividad de negocio
                -- (reservas pending, checked-in o checked-out en la ventana).
                EXISTS (SELECT 1 FROM eligible_bookings)
              ) AS has_activity,
              COALESCE(
                (
                  SELECT eb.currency_code
                  FROM eligible_bookings eb
                  ORDER BY eb.checkin DESC
                  LIMIT 1
                )
              ) AS currency_code
            """
        )
        row = (
            await self._session.execute(
                sql,
                {
                    "hotel_id": str(hotel_id),
                    "date_from": date_from,
                    "date_to": date_to,
                    "period_end_exclusive": period_end_exclusive,
                },
            )
        ).one()
        return RevenuePeriodAggregate(
            total_revenue=Decimal(str(row.total_revenue or 0)),
            sold_room_nights=float(row.sold_room_nights or 0.0),
            occupied_room_nights=float(row.occupied_room_nights or 0.0),
            capacity_room_nights=float(row.capacity_room_nights or 1.0),
            has_activity=bool(row.has_activity),
            currency_code=str(row.currency_code) if row.currency_code else None,
        )

    async def list_revenue_trends(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[RevenueTrendPoint]:
        sql = text(
            """
            WITH hotel_properties AS (
              SELECT p.id
              FROM catalog.property p
              WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            ),
            active_room_types AS (
              SELECT rt.id
              FROM catalog.room_type rt
              WHERE rt.property_id IN (SELECT id FROM hotel_properties)
                AND rt.status = 'ACTIVE'
            ),
            eligible_bookings AS (
              -- Eje temporal único para trends: fecha de creación de la reserva.
              SELECT b.id, b.created_at::date AS day, b.total_amount
              FROM booking.booking b
              WHERE b.property_id IN (SELECT id FROM hotel_properties)
                AND b.created_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
                AND b.status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
            ),
            daily_revenue AS (
              SELECT
                eb.day,
                COALESCE(SUM(eb.total_amount), 0) AS revenue
              FROM eligible_bookings eb
              GROUP BY eb.day
            ),
            daily_occupied AS (
              SELECT
                eb.day AS day,
                COUNT(*)::float AS occupied_units
              FROM eligible_bookings eb
              GROUP BY eb.day
            ),
            daily_capacity AS (
              SELECT
                docc.day AS day,
                docc.occupied_units,
                COALESCE(SUM(ic.available_units), 0)::float AS available_units,
                GREATEST(1, (SELECT COUNT(*)::int FROM active_room_types))::float AS fallback_capacity
              FROM daily_occupied docc
              LEFT JOIN catalog.inventory_calendar ic
                ON ic.day = docc.day
                AND ic.room_type_id IN (SELECT id FROM active_room_types)
              GROUP BY docc.day, docc.occupied_units
            )
            SELECT
              docc.day,
              COALESCE(dr.revenue, 0) AS revenue,
              CASE
                WHEN (
                  COALESCE(docc.occupied_units, 0.0)
                  + CASE
                      WHEN dc.available_units > 0 THEN dc.available_units
                      ELSE dc.fallback_capacity
                    END
                ) <= 0 THEN 0
                ELSE LEAST(
                  100.0,
                  GREATEST(
                    0.0,
                    (
                      COALESCE(docc.occupied_units, 0.0)
                      /
                      (
                        COALESCE(docc.occupied_units, 0.0)
                        + CASE
                            WHEN dc.available_units > 0 THEN dc.available_units
                            ELSE dc.fallback_capacity
                          END
                      )
                    ) * 100.0
                  )
                )
              END AS occupancy_rate
            FROM daily_occupied docc
            LEFT JOIN daily_revenue dr ON dr.day = docc.day
            LEFT JOIN daily_capacity dc ON dc.day = docc.day
            ORDER BY docc.day ASC
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {"hotel_id": str(hotel_id), "date_from": date_from, "date_to": date_to},
            )
        ).all()
        return [
            RevenueTrendPoint(
                day=row.day,
                revenue=Decimal(str(row.revenue or 0)),
                occupancy_rate=round(float(row.occupancy_rate or 0.0), 4),
            )
            for row in rows
        ]

    async def list_revenue_by_room_type(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[RevenueByRoomTypePoint]:
        sql = text(
            """
            WITH hotel_properties AS (
              SELECT p.id
              FROM catalog.property p
              WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            ),
            eligible_bookings AS (
              -- Fuente de revenue: reservas pending, confirmed, checked-in o checked-out en la ventana.
              SELECT
                b.id,
                b.total_amount,
                b.unit_price,
                b.room_type_id
              FROM booking.booking b
              WHERE b.property_id IN (SELECT id FROM hotel_properties)
                AND b.status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
                AND b.created_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
            )
            SELECT
              COALESCE(rt.name, 'Unknown') AS room_type,
              COUNT(*)::int AS units_sold,
              COALESCE(AVG(eb.unit_price), 0) AS avg_rate,
              COALESCE(SUM(eb.total_amount), 0) AS total_revenue
            FROM eligible_bookings eb
            LEFT JOIN catalog.room_type rt ON rt.id = eb.room_type_id
            GROUP BY COALESCE(rt.name, 'Unknown')
            ORDER BY total_revenue DESC, room_type ASC
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {"hotel_id": str(hotel_id), "date_from": date_from, "date_to": date_to},
            )
        ).all()
        return [
            RevenueByRoomTypePoint(
                room_type=str(row.room_type),
                units_sold=int(row.units_sold or 0),
                avg_rate=Decimal(str(row.avg_rate or 0)),
                total_revenue=Decimal(str(row.total_revenue or 0)),
            )
            for row in rows
        ]
