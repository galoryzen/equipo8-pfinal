"""Shared pricing helpers used by catalog and booking services.

Tax and service-fee rates live here so the price the user is shown on the
property/search pages, the cart total, and the booking detail all derive from
the same constants. Updating a rate here updates every surface at once.
"""

from decimal import ROUND_HALF_UP, Decimal

TAX_RATE = Decimal("0.10")
SERVICE_FEE_RATE = Decimal("0.05")
_CENT = Decimal("0.01")


def compute_fees(subtotal: Decimal) -> tuple[Decimal, Decimal]:
    """Return ``(taxes, service_fee)`` for a stay subtotal, both rounded to cents.

    Both fees are a percentage of ``subtotal``. Quantizing each independently
    before the caller sums avoids drift when callers also persist the values
    separately (taxes column + service_fee column on Booking).
    """
    taxes = (subtotal * TAX_RATE).quantize(_CENT, rounding=ROUND_HALF_UP)
    service_fee = (subtotal * SERVICE_FEE_RATE).quantize(_CENT, rounding=ROUND_HALF_UP)
    return taxes, service_fee
