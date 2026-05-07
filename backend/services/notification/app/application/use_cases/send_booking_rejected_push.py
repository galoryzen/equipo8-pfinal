import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingRejectedPayload

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.push_sender import PushSender
from app.domain.models import (
    BOOKING_REJECTED_TYPE,
    Notification,
    NotificationChannel,
    NotificationStatus,
)

logger = logging.getLogger(__name__)


class SendBookingRejectedPushUseCase:
    def __init__(
        self,
        repo: NotificationRepository,
        device_tokens: DeviceTokenRepository,
        push_sender: PushSender,
    ):
        self._repo = repo
        self._device_tokens = device_tokens
        self._push_sender = push_sender

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        if await self._repo.exists_by_event_id_and_channel(envelope.event_id, NotificationChannel.PUSH):
            logger.info("duplicate push event_id skipped event_id=%s", envelope.event_id)
            return

        payload = BookingRejectedPayload.model_validate(envelope.payload)
        devices = await self._device_tokens.list_active_by_user_id(payload.user_id)
        if not devices:
            logger.info(
                "no active device tokens for user_id=%s, skipping push event_id=%s",
                payload.user_id,
                envelope.event_id,
            )
            return

        reason_part = f" {payload.reason}" if payload.reason else ""
        body = f"Your booking was rejected.{reason_part} A {payload.refund_percent}% refund has been issued."

        notification = Notification(
            id=uuid.uuid4(),
            event_id=envelope.event_id,
            booking_id=payload.booking_id,
            user_id=payload.user_id,
            channel=NotificationChannel.PUSH,
            type=BOOKING_REJECTED_TYPE,
            status=NotificationStatus.PENDING,
            to_email=None,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await self._repo.create(notification)

        try:
            message_ids = await self._push_sender.send(
                tokens=[d.token for d in devices],
                title="Booking rejected",
                body=body,
                data={
                    "type": BOOKING_REJECTED_TYPE,
                    "booking_id": str(payload.booking_id),
                },
            )
        except Exception:
            await self._repo.mark_failed(notification.id)
            raise

        await self._repo.mark_sent(notification.id, message_ids[0] if message_ids else "")
