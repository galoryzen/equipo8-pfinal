import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BookingConfirmedPayload

from app.adapters.outbound.email.templates.booking_confirmed import (
    BookingConfirmedContext,
    render_booking_confirmed,
)
from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.property_client import PropertyClient
from app.application.ports.outbound.user_contact_client import UserContactClient
from app.domain.models import (
    BOOKING_CONFIRMED_TYPE,
    Notification,
    NotificationChannel,
    NotificationStatus,
)

logger = logging.getLogger(__name__)


class SendBookingConfirmationEmailUseCase:
    def __init__(
        self,
        repo: NotificationRepository,
        user_contacts: UserContactClient,
        properties: PropertyClient,
        email_sender: EmailSender,
    ):
        self._repo = repo
        self._user_contacts = user_contacts
        self._properties = properties
        self._email_sender = email_sender

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        if await self._repo.exists_by_event_id(envelope.event_id):
            logger.info("duplicate event_id skipped event_id=%s", envelope.event_id)
            return

        payload = BookingConfirmedPayload.model_validate(envelope.payload)
        contact = await self._user_contacts.get_contact(payload.user_id)
        prop = await self._properties.get_summary(payload.property_id)

        subject, text, html = render_booking_confirmed(
            BookingConfirmedContext(
                full_name=contact.full_name,
                property_name=prop.name,
                city_name=prop.city_name,
                country=prop.country,
                checkin=payload.checkin,
                checkout=payload.checkout,
                guests_count=payload.guests_count,
                total_amount=payload.total_amount,
                currency_code=payload.currency_code,
                property_image_url=prop.image_url,
            )
        )

        notification = Notification(
            id=uuid.uuid4(),
            event_id=envelope.event_id,
            booking_id=payload.booking_id,
            user_id=payload.user_id,
            channel=NotificationChannel.EMAIL,
            type=BOOKING_CONFIRMED_TYPE,
            status=NotificationStatus.PENDING,
            to_email=contact.email,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await self._repo.create(notification)

        try:
            message_id = await self._email_sender.send(
                to=contact.email, subject=subject, html=html, text=text
            )
        except Exception:
            await self._repo.mark_failed(notification.id)
            raise

        await self._repo.mark_sent(notification.id, message_id)
