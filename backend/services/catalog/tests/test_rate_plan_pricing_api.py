"""API smoke tests for GET /rate-plans/{id}/pricing."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.application.exceptions import (
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)
from app.schemas.rate_plan import NightPriceOut, RatePlanPricingOut


class TestRatePlanPricingEndpoint:
    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_returns_pricing_breakdown(self, mock_factory, client):
        rate_plan_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = RatePlanPricingOut(
            rate_plan_id=rate_plan_id,
            currency_code="USD",
            nights=[
                NightPriceOut(day=date(2026, 5, 1), price=Decimal("140.00")),
                NightPriceOut(day=date(2026, 5, 2), price=Decimal("150.00")),
            ],
            subtotal=Decimal("290.00"),
            taxes=Decimal("29.00"),
            service_fee=Decimal("14.50"),
            total=Decimal("333.50"),
        )
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/rate-plans/{rate_plan_id}/pricing"
            "?checkin=2026-05-01&checkout=2026-05-03"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["currency_code"] == "USD"
        assert body["subtotal"] == "290.00"
        assert len(body["nights"]) == 2
        assert body["nights"][0]["price"] == "140.00"
        assert body["nights"][1]["price"] == "150.00"
        assert body["taxes"] == "29.00"
        assert body["service_fee"] == "14.50"
        assert body["total"] == "333.50"

    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_checkout_before_checkin_returns_422(self, mock_factory, client):
        resp = client.get(
            f"/api/v1/catalog/rate-plans/{uuid4()}/pricing"
            "?checkin=2026-05-03&checkout=2026-05-01"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_checkout_equal_checkin_returns_422(self, mock_factory, client):
        resp = client.get(
            f"/api/v1/catalog/rate-plans/{uuid4()}/pricing"
            "?checkin=2026-05-01&checkout=2026-05-01"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_unknown_rate_plan_returns_404(self, mock_factory, client):
        rate_plan_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = RatePlanNotFoundError(rate_plan_id)
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/rate-plans/{rate_plan_id}/pricing"
            "?checkin=2026-05-01&checkout=2026-05-02"
        )
        assert resp.status_code == 404
        assert resp.json()["code"] == "RATE_PLAN_NOT_FOUND"

    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_calendar_gap_returns_409(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = RateUnavailableError([date(2026, 5, 2)])
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/rate-plans/{uuid4()}/pricing"
            "?checkin=2026-05-01&checkout=2026-05-03"
        )
        assert resp.status_code == 409
        body = resp.json()
        assert body["code"] == "RATE_UNAVAILABLE"
        assert body["missing_days"] == ["2026-05-02"]

    @patch("app.adapters.inbound.api.rate_plans.get_rate_plan_pricing_use_case")
    def test_multi_currency_returns_422(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = RateCurrencyMismatchError(["EUR", "USD"])
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/rate-plans/{uuid4()}/pricing"
            "?checkin=2026-05-01&checkout=2026-05-03"
        )
        assert resp.status_code == 422
        body = resp.json()
        assert body["code"] == "RATE_CURRENCY_MISMATCH"
        assert body["currencies"] == ["EUR", "USD"]
