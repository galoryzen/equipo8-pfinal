"""Pure cancellation policy rules (no I/O, no framework imports).

Interpretation (aligned with seeded catalog policies):
- FULL / PARTIAL: if ``policy_hours_limit_applied`` is set (>0), cancellation is
  permitted only while ``at`` is on or before the deadline
  ``start_of_checkin_day - hours_limit`` (naive UTC, same convention as booking rows).
- If the hours limit is missing or zero, no time-based restriction applies.
- NON_REFUNDABLE: self-service cancellation is not permitted (commercial non-waiver).
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from app.domain.models import Booking, CancellationPolicyType


@dataclass(frozen=True)
class CancellationPolicyEvaluation:
    allowed: bool


def evaluate_cancellation_policy(booking: Booking, *, at: datetime) -> CancellationPolicyEvaluation:
    """Return whether the booking's *applied* policy permits cancellation at ``at``."""
    ptype = booking.policy_type_applied
    if isinstance(ptype, str):
        ptype = CancellationPolicyType(ptype)

    if ptype == CancellationPolicyType.NON_REFUNDABLE:
        return CancellationPolicyEvaluation(allowed=False)

    hours = booking.policy_hours_limit_applied
    if hours is None or hours <= 0:
        return CancellationPolicyEvaluation(allowed=True)

    checkin_start = datetime.combine(booking.checkin, time.min)
    deadline = checkin_start - timedelta(hours=hours)
    return CancellationPolicyEvaluation(allowed=at <= deadline)
