from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class NightPriceOut(BaseModel):
    day: date
    price: Decimal
    original_price: Decimal | None = None


class RatePlanPricingOut(BaseModel):
    rate_plan_id: UUID
    currency_code: str
    nights: list[NightPriceOut]
    subtotal: Decimal
    original_subtotal: Decimal | None = None
    taxes: Decimal
    service_fee: Decimal
    total: Decimal
