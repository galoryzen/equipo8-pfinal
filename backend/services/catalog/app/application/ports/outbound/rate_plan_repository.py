from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from uuid import UUID

from app.domain.models import RatePlan


@dataclass(frozen=True)
class EffectiveCancellationPolicy:
    id: UUID
    name: str
    type: str  # FULL | PARTIAL | NON_REFUNDABLE
    hours_limit: int | None
    refund_percent: int | None


class RatePlanRepository(ABC):
    @abstractmethod
    async def get_by_id(self, rate_plan_id: UUID) -> RatePlan | None:
        """Return the rate plan by id, or None if missing."""

    @abstractmethod
    async def get_effective_cancellation_policy(
        self, rate_plan_id: UUID
    ) -> EffectiveCancellationPolicy | None:
        """Return the policy that actually applies to bookings on this rate plan.

        Resolution order: the rate plan's own ``cancellation_policy``, falling
        back to the parent property's ``default_cancellation_policy``. Returns
        ``None`` only when neither is configured.
        """

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
