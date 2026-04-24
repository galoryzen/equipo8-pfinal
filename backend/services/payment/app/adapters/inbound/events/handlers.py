import logging

from contracts.events.base import DomainEventEnvelope
from shared.events import DomainEventPublisher
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.payment_repository import SqlAlchemyPaymentRepository
from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.use_cases.process_payment_requested import ProcessPaymentRequestedUseCase
from app.application.use_cases.refund_on_booking_rejected import RefundOnBookingRejectedUseCase

logger = logging.getLogger(__name__)


def make_payment_requested_handler(
    session_factory: async_sessionmaker,
    events: DomainEventPublisher,
    payment_gateway: PaymentGatewayPort,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyPaymentRepository(session)
                use_case = ProcessPaymentRequestedUseCase(repo, events, payment_gateway)
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle


def make_booking_rejected_handler(
    session_factory: async_sessionmaker,
    payment_gateway: PaymentGatewayPort,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyPaymentRepository(session)
                use_case = RefundOnBookingRejectedUseCase(repo, payment_gateway)
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle
