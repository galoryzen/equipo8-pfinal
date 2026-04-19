import logging
import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.application.exceptions import CatalogUnavailableError, ConflictingActiveCartError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import CartBookingOut, CreateCartBookingIn

_HOLD_MINUTES = 15
_DEFAULT_POLICY = CancellationPolicyType.FULL

logger = logging.getLogger(__name__)


class CreateCartBookingUseCase:
    def __init__(self, repo: BookingRepository, catalog: CatalogInventoryPort):
        self._repo = repo
        self._catalog = catalog

    async def execute(self, user_id: UUID, payload: CreateCartBookingIn) -> CartBookingOut:
        # Idempotency: same user/room/dates -> return existing cart without
        # decrementing Catalog again (avoids double-hold).
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

        # Reserve inventory first. If Catalog rejects (409 -> InventoryUnavailableError)
        # or fails (network -> CatalogUnavailableError), propagate and skip persistence.
        await self._catalog.create_hold(
            room_type_id=payload.room_type_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )

        nights = (payload.checkout - payload.checkin).days
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — columns are TIMESTAMP WITHOUT TIME ZONE
        total = payload.unit_price * nights

        booking = Booking(
            id=uuid.uuid4(),
            user_id=user_id,
            status=BookingStatus.CART,
            checkin=payload.checkin,
            checkout=payload.checkout,
            hold_expires_at=now + timedelta(minutes=_HOLD_MINUTES),
            total_amount=total,
            currency_code=payload.currency_code,
            property_id=payload.property_id,
            room_type_id=payload.room_type_id,
            rate_plan_id=payload.rate_plan_id,
            unit_price=payload.unit_price,
            policy_type_applied=_DEFAULT_POLICY,
            policy_hours_limit_applied=None,
            policy_refund_percent_applied=None,
            inventory_released=False,  # hold is live in Catalog; reconciler flips on release
            created_at=now,
            updated_at=now,
        )

        try:
            saved = await self._repo.create(booking)
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
    )
