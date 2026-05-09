import logging

from contracts.events.base import DomainEventEnvelope
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.device_token_repository import SqlAlchemyDeviceTokenRepository
from app.adapters.outbound.db.notification_repository import SqlAlchemyNotificationRepository
from app.application.ports.outbound.email_sender import EmailSender
from app.application.ports.outbound.property_client import PropertyClient
from app.application.ports.outbound.push_sender import PushSender
from app.application.ports.outbound.user_contact_client import UserContactClient
from app.application.use_cases.send_booking_confirmation import (
    SendBookingConfirmationEmailUseCase,
)
from app.application.use_cases.send_booking_confirmed_push import (
    SendBookingConfirmedPushUseCase,
)
from app.application.use_cases.send_booking_rejected import (
    SendBookingRejectedEmailUseCase,
)
from app.application.use_cases.send_booking_rejected_push import (
    SendBookingRejectedPushUseCase,
)
from app.application.use_cases.send_payment_failed import (
    SendPaymentFailedEmailUseCase,
)
from app.application.use_cases.send_payment_succeeded import (
    SendPaymentSucceededEmailUseCase,
)

logger = logging.getLogger(__name__)


async def _run_in_session(session_factory: async_sessionmaker, action) -> None:
    async with session_factory() as session:
        try:
            await action(session)
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def make_booking_confirmed_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    properties: PropertyClient,
    email_sender: EmailSender,
    push_sender: PushSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async def _send_email(session):
            repo = SqlAlchemyNotificationRepository(session)
            use_case = SendBookingConfirmationEmailUseCase(repo, user_contacts, properties, email_sender)
            await use_case.execute(envelope)

        async def _send_push(session):
            repo = SqlAlchemyNotificationRepository(session)
            device_tokens = SqlAlchemyDeviceTokenRepository(session)
            use_case = SendBookingConfirmedPushUseCase(repo, device_tokens, properties, push_sender)
            await use_case.execute(envelope)

        await _run_in_session(session_factory, _send_email)
        # Push runs in its own session/transaction so a push failure does not
        # invalidate the email send. Best-effort: log and swallow non-fatal errors.
        try:
            await _run_in_session(session_factory, _send_push)
        except Exception:
            logger.exception("booking-confirmed push failed event_id=%s", envelope.event_id)

    return handle


def make_booking_rejected_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    email_sender: EmailSender,
    push_sender: PushSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async def _send_email(session):
            repo = SqlAlchemyNotificationRepository(session)
            use_case = SendBookingRejectedEmailUseCase(repo, user_contacts, email_sender)
            await use_case.execute(envelope)

        async def _send_push(session):
            repo = SqlAlchemyNotificationRepository(session)
            device_tokens = SqlAlchemyDeviceTokenRepository(session)
            use_case = SendBookingRejectedPushUseCase(repo, device_tokens, push_sender)
            await use_case.execute(envelope)

        await _run_in_session(session_factory, _send_email)
        try:
            await _run_in_session(session_factory, _send_push)
        except Exception:
            logger.exception("booking-rejected push failed event_id=%s", envelope.event_id)

    return handle


def make_payment_failed_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    email_sender: EmailSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyNotificationRepository(session)
                use_case = SendPaymentFailedEmailUseCase(repo, user_contacts, email_sender)
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle


def make_payment_succeeded_handler(
    session_factory: async_sessionmaker,
    user_contacts: UserContactClient,
    email_sender: EmailSender,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyNotificationRepository(session)
                use_case = SendPaymentSucceededEmailUseCase(repo, user_contacts, email_sender)
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle
