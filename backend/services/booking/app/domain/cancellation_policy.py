"""Pure cancellation policy rules (no I/O, no framework imports).

Interpretation (aligned with seeded catalog policies):
- FULL / PARTIAL: if ``policy_hours_limit_applied`` is set (>0), cancellation is
  permitted only while ``at`` is on or before the deadline
  ``start_of_checkin_day - hours_limit`` (naive UTC, same convention as booking rows).
- If the hours limit is missing or zero, no time-based restriction applies.
- NON_REFUNDABLE: self-service cancellation is not permitted (commercial non-waiver).

When cancellation is allowed, the evaluation also carries ``refund_percent`` —
the percentage of ``payment.authorized_amount`` the user is owed. Sourced from
``booking.policy_refund_percent_applied`` (captured at checkout).
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from app.domain.models import Booking, CancellationPolicyType


@dataclass(frozen=True)
class CancellationPolicyEvaluation:
    allowed: bool
    refund_percent: int  # 0–100; meaningful only when allowed=True


def evaluate_cancellation_policy(booking: Booking, *, at: datetime) -> CancellationPolicyEvaluation:
    """Return whether the booking's *applied* policy permits cancellation at ``at``."""
    ptype = booking.policy_type_applied
    if isinstance(ptype, str):
        ptype = CancellationPolicyType(ptype)

    if ptype == CancellationPolicyType.NON_REFUNDABLE:
        return CancellationPolicyEvaluation(allowed=False, refund_percent=0)

    hours = booking.policy_hours_limit_applied
    if hours is not None and hours > 0:
        checkin_start = datetime.combine(booking.checkin, time.min)
        deadline = checkin_start - timedelta(hours=hours)
        if at > deadline:
            return CancellationPolicyEvaluation(allowed=False, refund_percent=0)

    stored_percent = booking.policy_refund_percent_applied
    if stored_percent is None:
        # FULL implies 100% by convention; PARTIAL with a missing percent is a
        # data-invariant violation and must block (see CLAUDE.md / plan rationale).
        if ptype == CancellationPolicyType.FULL:
            return CancellationPolicyEvaluation(allowed=True, refund_percent=100)
        return CancellationPolicyEvaluation(allowed=False, refund_percent=0)

    return CancellationPolicyEvaluation(allowed=True, refund_percent=stored_percent)
