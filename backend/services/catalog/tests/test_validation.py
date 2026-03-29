"""Tests for API validation and error handling."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.application.exceptions import PropertyNotFoundError
from app.schemas.common import PaginatedResponse


class TestFeaturedPropertiesValidation:
    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_limit_below_minimum_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/properties/featured?limit=0")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_limit_above_maximum_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/properties/featured?limit=51")
        assert resp.status_code == 422


class TestFeaturedDestinationsValidation:
    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_limit_below_minimum_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/destinations/featured?limit=0")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_limit_above_maximum_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/destinations/featured?limit=21")
        assert resp.status_code == 422


class TestSearchPropertiesValidation:
    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_missing_required_params_returns_422(self, mock_factory, client):
        """checkin, checkout, guests, city_id are required."""
        resp = client.get("/api/v1/catalog/properties")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_missing_city_id_returns_422(self, mock_factory, client):
        resp = client.get(
            "/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_checkout_before_checkin_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-05&checkout=2026-04-01&guests=2&city_id={cid}"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_invalid_sort_by_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2&city_id={cid}&sort_by=invalid"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_negative_price_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2&city_id={cid}&min_price=-10"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_min_price_greater_than_max_price_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2&city_id={cid}"
            "&min_price=300&max_price=100"
        )
        assert resp.status_code == 422
        assert "min_price must be less than or equal to max_price" in resp.json()["detail"]

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_equal_min_and_max_price_is_valid(self, mock_factory, client):
        cid = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = PaginatedResponse(
            items=[], total=0, page=1, page_size=20, total_pages=0, message=None
        )
        mock_factory.return_value = mock_uc
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2&city_id={cid}"
            "&min_price=100&max_price=100"
        )
        assert resp.status_code == 200

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_guests_below_1_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=0&city_id={cid}"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_city_id_required_and_forwarded_to_use_case(self, mock_factory, client):
        city_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = PaginatedResponse(
            items=[], total=0, page=1, page_size=20, total_pages=0, message=None
        )
        mock_factory.return_value = mock_uc
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=2&city_id={city_id}"
        )
        assert resp.status_code == 200
        mock_uc.execute.assert_called_once()
        assert mock_uc.execute.call_args.kwargs["city_id"] == city_id


class TestPropertyDetailValidation:
    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_invalid_uuid_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/properties/not-a-uuid")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_checkout_before_checkin_returns_422(self, mock_factory, client):
        pid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties/{pid}?checkin=2026-04-05&checkout=2026-04-01"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_property_not_found_returns_404(self, mock_factory, client):
        """PropertyNotFoundError should map to 404 with standard error body."""
        pid = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PropertyNotFoundError(pid)
        mock_factory.return_value = mock_uc

        resp = client.get(f"/api/v1/catalog/properties/{pid}")

        assert resp.status_code == 404
        body = resp.json()
        assert body["code"] == "PROPERTY_NOT_FOUND"
        assert str(pid) in body["message"]

    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_404_includes_trace_id(self, mock_factory, client):
        """Error response should echo the x-request-id header."""
        pid = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PropertyNotFoundError(pid)
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/properties/{pid}",
            headers={"x-request-id": "trace-abc-123"},
        )

        assert resp.status_code == 404
        assert resp.json()["trace_id"] == "trace-abc-123"


class TestCitiesValidation:
    @patch("app.adapters.inbound.api.properties.get_search_cities_use_case")
    def test_query_too_short_returns_422(self, mock_factory, client):
        """Query must be at least 2 characters."""
        resp = client.get("/api/v1/catalog/cities?q=a")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_cities_use_case")
    def test_missing_query_returns_422(self, mock_factory, client):
        resp = client.get("/api/v1/catalog/cities")
        assert resp.status_code == 422