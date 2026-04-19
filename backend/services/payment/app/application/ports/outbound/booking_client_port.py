from abc import ABC, abstractmethod
from uuid import UUID

from app.application.dto import BookingForPayment


class BookingServiceClient(ABC):
    @abstractmethod
    async def get_booking_for_user(
        self, booking_id: UUID, authorization_header_value: str
    ) -> BookingForPayment:
        """GET traveler booking detail; raises if not found or not owner."""
