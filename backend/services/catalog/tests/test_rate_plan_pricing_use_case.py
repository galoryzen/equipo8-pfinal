"""Unit tests for GetRatePlanPricingUseCase — mock the port, test the orchestration."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.application.exceptions import (
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)
from app.application.ports.outbound.rate_plan_repository import RatePlanRepository
from app.application.use_cases.get_rate_plan_pricing import GetRatePlanPricingUseCase


@pytest.fixture
def mock_rate_plan_repo():
    return AsyncMock(spec=RatePlanRepository)


def _row(day: date, price: Decimal, *, effective: Decimal | None = None, currency: str = "USD") -> dict:
    return {
        "day": day,
        "currency_code": currency,
        "price_amount": price,
        "effective_price": effective if effective is not None else price,
    }


def _active_plan() -> MagicMock:
    plan = MagicMock()
    plan.id = uuid4()
    plan.is_active = True
    return plan


class TestGetRatePlanPricingUseCase:
    async def test_happy_path_two_nights_no_promotion(self, mock_rate_plan_repo):
        rate_plan_id = uuid4()
        mock_rate_plan_repo.get_by_id.return_value = _active_plan()
        mock_rate_plan_repo.get_pricing.return_value = [
            _row(date(2026, 5, 1), Decimal("140.00")),
            _row(date(2026, 5, 2), Decimal("150.00")),
        ]

        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        result = await uc.execute(
            rate_plan_id=rate_plan_id,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 3),
        )

        assert result.subtotal == Decimal("290.00")
        assert result.original_subtotal is None  # no discount
        assert result.currency_code == "USD"
        assert len(result.nights) == 2
        assert result.nights[0].day == date(2026, 5, 1)
        assert result.nights[0].price == Decimal("140.00")
        assert result.nights[0].original_price is None
        assert result.nights[1].price == Decimal("150.00")
        # Standardised fees: 10% tax + 5% service fee on subtotal.
        assert result.taxes == Decimal("29.00")
        assert result.service_fee == Decimal("14.50")
        assert result.total == Decimal("333.50")

    async def test_promotion_exposes_original_per_night(self, mock_rate_plan_repo):
        rate_plan_id = uuid4()
        mock_rate_plan_repo.get_by_id.return_value = _active_plan()
        mock_rate_plan_repo.get_pricing.return_value = [
            _row(date(2026, 5, 1), Decimal("100.00"), effective=Decimal("85.00")),
            _row(date(2026, 5, 2), Decimal("100.00"), effective=Decimal("85.00")),
        ]

        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        result = await uc.execute(
            rate_plan_id=rate_plan_id,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 3),
        )

        assert result.subtotal == Decimal("170.00")
        assert result.original_subtotal == Decimal("200.00")
        assert result.nights[0].price == Decimal("85.00")
        assert result.nights[0].original_price == Decimal("100.00")

    async def test_calendar_gap_raises_rate_unavailable(self, mock_rate_plan_repo):
        rate_plan_id = uuid4()
        mock_rate_plan_repo.get_by_id.return_value = _active_plan()
        # Day 2026-05-02 is missing — booking spans 3 nights but only 2 are priced.
        mock_rate_plan_repo.get_pricing.return_value = [
            _row(date(2026, 5, 1), Decimal("100.00")),
            _row(date(2026, 5, 3), Decimal("100.00")),
        ]

        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        with pytest.raises(RateUnavailableError) as exc:
            await uc.execute(
                rate_plan_id=rate_plan_id,
                checkin=date(2026, 5, 1),
                checkout=date(2026, 5, 4),
            )

        assert exc.value.missing_days == [date(2026, 5, 2)]

    async def test_multi_currency_raises_currency_mismatch(self, mock_rate_plan_repo):
        rate_plan_id = uuid4()
        mock_rate_plan_repo.get_by_id.return_value = _active_plan()
        mock_rate_plan_repo.get_pricing.return_value = [
            _row(date(2026, 5, 1), Decimal("100.00"), currency="USD"),
            _row(date(2026, 5, 2), Decimal("100.00"), currency="EUR"),
        ]

        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        with pytest.raises(RateCurrencyMismatchError) as exc:
            await uc.execute(
                rate_plan_id=rate_plan_id,
                checkin=date(2026, 5, 1),
                checkout=date(2026, 5, 3),
            )

        assert exc.value.currencies == ["EUR", "USD"]

    async def test_unknown_rate_plan_raises_not_found(self, mock_rate_plan_repo):
        mock_rate_plan_repo.get_by_id.return_value = None
        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        with pytest.raises(RatePlanNotFoundError):
            await uc.execute(
                rate_plan_id=uuid4(),
                checkin=date(2026, 5, 1),
                checkout=date(2026, 5, 2),
            )

    async def test_inactive_rate_plan_raises_not_found(self, mock_rate_plan_repo):
        plan = _active_plan()
        plan.is_active = False
        mock_rate_plan_repo.get_by_id.return_value = plan
        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        with pytest.raises(RatePlanNotFoundError):
            await uc.execute(
                rate_plan_id=uuid4(),
                checkin=date(2026, 5, 1),
                checkout=date(2026, 5, 2),
            )

    async def test_subtotal_quantizes_to_two_decimals(self, mock_rate_plan_repo):
        rate_plan_id = uuid4()
        mock_rate_plan_repo.get_by_id.return_value = _active_plan()
        # Percent-discount math may yield 3+ decimals at the SQL level.
        mock_rate_plan_repo.get_pricing.return_value = [
            _row(date(2026, 5, 1), Decimal("100.00"), effective=Decimal("83.333")),
            _row(date(2026, 5, 2), Decimal("100.00"), effective=Decimal("83.333")),
        ]

        uc = GetRatePlanPricingUseCase(mock_rate_plan_repo)
        result = await uc.execute(
            rate_plan_id=rate_plan_id,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 3),
        )

        # Per-night quantize-then-sum to avoid drift.
        assert result.nights[0].price == Decimal("83.33")
        assert result.subtotal == Decimal("166.66")
