from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository
from app.schemas.manager import HotelStatsOut


class GetHotelMetricsUseCase:
    def __init__(self, repo: ManagerRepository, booking_stats: dict):
        self._repo = repo
        self._booking_stats = booking_stats

    async def execute(self, property_id: UUID) -> HotelStatsOut:
        available_today, total_capacity = await self._repo.get_property_occupancy(property_id)

        if total_capacity > 0:
            occupancy_rate = round((1 - available_today / total_capacity) * 100, 1)
        else:
            occupancy_rate = 0.0

        return HotelStatsOut(
            occupancyRate=occupancy_rate,
            activeBookings=self._booking_stats.get("active_bookings", 0),
            monthlyRevenue=self._booking_stats.get("monthly_revenue", 0.0),
        )
