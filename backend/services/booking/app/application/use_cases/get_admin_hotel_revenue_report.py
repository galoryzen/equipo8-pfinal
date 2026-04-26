from datetime import date, timedelta
from uuid import UUID

from app.application.ports.outbound.revenue_report_repository import (
    RevenuePeriodAggregate,
    RevenueReportRepository,
)
from app.domain.dashboard_metrics_calc import previous_equivalent_range
from app.domain.revenue_report_calc import RevenueKpiRaw, build_revenue_report_kpis


class GetAdminHotelRevenueReportUseCase:
    """Admin revenue report by hotel and date range vs equivalent prior period."""

    def __init__(self, repo: RevenueReportRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        hotel_id: UUID,
        date_from: date,
        date_to: date,
    ) -> dict:
        if date_to < date_from:
            raise ValueError("Rango de fechas inválido: 'to' debe ser >= 'from'")
        if date_to > date.today():
            raise ValueError("Rango de fechas inválido: 'to' no puede ser posterior a la fecha actual.")

        period_end_exclusive = date_to + timedelta(days=1)
        current_period = await self._repo.aggregate_hotel_period(
            hotel_id,
            date_from,
            date_to,
            period_end_exclusive=period_end_exclusive,
        )

        prev_from, prev_to = previous_equivalent_range(date_from, date_to)
        prev_end_exclusive = prev_to + timedelta(days=1)
        previous_period = await self._repo.aggregate_hotel_period(
            hotel_id,
            prev_from,
            prev_to,
            period_end_exclusive=prev_end_exclusive,
        )

        trends = await self._repo.list_revenue_trends(hotel_id, date_from, date_to)
        by_room_type = await self._repo.list_revenue_by_room_type(hotel_id, date_from, date_to)

        kpis = build_revenue_report_kpis(
            self._to_kpi_raw(current_period),
            self._to_kpi_raw(previous_period),
        )

        total_aggregated_revenue = round(sum(float(item.total_revenue) for item in by_room_type), 4)

        return {
            "kpis": kpis,
            "trends": [
                {
                    "date": point.day.isoformat(),
                    "revenue": round(float(point.revenue), 4),
                    "occupancyRate": point.occupancy_rate,
                }
                for point in trends
            ],
            "revenueByRoomType": [
                {
                    "roomType": row.room_type,
                    "unitsSold": row.units_sold,
                    "avgRate": round(float(row.avg_rate), 4),
                    "totalRevenue": round(float(row.total_revenue), 4),
                }
                for row in by_room_type
            ],
            "totalAggregatedRevenue": total_aggregated_revenue,
            "metadata": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat(),
                "currency": current_period.currency_code or previous_period.currency_code or "USD",
            },
        }

    @staticmethod
    def _to_kpi_raw(aggregate: RevenuePeriodAggregate) -> RevenueKpiRaw:
        return RevenueKpiRaw(
            total_revenue=aggregate.total_revenue,
            sold_room_nights=aggregate.sold_room_nights,
            occupied_room_nights=aggregate.occupied_room_nights,
            capacity_room_nights=aggregate.capacity_room_nights,
            has_activity=aggregate.has_activity,
        )

