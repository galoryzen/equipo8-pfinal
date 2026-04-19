from abc import ABC, abstractmethod
from uuid import UUID

from app.application.dto import BookingForPayment


class BookingServiceClient(ABC):
    @abstractmethod
    async def get_booking_for_user(
        self, booking_id: UUID, authorization_header_value: str
    ) -> BookingForPayment:
        """GET traveler booking detail; raises if not found or not owner."""

    @abstractmethod
    async def notify_payment_confirmed(self, booking_id: UUID, payment_intent_id: UUID) -> None:
        """Internal callback to move booking to CONFIRMED."""
