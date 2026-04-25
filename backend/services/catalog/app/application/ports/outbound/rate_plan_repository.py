from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from app.domain.models import RatePlan


class RatePlanRepository(ABC):
    @abstractmethod
    async def get_by_id(self, rate_plan_id: UUID) -> RatePlan | None:
        """Return the rate plan by id, or None if missing."""

    @abstractmethod
    async def get_pricing(
        self,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> list[dict]:
        """Return one row per day in [checkin, checkout) for the given rate plan.

        Each row: ``{day, currency_code, price_amount, effective_price}``.
        ``effective_price`` is the lowest price after applying any active
        promotion overlapping that day; equals ``price_amount`` when no
        promotion applies.
        """
