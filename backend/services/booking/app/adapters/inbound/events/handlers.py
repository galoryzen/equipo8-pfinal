import logging

from contracts.events.base import DomainEventEnvelope
from shared.events import DomainEventPublisher
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.booking_repository import SqlAlchemyBookingRepository
from app.application.use_cases.handle_payment_result import HandlePaymentResultUseCase

logger = logging.getLogger(__name__)


def make_payment_result_handler(
    session_factory: async_sessionmaker,
    events: DomainEventPublisher,
):
    async def handle(envelope: DomainEventEnvelope) -> None:
        async with session_factory() as session:
            try:
                repo = SqlAlchemyBookingRepository(session)
                use_case = HandlePaymentResultUseCase(repo, events)
                await use_case.execute(envelope)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return handle
