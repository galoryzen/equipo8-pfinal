from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, select
from sqlalchemy import func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.rate_plan_repository import (
    EffectiveCancellationPolicy,
)
from app.application.ports.outbound.rate_plan_repository import (
    RatePlanRepository as RatePlanRepositoryPort,
)
from app.domain.models import (
    CancellationPolicy,
    DiscountType,
    Promotion,
    Property,
    RateCalendar,
    RatePlan,
    RoomType,
)


class SqlAlchemyRatePlanRepository(RatePlanRepositoryPort):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, rate_plan_id: UUID) -> RatePlan | None:
        stmt = select(RatePlan).where(RatePlan.id == rate_plan_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_effective_cancellation_policy(
        self, rate_plan_id: UUID
    ) -> EffectiveCancellationPolicy | None:
        # Prefer the policy directly attached to the rate plan.
        rp_stmt = (
            select(CancellationPolicy)
            .join(RatePlan, RatePlan.cancellation_policy_id == CancellationPolicy.id)
            .where(RatePlan.id == rate_plan_id)
        )
        policy = (await self._session.execute(rp_stmt)).scalar_one_or_none()
        if policy is None:
            # Fall back to the property's default policy.
            prop_stmt = (
                select(CancellationPolicy)
                .join(Property, Property.default_cancellation_policy_id == CancellationPolicy.id)
                .join(RoomType, RoomType.property_id == Property.id)
                .join(RatePlan, RatePlan.room_type_id == RoomType.id)
                .where(RatePlan.id == rate_plan_id)
            )
            policy = (await self._session.execute(prop_stmt)).scalar_one_or_none()
        if policy is None:
            return None
        ptype = policy.type.value if hasattr(policy.type, "value") else str(policy.type)
        return EffectiveCancellationPolicy(
            id=policy.id,
            name=policy.name,
            type=ptype,
            hours_limit=policy.hours_limit,
            refund_percent=policy.refund_percent,
        )

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
