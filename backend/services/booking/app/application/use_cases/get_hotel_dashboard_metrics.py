from datetime import date, timedelta
from uuid import UUID

from app.application.hotel_partner import resolve_hotel_id_for_user
from app.application.ports.outbound.dashboard_metrics_repository import (
    DashboardMetricsRepository,
)
from app.domain.dashboard_metrics_calc import (
    PeriodRawMetrics,
    build_dashboard_metrics,
)


class GetHotelDashboardMetricsUseCase:
    """Hotel partner dashboard metrics for a date range vs the immediately prior window."""

    def __init__(self, repo: DashboardMetricsRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        user_id: UUID,
        date_from: date,
        date_to: date,
        hotel_id: UUID | None = None,
    ) -> dict:
        # CACHE (future): key f"dashboard:metrics:{hotel_id}:{date_from}:{date_to}"
        resolved_hotel_id = hotel_id or await resolve_hotel_id_for_user(user_id)
        if date_to < date_from:
            raise ValueError("Rango de fechas inválido: 'to' debe ser >= 'from'")
        if date_to > date.today():
            raise ValueError("Rango de fechas inválido: 'to' no puede ser posterior a la fecha actual.")

        period_end_exclusive = date_to + timedelta(days=1)

        cur = await self._repo.aggregate_hotel_period(
            resolved_hotel_id, date_from, date_to, period_end_exclusive=period_end_exclusive
        )
        span_days = (date_to - date_from).days + 1
        prev_to = date_from - timedelta(days=1)
        prev_from = prev_to - timedelta(days=span_days - 1)
        prev_end_exclusive = prev_to + timedelta(days=1)

        prev = await self._repo.aggregate_hotel_period(
            resolved_hotel_id, prev_from, prev_to, period_end_exclusive=prev_end_exclusive
        )

        current = PeriodRawMetrics(
            total_bookings=cur.total_bookings,
            confirmed_room_nights=cur.confirmed_room_nights,
            revenue_captured=cur.revenue_captured,
            avg_rating=cur.avg_rating,
            capacity_room_nights=cur.capacity_room_nights,
        )
        previous = PeriodRawMetrics(
            total_bookings=prev.total_bookings,
            confirmed_room_nights=prev.confirmed_room_nights,
            revenue_captured=prev.revenue_captured,
            avg_rating=prev.avg_rating,
            capacity_room_nights=prev.capacity_room_nights,
        )

        metrics = build_dashboard_metrics(current, previous)
        active_cancellations = await self._repo.count_active_cancellations(
            resolved_hotel_id, date_from, period_end_exclusive=period_end_exclusive
        )
        trends = await self._repo.list_booking_trends(resolved_hotel_id, date_from, date_to)
        activities = await self._repo.list_recent_activity(
            resolved_hotel_id, date_from, date_to, limit=10
        )
        upcoming = await self._repo.list_upcoming_checkins(resolved_hotel_id, limit=10)

        available_rooms = max(0.0, cur.capacity_room_nights - cur.active_room_nights)

        return {
            "metrics": metrics,
            "activeCancellations": active_cancellations,
            "availableRooms": round(available_rooms, 2),
            "bookingTrends": [
                {"date": p.day.isoformat(), "bookings": p.bookings} for p in trends
            ],
            "recentActivity": [
                {
                    "type": item.activity_type,
                    "description": item.description,
                    "timestamp": item.occurred_at,
                }
                for item in activities
            ],
            "upcomingCheckins": [
                {
                    "guest": item.guest,
                    "roomType": item.room_type,
                    "checkIn": item.checkin.isoformat(),
                    "checkOut": item.checkout.isoformat(),
                    "status": item.status,
                    "amount": float(item.amount),
                }
                for item in upcoming
            ],
        }
