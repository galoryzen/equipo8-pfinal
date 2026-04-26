from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class NightPrice:
    day: date
    price: Decimal
    original_price: Decimal | None = None


@dataclass(frozen=True)
class PricingResult:
    rate_plan_id: UUID
    currency_code: str
    nights: list[NightPrice]
    subtotal: Decimal
    original_subtotal: Decimal | None = None


class CatalogPricingPort(ABC):
    """Read authoritative per-night pricing from Catalog for a rate plan + date range."""

    @abstractmethod
    async def get_pricing(
        self,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> PricingResult:
        """Return per-night pricing with promotions applied.

        Raises:
            RatePlanNotFoundError: rate plan unknown or inactive (Catalog 404).
            RateUnavailableError: one or more days have no rate_calendar entry (Catalog 409).
            RateCurrencyMismatchError: calendar rows mix currencies in the range (Catalog 422).
            CatalogUnavailableError: network or 5xx error.
        """
