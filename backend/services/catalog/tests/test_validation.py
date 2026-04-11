"""Tests for API validation and error handling."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.application.exceptions import PropertyNotFoundError
from app.schemas.common import PaginatedResponse


def _make_detail_response(pid):
    """Minimal valid PropertyDetailResponse dict for API wiring tests."""
    return {
        "detail": {
            "id": str(pid),
            "hotel_id": str(uuid4()),
            "name": "Test Hotel",
            "description": "Desc",
            "city": {"id": str(uuid4()), "name": "City", "department": None, "country": "MX"},
            "address": "123 Main St",
            "rating_avg": "4.5",
            "review_count": 10,
            "popularity_score": "80.0",
            "default_cancellation_policy": None,
            "images": [],
            "amenities": [],
            "policies": [],
            "room_types": [],
        },
        "reviews": {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 10,
            "total_pages": 0,
            "message": None,
        },
    }


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
        """checkin, checkout, guests, and city_id are required."""
        resp = client.get("/api/v1/catalog/properties")
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_omit_city_id_returns_422(self, mock_factory, client):
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
    def test_guests_negative_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=-3&city_id={cid}"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_guests_non_numeric_returns_422(self, mock_factory, client):
        cid = uuid4()
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=not-a-number&city_id={cid}"
        )
        assert resp.status_code == 422

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_city_id_forwarded_to_use_case_when_present(self, mock_factory, client):
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

    @patch("app.adapters.inbound.api.properties.get_search_use_case")
    def test_guests_forwarded_to_use_case(self, mock_factory, client):
        city_id = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = PaginatedResponse(
            items=[], total=0, page=1, page_size=20, total_pages=0, message=None
        )
        mock_factory.return_value = mock_uc
        resp = client.get(
            f"/api/v1/catalog/properties?checkin=2026-04-01&checkout=2026-04-05&guests=5&city_id={city_id}"
        )
        assert resp.status_code == 200
        assert mock_uc.execute.call_args.kwargs["guests"] == 5


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

    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_valid_request_returns_200_with_detail_and_reviews(self, mock_factory, client):
        """Happy path: use case returns dict → endpoint serialises to 200."""
        pid = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _make_detail_response(pid)
        mock_factory.return_value = mock_uc

        resp = client.get(f"/api/v1/catalog/properties/{pid}")

        assert resp.status_code == 200
        body = resp.json()
        assert "detail" in body
        assert "reviews" in body
        assert body["detail"]["name"] == "Test Hotel"

    @patch("app.adapters.inbound.api.properties.get_detail_use_case")
    def test_checkin_checkout_forwarded_to_use_case(self, mock_factory, client):
        """Date params should be passed through to the use case."""
        pid = uuid4()
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _make_detail_response(pid)
        mock_factory.return_value = mock_uc

        resp = client.get(
            f"/api/v1/catalog/properties/{pid}?checkin=2026-06-01&checkout=2026-06-05"
        )

        assert resp.status_code == 200
        call_kwargs = mock_uc.execute.call_args.kwargs
        assert str(call_kwargs["checkin"]) == "2026-06-01"
        assert str(call_kwargs["checkout"]) == "2026-06-05"


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
