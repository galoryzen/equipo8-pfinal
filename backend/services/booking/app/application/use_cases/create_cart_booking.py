import logging
import uuid
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from shared.pricing import compute_fees

from app.application.exceptions import (
    CatalogUnavailableError,
    ConflictingActiveCartError,
    RateCurrencyMismatchError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.ports.outbound.catalog_pricing_port import (
    CatalogPricingPort,
    PricingResult,
)
from app.domain.models import Booking, BookingStatus, CancellationPolicyType, new_status_history_row
from app.schemas.booking import CartBookingOut, CreateCartBookingIn, NightPriceOut

_HOLD_MINUTES = 15
_DEFAULT_POLICY = CancellationPolicyType.FULL
_CENT = Decimal("0.01")

logger = logging.getLogger(__name__)


def _q(amount: Decimal) -> Decimal:
    return amount.quantize(_CENT, rounding=ROUND_HALF_UP)


class CreateCartBookingUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        catalog: CatalogInventoryPort,
        pricing: CatalogPricingPort,
    ):
        self._repo = repo
        self._catalog = catalog
        self._pricing = pricing

    async def execute(self, user_id: UUID, payload: CreateCartBookingIn) -> CartBookingOut:
        # Idempotency: same user/room/dates -> return existing cart without
        # decrementing Catalog again (avoids double-hold and double-pricing).
        existing = await self._repo.find_active_cart(
            user_id=user_id,
            room_type_id=payload.room_type_id,
            rate_plan_id=payload.rate_plan_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )
        if existing is not None:
            return _to_cart_out(existing)

        # One-cart-at-a-time rule: if the user has a cart on a DIFFERENT selection
        # that's still alive, block creation. Client should surface a conflict
        # dialog offering to cancel the existing one or resume it.
        other_active = await self._repo.find_any_active_cart_for_user(user_id)
        if other_active is not None:
            raise ConflictingActiveCartError(other_active.id)

        # Fetch authoritative pricing from Catalog BEFORE reserving inventory.
        # If pricing fails (404/409/422/network), we exit without holding any
        # inventory — important so a price failure costs zero hold churn.
        pricing_result: PricingResult = await self._pricing.get_pricing(
            rate_plan_id=payload.rate_plan_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )

        # Client-declared currency must match the rate plan's actual currency
        # so the user can't be quoted in one currency and charged in another.
        if payload.currency_code != pricing_result.currency_code:
            raise RateCurrencyMismatchError(
                f"Client requested {payload.currency_code} but rate plan is "
                f"in {pricing_result.currency_code}"
            )

        # Reserve inventory after pricing succeeds. If Catalog rejects
        # (409 -> InventoryUnavailableError) or fails (network ->
        # CatalogUnavailableError), propagate and skip persistence.
        await self._catalog.create_hold(
            room_type_id=payload.room_type_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )

        nights = (payload.checkout - payload.checkin).days
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — columns are TIMESTAMP WITHOUT TIME ZONE
        total = _q(pricing_result.subtotal)
        # Average nightly rate, kept on the booking row for legacy list/detail
        # consumers that read unit_price directly. The breakdown is the source of truth.
        avg_unit_price = _q(total / Decimal(nights)) if nights > 0 else total
        # Standardised additional charges from shared.pricing — same constants
        # the catalog used to advertise the price, so cart total matches what
        # the user saw on search/detail.
        taxes, service_fee = compute_fees(total)

        nightly_breakdown_json = [
            {
                "day": night.day.isoformat(),
                "price": str(_q(night.price)),
                "original_price": str(_q(night.original_price)) if night.original_price is not None else None,
            }
            for night in pricing_result.nights
        ]

        booking = Booking(
            id=uuid.uuid4(),
            user_id=user_id,
            status=BookingStatus.CART,
            checkin=payload.checkin,
            checkout=payload.checkout,
            hold_expires_at=now + timedelta(minutes=_HOLD_MINUTES),
            total_amount=total,
            currency_code=pricing_result.currency_code,
            property_id=payload.property_id,
            room_type_id=payload.room_type_id,
            rate_plan_id=payload.rate_plan_id,
            unit_price=avg_unit_price,
            policy_type_applied=_DEFAULT_POLICY,
            policy_hours_limit_applied=None,
            policy_refund_percent_applied=None,
            inventory_released=False,  # hold is live in Catalog; reconciler flips on release
            guests_count=payload.guests_count,
            nightly_breakdown=nightly_breakdown_json,
            taxes=taxes,
            service_fee=service_fee,
            created_at=now,
            updated_at=now,
        )

        try:
            saved = await self._repo.create(booking)
            await self._repo.add_status_history(
                new_status_history_row(
                    saved.id,
                    from_status=None,
                    to_status=BookingStatus.CART,
                    reason="cart_created",
                    changed_by=user_id,
                )
            )
        except Exception:
            # Persistence failed after Catalog decrement. Best-effort rollback of the hold
            # so a single unit is not orphaned. The reconciler cannot help here because no
            # booking row exists to track the hold — if this release also fails, log loud
            # for manual audit (tracked as deferred risk in the plan).
            try:
                await self._catalog.release_hold(
                    room_type_id=payload.room_type_id,
                    checkin=payload.checkin,
                    checkout=payload.checkout,
                )
            except CatalogUnavailableError:
                logger.exception(
                    "Orphan inventory hold: booking insert failed AND release_hold failed "
                    "for room_type=%s dates=%s..%s — manual reconciliation required",
                    payload.room_type_id,
                    payload.checkin,
                    payload.checkout,
                )
            raise
        return _to_cart_out(saved)


def _nights_breakdown_from_booking(booking: Booking) -> list[NightPriceOut]:
    raw = booking.nightly_breakdown
    if not raw:
        return []
    out: list[NightPriceOut] = []
    for entry in raw:
        original_raw = entry.get("original_price")
        out.append(
            NightPriceOut(
                day=entry["day"],
                price=Decimal(entry["price"]),
                original_price=Decimal(original_raw) if original_raw is not None else None,
            )
        )
    return out


def _to_cart_out(booking: Booking) -> CartBookingOut:
    return CartBookingOut(
        id=booking.id,
        status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
        guests_count=booking.guests_count,
        nights_breakdown=_nights_breakdown_from_booking(booking),
        taxes=booking.taxes,
        service_fee=booking.service_fee,
        grand_total=booking.total_amount + booking.taxes + booking.service_fee,
    )
