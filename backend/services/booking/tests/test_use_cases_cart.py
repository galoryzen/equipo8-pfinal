"""Unit tests for CreateCartBookingUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, call
from uuid import UUID

import pytest

from app.application.exceptions import (
    CatalogUnavailableError,
    ConflictingActiveCartError,
    InventoryUnavailableError,
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.ports.outbound.catalog_pricing_port import (
    CatalogPricingPort,
    NightPrice,
    PricingResult,
)
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import CreateCartBookingIn

PROPERTY_ID = UUID("30000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")
RATE_PLAN_ID = UUID("70000000-0000-0000-0000-000000000001")
USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
CHECKIN = date(2026, 6, 1)
CHECKOUT = date(2026, 6, 4)  # 3 nights


def _cart_booking(guests_count: int = 1) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=BookingStatus.CART,
        checkin=CHECKIN,
        checkout=CHECKOUT,
        hold_expires_at=datetime(2026, 4, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        inventory_released=False,
        guests_count=guests_count,
        nightly_breakdown=None,
        taxes=Decimal("30.00"),
        service_fee=Decimal("15.00"),
        created_at=now,
        updated_at=now,
    )


def _payload(guests_count: int = 1, currency_code: str = "USD") -> CreateCartBookingIn:
    return CreateCartBookingIn(
        checkin=CHECKIN,
        checkout=CHECKOUT,
        currency_code=currency_code,
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        guests_count=guests_count,
    )


def _catalog_mock() -> AsyncMock:
    return AsyncMock(spec=CatalogInventoryPort)


def _pricing_result(
    nightly_prices: list[Decimal],
    currency_code: str = "USD",
    start: date = CHECKIN,
) -> PricingResult:
    nights = [NightPrice(day=date.fromordinal(start.toordinal() + i), price=p) for i, p in enumerate(nightly_prices)]
    subtotal = sum(nightly_prices, Decimal("0"))
    return PricingResult(
        rate_plan_id=RATE_PLAN_ID,
        currency_code=currency_code,
        nights=nights,
        subtotal=subtotal,
    )


def _pricing_mock(result: PricingResult | None = None) -> AsyncMock:
    mock = AsyncMock(spec=CatalogPricingPort)
    mock.get_pricing.return_value = result if result is not None else _pricing_result(
        [Decimal("100.00"), Decimal("100.00"), Decimal("100.00")]
    )
    return mock


@pytest.mark.asyncio
class TestCreateCartBookingUseCase:
    async def test_creates_new_cart_when_none_exists(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.return_value = _cart_booking()
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        repo.find_active_cart.assert_awaited_once()
        pricing.get_pricing.assert_awaited_once_with(
            rate_plan_id=RATE_PLAN_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )
        catalog.create_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )
        repo.create.assert_awaited_once()
        assert out.status == "CART"
        assert out.id == BOOKING_ID

    async def test_returns_existing_cart_idempotently_without_calling_catalog(self):
        existing = _cart_booking()
        repo = AsyncMock()
        repo.find_active_cart.return_value = existing
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_not_awaited()
        pricing.get_pricing.assert_not_awaited()
        repo.create.assert_not_awaited()
        assert out.id == existing.id

    async def test_new_booking_starts_inventory_released_false(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        await uc.execute(user_id=USER_ID, payload=_payload())

        assert captured[0].inventory_released is False

    async def test_total_calculated_from_per_night_pricing_breakdown(self):
        """Total = sum of per-night prices, NOT unit_price × nights."""
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        # 3 nights at $100, $150, $100 — variable pricing.
        pricing = _pricing_mock(
            _pricing_result([Decimal("100.00"), Decimal("150.00"), Decimal("100.00")])
        )

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        await uc.execute(user_id=USER_ID, payload=_payload())

        assert captured[0].total_amount == Decimal("350.00")
        # unit_price is the average (350 / 3 = 116.67), kept for legacy consumers.
        assert captured[0].unit_price == Decimal("116.67")
        # nightly_breakdown captures the source-of-truth per-night data.
        assert captured[0].nightly_breakdown == [
            {"day": "2026-06-01", "price": "100.00", "original_price": None},
            {"day": "2026-06-02", "price": "150.00", "original_price": None},
            {"day": "2026-06-03", "price": "100.00", "original_price": None},
        ]

    async def test_currency_code_from_pricing_overrides_client_when_matching(self):
        """The persisted currency comes from the authoritative pricing response."""
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        pricing = _pricing_mock(
            _pricing_result([Decimal("100.00"), Decimal("100.00"), Decimal("100.00")], currency_code="USD")
        )

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        await uc.execute(user_id=USER_ID, payload=_payload(currency_code="USD"))

        assert captured[0].currency_code == "USD"

    async def test_currency_mismatch_raises_and_skips_hold(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        pricing = _pricing_mock(
            _pricing_result([Decimal("100.00"), Decimal("100.00"), Decimal("100.00")], currency_code="USD")
        )

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        with pytest.raises(RateCurrencyMismatchError):
            await uc.execute(user_id=USER_ID, payload=_payload(currency_code="EUR"))

        catalog.create_hold.assert_not_awaited()
        repo.create.assert_not_awaited()

    async def test_rate_unavailable_propagates_and_skips_hold(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        pricing = _pricing_mock()
        pricing.get_pricing.side_effect = RateUnavailableError("gap")

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        with pytest.raises(RateUnavailableError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_not_awaited()
        repo.create.assert_not_awaited()

    async def test_rate_plan_not_found_propagates_and_skips_hold(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        pricing = _pricing_mock()
        pricing.get_pricing.side_effect = RatePlanNotFoundError("missing")

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        with pytest.raises(RatePlanNotFoundError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_not_awaited()
        repo.create.assert_not_awaited()

    async def test_pricing_called_before_create_hold(self):
        """Order matters: a price failure must cost zero inventory churn."""
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.return_value = _cart_booking()
        order: list[str] = []
        catalog = _catalog_mock()
        catalog.create_hold.side_effect = lambda **_: order.append("hold")
        pricing = _pricing_mock()

        async def record_pricing(**_):
            order.append("price")
            return _pricing_result([Decimal("100.00"), Decimal("100.00"), Decimal("100.00")])

        pricing.get_pricing.side_effect = record_pricing

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        await uc.execute(user_id=USER_ID, payload=_payload())

        assert order == ["price", "hold"]

    async def test_rejects_when_user_has_other_active_cart(self):
        """User can only have one active cart at a time, regardless of the room/dates."""
        other = _cart_booking()
        repo = AsyncMock()
        # No exact match (different combination) but user HAS another active cart.
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = other
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)

        with pytest.raises(ConflictingActiveCartError) as exc_info:
            await uc.execute(user_id=USER_ID, payload=_payload())

        assert exc_info.value.existing_booking_id == other.id
        catalog.create_hold.assert_not_awaited()
        pricing.get_pricing.assert_not_awaited()
        repo.create.assert_not_awaited()

    async def test_inventory_unavailable_propagates_and_skips_persistence(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        catalog.create_hold.side_effect = InventoryUnavailableError()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)

        with pytest.raises(InventoryUnavailableError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        repo.create.assert_not_awaited()

    async def test_catalog_unavailable_propagates_and_skips_persistence(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        catalog = _catalog_mock()
        catalog.create_hold.side_effect = CatalogUnavailableError("network")
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)

        with pytest.raises(CatalogUnavailableError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        repo.create.assert_not_awaited()

    async def test_persistence_failure_triggers_best_effort_release(self):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = RuntimeError("db down")
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        with pytest.raises(RuntimeError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        catalog.create_hold.assert_awaited_once()
        catalog.release_hold.assert_awaited_once_with(
            room_type_id=ROOM_TYPE_ID,
            checkin=CHECKIN,
            checkout=CHECKOUT,
        )

    async def test_persists_guests_count_from_payload(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        out = await uc.execute(user_id=USER_ID, payload=_payload(guests_count=3))

        assert captured[0].guests_count == 3
        assert out.guests_count == 3

    async def test_guests_count_defaults_to_one_when_omitted(self):
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        await uc.execute(user_id=USER_ID, payload=_payload())

        assert captured[0].guests_count == 1

    async def test_persistence_and_rollback_failure_still_propagates_original(self, caplog):
        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = RuntimeError("db down")
        catalog = _catalog_mock()
        catalog.release_hold.side_effect = CatalogUnavailableError("also down")
        pricing = _pricing_mock()

        uc = CreateCartBookingUseCase(repo, catalog, pricing)

        with pytest.raises(RuntimeError):
            await uc.execute(user_id=USER_ID, payload=_payload())

        # The loud log for orphan inventory is emitted; caller still sees the db error.
        assert any("Orphan inventory hold" in r.message for r in caplog.records)

    async def test_persists_taxes_and_service_fee_from_subtotal(self):
        """Standardised fees: 10% tax + 5% service fee on the cart subtotal.

        Computed from shared.pricing constants so search/detail/cart all show
        the same total. Persisted on the booking row so payment, refunds and
        receipts read the same numbers.
        """
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        # 3 nights at $100, $150, $100 → subtotal $350.
        pricing = _pricing_mock(
            _pricing_result([Decimal("100.00"), Decimal("150.00"), Decimal("100.00")])
        )

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        # 10% × 350 = 35.00 ; 5% × 350 = 17.50.
        assert captured[0].taxes == Decimal("35.00")
        assert captured[0].service_fee == Decimal("17.50")
        # Response carries the same values plus the grand total for clients.
        assert out.taxes == Decimal("35.00")
        assert out.service_fee == Decimal("17.50")
        assert out.grand_total == Decimal("402.50")  # 350 + 35 + 17.50

    async def test_cart_out_includes_nights_breakdown(self):
        """The response surface exposes the per-night breakdown for the client."""
        captured: list[Booking] = []

        async def fake_create(b: Booking) -> Booking:
            captured.append(b)
            return b

        repo = AsyncMock()
        repo.find_active_cart.return_value = None
        repo.find_any_active_cart_for_user.return_value = None
        repo.create.side_effect = fake_create
        catalog = _catalog_mock()
        pricing = _pricing_mock(
            _pricing_result([Decimal("100.00"), Decimal("150.00"), Decimal("100.00")])
        )

        uc = CreateCartBookingUseCase(repo, catalog, pricing)
        out = await uc.execute(user_id=USER_ID, payload=_payload())

        assert len(out.nights_breakdown) == 3
        assert out.nights_breakdown[1].day == date(2026, 6, 2)
        assert out.nights_breakdown[1].price == Decimal("150.00")
