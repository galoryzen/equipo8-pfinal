import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingConfirmedPayload

from app.application.ports.outbound.device_token_repository import DeviceTokenRepository
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.property_client import PropertyClient
from app.application.ports.outbound.push_sender import PushSender
from app.domain.models import (
    BOOKING_CONFIRMED_TYPE,
    Notification,
    NotificationChannel,
    NotificationStatus,
)

logger = logging.getLogger(__name__)


class SendBookingConfirmedPushUseCase:
    def __init__(
        self,
        repo: NotificationRepository,
        device_tokens: DeviceTokenRepository,
        properties: PropertyClient,
        push_sender: PushSender,
    ):
        self._repo = repo
        self._device_tokens = device_tokens
        self._properties = properties
        self._push_sender = push_sender

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        if await self._repo.exists_by_event_id_and_channel(envelope.event_id, NotificationChannel.PUSH):
            logger.info("duplicate push event_id skipped event_id=%s", envelope.event_id)
            return

        payload = BookingConfirmedPayload.model_validate(envelope.payload)
        devices = await self._device_tokens.list_active_by_user_id(payload.user_id)
        if not devices:
            logger.info(
                "no active device tokens for user_id=%s, skipping push event_id=%s",
                payload.user_id,
                envelope.event_id,
            )
            return

        prop = await self._properties.get_summary(payload.property_id)

        notification = Notification(
            id=uuid.uuid4(),
            event_id=envelope.event_id,
            booking_id=payload.booking_id,
            user_id=payload.user_id,
            channel=NotificationChannel.PUSH,
            type=BOOKING_CONFIRMED_TYPE,
            status=NotificationStatus.PENDING,
            to_email=None,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await self._repo.create(notification)

        try:
            message_ids = await self._push_sender.send(
                tokens=[d.token for d in devices],
                title="Booking confirmed",
                body=f"Your stay at {prop.name} is confirmed",
                data={
                    "type": BOOKING_CONFIRMED_TYPE,
                    "booking_id": str(payload.booking_id),
                },
            )
        except Exception:
            await self._repo.mark_failed(notification.id)
            raise

        # PushSender returns one ticket per token; persist the first as a representative id.
        await self._repo.mark_sent(notification.id, message_ids[0] if message_ids else "")
