import logging

from contracts.events.base import DomainEventEnvelope
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.notification_repository import SqlAlchemyNotificationRepository
from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.property_client import PropertyClient
from app.application.ports.outbound.user_contact_client import UserContactClient

from app.application.use_cases.send_booking_confirmation import (
    SendBookingConfirmationEmailUseCase,
)
from app.application.use_cases.send_payment_failed import (
    SendPaymentFailedEmailUseCase,
)
def make_payment_failed_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    email_sender: EmailSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyNotificationRepository(session)
                use_case = SendPaymentFailedEmailUseCase(
                    repo, user_contacts, email_sender
                )
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle

logger = logging.getLogger(__name__)


def make_booking_confirmed_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    properties: PropertyClient,
    email_sender: EmailSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyNotificationRepository(session)
                use_case = SendBookingConfirmationEmailUseCase(
                    repo, user_contacts, properties, email_sender
                )
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle
