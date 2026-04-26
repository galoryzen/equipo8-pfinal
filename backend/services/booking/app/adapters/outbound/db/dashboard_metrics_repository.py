from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.dashboard_metrics_repository import (
    BookingTrendPoint,
    DashboardMetricsRepository,
    HotelPeriodAggregate,
    RecentActivityItem,
    UpcomingCheckinItem,
)


ACTIVE_BOOKING_STATUSES = (
    "'CONFIRMED', 'PENDING_PAYMENT', 'PENDING_CONFIRMATION'"
)


class SqlAlchemyDashboardMetricsRepository(DashboardMetricsRepository):
    """Read-only aggregates across booking, catalog, payments (same DB as booking worker)."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def aggregate_hotel_period(
        self,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
        *,
        period_end_exclusive: date,
    ) -> HotelPeriodAggregate:
        hid = str(hotel_id)
        sql = text(
            """
            SELECT
              (
                SELECT COUNT(*)::int
                FROM booking.booking b
                WHERE b.property_id IN (SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid))
                  AND b.status IN (""" + ACTIVE_BOOKING_STATUSES + """)
                  AND b.checkin < CAST(:period_end_exclusive AS date)
                  AND b.checkout > CAST(:date_from AS date)
              ) AS total_bookings,
              (
                SELECT COALESCE(SUM(x.overlap_nights * x.qty), 0)::float
                FROM (
                  SELECT
                    GREATEST(
                      0,
                      (LEAST(b.checkout, CAST(:period_end_exclusive AS date))
                        - GREATEST(b.checkin, CAST(:date_from AS date)))
                    )::int AS overlap_nights,
                    -- DDL actual (01-init.sql) no incluye booking_item; 1 habitación por fila de booking.
                    1::int AS qty
                  FROM booking.booking b
                  WHERE b.status = 'CONFIRMED'
                    AND b.property_id IN (SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid))
                    AND b.checkin < CAST(:period_end_exclusive AS date)
                    AND b.checkout > CAST(:date_from AS date)
                ) x
              ) AS confirmed_room_nights,
              (
                SELECT COALESCE(SUM(x.overlap_nights * x.qty), 0)::float
                FROM (
                  SELECT
                    GREATEST(
                      0,
                      (LEAST(b.checkout, CAST(:period_end_exclusive AS date))
                        - GREATEST(b.checkin, CAST(:date_from AS date)))
                    )::int AS overlap_nights,
                    1::int AS qty
                  FROM booking.booking b
                  WHERE b.status IN (""" + ACTIVE_BOOKING_STATUSES + """)
                    AND b.property_id IN (SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid))
                    AND b.checkin < CAST(:period_end_exclusive AS date)
                    AND b.checkout > CAST(:date_from AS date)
                ) x
              ) AS active_room_nights,
              (
                SELECT COALESCE(SUM(b.total_amount), 0)
                FROM booking.booking b
                WHERE b.property_id IN (SELECT pr.id FROM catalog.property pr WHERE pr.hotel_id = CAST(:hotel_id AS uuid))
                  AND b.status IN (""" + ACTIVE_BOOKING_STATUSES + """)
                  AND b.checkin < CAST(:period_end_exclusive AS date)
                  AND b.checkout > CAST(:date_from AS date)
              ) AS revenue_captured,
              (
                SELECT AVG(r.rating::float)
                FROM catalog.review r
                INNER JOIN catalog.property pr ON pr.id = r.property_id
                WHERE pr.hotel_id = CAST(:hotel_id AS uuid)
                  AND r.created_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
              ) AS avg_rating,
              (
                GREATEST(
                  1,
                  (CAST(:date_to AS date) - CAST(:date_from AS date) + 1)
                  * GREATEST(
                    1,
                    (
                      SELECT COUNT(*)::int
                      FROM catalog.room_type rt
                      INNER JOIN catalog.property pr ON pr.id = rt.property_id
                      WHERE pr.hotel_id = CAST(:hotel_id AS uuid)
                        AND rt.status = 'ACTIVE'
                    )
                  )
                )::float
              ) AS capacity_room_nights
            """
        )
        row = (
            await self._session.execute(
                sql,
                {
                    "hotel_id": hid,
                    "date_from": date_from,
                    "date_to": date_to,
                    "period_end_exclusive": period_end_exclusive,
                },
            )
        ).one()

        avg = row.avg_rating
        avg_rating = float(avg) if avg is not None else None

        return HotelPeriodAggregate(
            total_bookings=int(row.total_bookings or 0),
            confirmed_room_nights=float(row.confirmed_room_nights or 0.0),
            active_room_nights=float(row.active_room_nights or 0.0),
            revenue_captured=Decimal(str(row.revenue_captured or 0)),
            avg_rating=avg_rating,
            capacity_room_nights=float(row.capacity_room_nights or 1.0),
        )

    async def count_active_cancellations(
        self, hotel_id: UUID, date_from: date, *, period_end_exclusive: date
    ) -> int:
        sql = text(
            """
            SELECT COUNT(*)::int AS cancelled_count
            FROM booking.booking b
            WHERE b.status = 'CANCELLED'
              AND b.property_id IN (
                SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid)
              )
              AND b.checkin < CAST(:period_end_exclusive AS date)
              AND b.checkout > CAST(:date_from AS date)
            """
        )
        row = (await self._session.execute(sql, {"hotel_id": str(hotel_id), "date_from": date_from, "period_end_exclusive": period_end_exclusive})).one()
        return int(row.cancelled_count or 0)

    async def list_booking_trends(
        self, hotel_id: UUID, date_from: date, date_to: date
    ) -> list[BookingTrendPoint]:
        period_end_exclusive = date_to + timedelta(days=1)
        sql = text(
            """
            SELECT GREATEST(b.checkin, CAST(:date_from AS date))::date AS day, COUNT(*)::int AS bookings
            FROM booking.booking b
            WHERE b.property_id IN (
              SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            )
              AND b.status IN (""" + ACTIVE_BOOKING_STATUSES + """)
              AND b.checkin < CAST(:period_end_exclusive AS date)
              AND b.checkout > CAST(:date_from AS date)
            GROUP BY GREATEST(b.checkin, CAST(:date_from AS date))::date
            ORDER BY day ASC
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {
                    "hotel_id": str(hotel_id),
                    "date_from": date_from,
                    "period_end_exclusive": period_end_exclusive,
                },
            )
        ).all()
        return [BookingTrendPoint(day=row.day, bookings=int(row.bookings)) for row in rows]

    async def list_recent_activity(
        self, hotel_id: UUID, date_from: date, date_to: date, *, limit: int = 10
    ) -> list[RecentActivityItem]:
        sql = text(
            """
            WITH hotel_properties AS (
              SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            ),
            booking_activity AS (
              SELECT
                CONCAT('BOOKING_', bsh.to_status::text) AS activity_type,
                CONCAT('Reserva ', b.id::text, ' cambió a ', bsh.to_status::text) AS description,
                bsh.changed_at AS occurred_at
              FROM booking.booking_status_history bsh
              INNER JOIN booking.booking b ON b.id = bsh.booking_id
              WHERE b.property_id IN (SELECT id FROM hotel_properties)
                AND bsh.changed_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
            ),
            payment_activity AS (
              SELECT
                'PAYMENT_CAPTURED' AS activity_type,
                CONCAT('Pago capturado por ', COALESCE(p.captured_amount, 0)::text, ' ', p.currency_code) AS description,
                COALESCE(p.processed_at, p.created_at) AS occurred_at
              FROM payments.payment p
              INNER JOIN booking.booking b ON b.id = p.booking_id
              WHERE b.property_id IN (SELECT id FROM hotel_properties)
                AND p.status = 'CAPTURED'
                AND COALESCE(p.processed_at, p.created_at)::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
            ),
            review_activity AS (
              SELECT
                'REVIEW_CREATED' AS activity_type,
                CONCAT('Nueva reseña de ', r.rating::text, '/5') AS description,
                r.created_at AS occurred_at
              FROM catalog.review r
              WHERE r.property_id IN (SELECT id FROM hotel_properties)
                AND r.created_at::date BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
            )
            SELECT activity_type, description, occurred_at
            FROM (
              SELECT * FROM booking_activity
              UNION ALL
              SELECT * FROM payment_activity
              UNION ALL
              SELECT * FROM review_activity
            ) events
            ORDER BY occurred_at DESC
            LIMIT :limit
            """
        )
        rows = (
            await self._session.execute(
                sql,
                {
                    "hotel_id": str(hotel_id),
                    "date_from": date_from,
                    "date_to": date_to,
                    "limit": limit,
                },
            )
        ).all()
        return [
            RecentActivityItem(
                activity_type=str(row.activity_type),
                description=str(row.description),
                occurred_at=row.occurred_at.isoformat(),
            )
            for row in rows
        ]

    async def list_upcoming_checkins(
        self, hotel_id: UUID, *, limit: int = 10
    ) -> list[UpcomingCheckinItem]:
        sql = text(
            """
            SELECT
              COALESCE(g.full_name, 'Guest') AS guest,
              COALESCE(rt.name, 'Room') AS room_type,
              b.checkin,
              b.checkout,
              b.status::text AS status,
              b.total_amount AS amount
            FROM booking.booking b
            LEFT JOIN booking.guest g
              ON g.booking_id = b.id AND g.is_primary = TRUE
            LEFT JOIN catalog.room_type rt
              ON rt.id = b.room_type_id
            WHERE b.property_id IN (
              SELECT p.id FROM catalog.property p WHERE p.hotel_id = CAST(:hotel_id AS uuid)
            )
              AND b.status IN (""" + ACTIVE_BOOKING_STATUSES + """)
              AND b.checkin >= CURRENT_DATE
            ORDER BY b.checkin ASC, b.created_at DESC
            LIMIT :limit
            """
        )
        rows = (
            await self._session.execute(
                sql, {"hotel_id": str(hotel_id), "limit": limit}
            )
        ).all()
        return [
            UpcomingCheckinItem(
                guest=str(row.guest),
                room_type=str(row.room_type),
                checkin=row.checkin,
                checkout=row.checkout,
                status=str(row.status),
                amount=Decimal(str(row.amount)),
            )
            for row in rows
        ]
