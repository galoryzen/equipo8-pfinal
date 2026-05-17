from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository


def _default_today() -> date:
    return datetime.now(UTC).date()


class GetAdminBookingsMetricsUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        clock: Callable[[], date] | None = None,
    ):
        self._repo = repo
        self._clock = clock or _default_today

    async def execute(self) -> dict[str, int]:
        today = self._clock()
        return await self._repo.count_admin_bookings_metrics(today=today)
