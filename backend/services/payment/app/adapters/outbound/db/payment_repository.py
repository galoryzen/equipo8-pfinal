from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.models import Payment, PaymentAttempt, PaymentIntent, PaymentIntentStatus


class SqlAlchemyPaymentRepository(PaymentRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_intent_by_id(self, intent_id: UUID) -> PaymentIntent | None:
        result = await self._session.execute(select(PaymentIntent).where(PaymentIntent.id == intent_id))
        return result.scalars().one_or_none()

    async def get_intent_by_start_idempotency_key(self, key: str) -> PaymentIntent | None:
        result = await self._session.execute(
            select(PaymentIntent).where(PaymentIntent.start_idempotency_key == key)
        )
        return result.scalars().one_or_none()

    async def add_intent(self, intent: PaymentIntent) -> PaymentIntent:
        self._session.add(intent)
        await self._session.commit()
        await self._session.refresh(intent)
        return intent

    async def persist_failure(self, intent: PaymentIntent, attempt: PaymentAttempt) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        intent.status = PaymentIntentStatus.FAILED
        intent.updated_at = now
        self._session.add(attempt)
        await self._session.commit()

    async def persist_success(self, intent: PaymentIntent, charge: Payment) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(charge)
        await self._session.flush()
        intent.payment_id = charge.id
        intent.status = PaymentIntentStatus.SUCCEEDED
        intent.updated_at = now
        await self._session.commit()
