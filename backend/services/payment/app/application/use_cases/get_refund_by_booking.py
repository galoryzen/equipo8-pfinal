from uuid import UUID

from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.models import Refund


class GetRefundByBookingUseCase:
    def __init__(self, repo: PaymentRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID) -> Refund | None:
        return await self._repo.find_refund_by_booking_id(booking_id)
