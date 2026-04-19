import logging
from datetime import datetime
from decimal import Decimal
from uuid import UUID

import httpx

from app.application.dto import BookingForPayment
from app.application.exceptions import (
    BookingNotFoundError,
    BookingNotPayableError,
    BookingSnapshotError,
)
from app.application.ports.outbound.booking_client_port import BookingServiceClient
from app.config import settings

logger = logging.getLogger(__name__)


class HttpBookingServiceClient(BookingServiceClient):
    def __init__(self, client: httpx.AsyncClient):
        self._client = client
        self._base = settings.BOOKING_SERVICE_URL.rstrip("/")

    async def get_booking_for_user(self, booking_id: UUID, authorization_header_value: str) -> BookingForPayment:
        url = f"{self._base}/api/v1/booking/bookings/{booking_id}"
        headers = {"Authorization": authorization_header_value}
        try:
            response = await self._client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("Booking GET failed: %s", exc)
            raise BookingSnapshotError("Booking service unavailable") from exc

        if response.status_code == 404:
            raise BookingNotFoundError()
        if response.status_code == 401:
            raise BookingNotFoundError()
        if response.status_code != 200:
            logger.warning("Booking GET unexpected %s: %s", response.status_code, response.text)
            raise BookingSnapshotError("Could not load booking")

        data = response.json()
        raw_hold = data.get("hold_expires_at")
        hold_dt: datetime | None
        if raw_hold is None:
            hold_dt = None
        else:
            hold_dt = datetime.fromisoformat(str(raw_hold).replace("Z", "+00:00"))
            if hold_dt.tzinfo is not None:
                hold_dt = hold_dt.replace(tzinfo=None)
        return BookingForPayment(
            id=UUID(data["id"]),
            total_amount=Decimal(str(data["total_amount"])),
            currency_code=data["currency_code"],
            hold_expires_at=hold_dt,
            status=data["status"],
        )

    async def notify_payment_confirmed(self, booking_id: UUID, payment_intent_id: UUID) -> None:
        url = f"{self._base}/api/v1/booking/internal/bookings/{booking_id}/confirm-after-payment"
        headers = {"X-Internal-Payment-Key": settings.BOOKING_CALLBACK_SECRET}
        payload = {"payment_intent_id": str(payment_intent_id)}
        try:
            response = await self._client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("Booking confirm callback failed: %s", exc)
            raise BookingSnapshotError("Booking confirmation unavailable") from exc

        if response.status_code == 204:
            return
        if response.status_code == 409:
            raise BookingNotPayableError(response.text)
        if response.status_code == 404:
            raise BookingSnapshotError("Booking not found for confirmation")
        logger.warning("Booking confirm unexpected %s: %s", response.status_code, response.text)
        raise BookingSnapshotError("Booking confirmation failed")
