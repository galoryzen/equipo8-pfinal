import logging
import uuid
from datetime import UTC, datetime

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PaymentFailedPayload

from app.adapters.outbound.email.templates.payment_failed import (
    PaymentFailedContext,
    render_payment_failed,
)
from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.notification_repository import NotificationRepository
from app.application.ports.outbound.user_contact_client import UserContactClient
from app.domain.models import (
    Notification,
    NotificationChannel,
    NotificationStatus,
)

logger = logging.getLogger(__name__)


class SendPaymentFailedEmailUseCase:
    def __init__(
        self,
        repo: NotificationRepository,
        user_contacts: UserContactClient,
        email_sender: EmailSender,
    ):
        self._repo = repo
        self._user_contacts = user_contacts
        self._email_sender = email_sender

    async def execute(self, envelope: DomainEventEnvelope) -> None:
        if await self._repo.exists_by_event_id(envelope.event_id):
            logger.info("duplicate event_id skipped event_id=%s", envelope.event_id)
            return

        payload = PaymentFailedPayload.model_validate(envelope.payload)
        contact = await self._user_contacts.get_contact(payload.user_id)

        subject, text, html = render_payment_failed(
            PaymentFailedContext(
                full_name=contact.full_name,
                transaction_reference=str(payload.payment_intent_id),
                suggested_action="Reintentar u otro método de pago",
            )
        )

        notification = Notification(
            id=uuid.uuid4(),
            event_id=envelope.event_id,
            booking_id=payload.booking_id,
            user_id=payload.user_id,
            channel=NotificationChannel.EMAIL,
            type="PAYMENT_FAILED",
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
