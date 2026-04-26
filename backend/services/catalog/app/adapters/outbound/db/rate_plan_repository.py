from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, select
from sqlalchemy import func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.rate_plan_repository import (
    RatePlanRepository as RatePlanRepositoryPort,
)
from app.domain.models import DiscountType, Promotion, RateCalendar, RatePlan


class SqlAlchemyRatePlanRepository(RatePlanRepositoryPort):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, rate_plan_id: UUID) -> RatePlan | None:
        stmt = select(RatePlan).where(RatePlan.id == rate_plan_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pricing(
        self,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> list[dict]:
        # Same effective-price expression as property_repository search/featured
        # so cart prices match search results exactly.
        effective_price = case(
            (
                Promotion.discount_type == DiscountType.PERCENT,
                RateCalendar.price_amount * (Decimal("1") - Promotion.discount_value / Decimal("100")),
            ),
            (
                Promotion.discount_type == DiscountType.FIXED,
                sa_func.greatest(
                    RateCalendar.price_amount - Promotion.discount_value,
                    Decimal("0"),
                ),
            ),
            else_=RateCalendar.price_amount,
        )

        stmt = (
            select(
                RateCalendar.day.label("day"),
                RateCalendar.currency_code.label("currency_code"),
                RateCalendar.price_amount.label("price_amount"),
                sa_func.min(effective_price).label("effective_price"),
            )
            .outerjoin(
                Promotion,
                (Promotion.rate_plan_id == RateCalendar.rate_plan_id)
                & (Promotion.is_active == True)  # noqa: E712
                & (Promotion.start_date <= RateCalendar.day)
                & (Promotion.end_date >= RateCalendar.day),
            )
            .where(
                RateCalendar.rate_plan_id == rate_plan_id,
                RateCalendar.day >= checkin,
                RateCalendar.day < checkout,
            )
            .group_by(RateCalendar.day, RateCalendar.currency_code, RateCalendar.price_amount)
            .order_by(RateCalendar.day)
        )

        rows = (await self._session.execute(stmt)).all()
        return [
            {
                "day": row.day,
                "currency_code": row.currency_code,
                "price_amount": row.price_amount,
                "effective_price": row.effective_price,
            }
            for row in rows
        ]
