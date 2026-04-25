from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from shared.pricing import compute_fees

from app.application.exceptions import (
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)
from app.application.ports.outbound.rate_plan_repository import RatePlanRepository
from app.schemas.rate_plan import NightPriceOut, RatePlanPricingOut

_CENT = Decimal("0.01")


def _q(amount: Decimal) -> Decimal:
    return amount.quantize(_CENT, rounding=ROUND_HALF_UP)


class GetRatePlanPricingUseCase:
    def __init__(self, repo: RatePlanRepository):
        self._repo = repo

    async def execute(
        self,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> RatePlanPricingOut:
        plan = await self._repo.get_by_id(rate_plan_id)
        if plan is None or not plan.is_active:
            raise RatePlanNotFoundError(rate_plan_id)

        rows = await self._repo.get_pricing(rate_plan_id, checkin, checkout)

        expected_days = []
        cursor = checkin
        while cursor < checkout:
            expected_days.append(cursor)
            cursor += timedelta(days=1)

        present_days = {row["day"] for row in rows}
        missing = [d for d in expected_days if d not in present_days]
        if missing:
            raise RateUnavailableError(missing)

        currencies = {row["currency_code"] for row in rows}
        if len(currencies) > 1:
            raise RateCurrencyMismatchError(sorted(currencies))

        currency_code = next(iter(currencies))

        nights: list[NightPriceOut] = []
        subtotal = Decimal("0")
        original_subtotal = Decimal("0")
        any_discount = False

        for row in sorted(rows, key=lambda r: r["day"]):
            effective = _q(Decimal(row["effective_price"]))
            original = _q(Decimal(row["price_amount"]))
            subtotal += effective
            original_subtotal += original
            has_discount = effective < original
            if has_discount:
                any_discount = True
            nights.append(
                NightPriceOut(
                    day=row["day"],
                    price=effective,
                    original_price=original if has_discount else None,
                )
            )

        subtotal_q = _q(subtotal)
        taxes, service_fee = compute_fees(subtotal_q)
        return RatePlanPricingOut(
            rate_plan_id=rate_plan_id,
            currency_code=currency_code,
            nights=nights,
            subtotal=subtotal_q,
            original_subtotal=_q(original_subtotal) if any_discount else None,
            taxes=taxes,
            service_fee=service_fee,
            total=subtotal_q + taxes + service_fee,
        )
