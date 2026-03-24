"""Tests for SCRUM-110: featured properties and destinations endpoints."""

from unittest.mock import AsyncMock, patch

from app.schemas.city import FeaturedDestinationOut
from app.schemas.property import PropertySummary
from tests.conftest import make_property_summary


class TestFeaturedProperties:
    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_returns_list(self, mock_factory, client):
        """Should return a list of PropertySummary ordered by popularity."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            PropertySummary.model_validate(make_property_summary()),
            PropertySummary.model_validate(make_property_summary(name="Hotel Luna")),
        ]
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/properties/featured")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "Sol Caribe Cancún"
        assert data[0]["min_price"] == "120.00"
        assert data[0]["image"] is not None

    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_respects_limit(self, mock_factory, client):
        """Should pass limit param to use case."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        client.get("/api/v1/catalog/properties/featured?limit=5")
        mock_uc.execute.assert_called_once_with(limit=5)

    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_default_limit_10(self, mock_factory, client):
        """Should default to limit=10."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        client.get("/api/v1/catalog/properties/featured")
        mock_uc.execute.assert_called_once_with(limit=10)

    @patch("app.adapters.inbound.api.properties.get_featured_use_case")
    def test_empty_results(self, mock_factory, client):
        """Should return empty list when no featured properties."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/properties/featured")
        assert resp.status_code == 200
        assert resp.json() == []


class TestFeaturedDestinations:
    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_returns_cities_with_images(self, mock_factory, client):
        """Should return cities with image_url, name, country."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            FeaturedDestinationOut(
                id="bbbe56fe-8f4b-4498-a876-396a342d3615",
                name="CANCÚN",
                department="QUINTANA ROO",
                country="MÉXICO",
                image_url="https://example.com/cancun.jpg",
            )
        ]
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/destinations/featured")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "CANCÚN"
        assert data[0]["image_url"] == "https://example.com/cancun.jpg"
        assert data[0]["country"] == "MÉXICO"

    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_respects_limit(self, mock_factory, client):
        """Should pass limit param to use case."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        client.get("/api/v1/catalog/destinations/featured?limit=6")
        mock_uc.execute.assert_called_once_with(limit=6)

    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_default_limit_4(self, mock_factory, client):
        """Should default to limit=4."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        client.get("/api/v1/catalog/destinations/featured")
        mock_uc.execute.assert_called_once_with(limit=4)

    @patch("app.adapters.inbound.api.properties.get_featured_destinations_use_case")
    def test_empty_results(self, mock_factory, client):
        """Should return empty list when no featured destinations."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/destinations/featured")
        assert resp.status_code == 200
        assert resp.json() == []
