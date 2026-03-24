"""Tests for SCRUM-110: featured properties and destinations endpoints."""

from unittest.mock import AsyncMock, patch

from tests.conftest import make_property_summary


class TestFeaturedProperties:
    @patch("app.adapters.inbound.api.properties.get_property_repository")
    def test_returns_list(self, mock_repo_factory, client):
        """Should return a list of PropertySummary ordered by popularity."""
        mock_repo = AsyncMock()
        mock_repo.search_featured.return_value = [
            make_property_summary(),
            make_property_summary(name="Hotel Luna"),
        ]
        mock_repo_factory.return_value = mock_repo

        resp = client.get("/api/v1/catalog/properties/featured")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "Sol Caribe Cancún"
        assert data[0]["min_price"] == "120.00"
        assert data[0]["image"] is not None

    @patch("app.adapters.inbound.api.properties.get_property_repository")
    def test_respects_limit(self, mock_repo_factory, client):
        """Should pass limit param to repository."""
        mock_repo = AsyncMock()
        mock_repo.search_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        client.get("/api/v1/catalog/properties/featured?limit=5")
        mock_repo.search_featured.assert_called_once_with(limit=5)

    @patch("app.adapters.inbound.api.properties.get_property_repository")
    def test_default_limit_10(self, mock_repo_factory, client):
        """Should default to limit=10."""
        mock_repo = AsyncMock()
        mock_repo.search_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        client.get("/api/v1/catalog/properties/featured")
        mock_repo.search_featured.assert_called_once_with(limit=10)

    @patch("app.adapters.inbound.api.properties.get_property_repository")
    def test_empty_results(self, mock_repo_factory, client):
        """Should return empty list when no featured properties."""
        mock_repo = AsyncMock()
        mock_repo.search_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        resp = client.get("/api/v1/catalog/properties/featured")
        assert resp.status_code == 200
        assert resp.json() == []


class TestFeaturedDestinations:
    @patch("app.adapters.inbound.api.properties.get_city_repository")
    def test_returns_cities_with_images(self, mock_repo_factory, client):
        """Should return cities with image_url, name, country."""
        mock_city = AsyncMock()
        mock_city.id = "bbbe56fe-8f4b-4498-a876-396a342d3615"
        mock_city.name = "CANCÚN"
        mock_city.department = "QUINTANA ROO"
        mock_city.country = "MÉXICO"
        mock_city.image_url = "https://example.com/cancun.jpg"

        mock_repo = AsyncMock()
        mock_repo.get_featured.return_value = [mock_city]
        mock_repo_factory.return_value = mock_repo

        resp = client.get("/api/v1/catalog/destinations/featured")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "CANCÚN"
        assert data[0]["image_url"] == "https://example.com/cancun.jpg"
        assert data[0]["country"] == "MÉXICO"

    @patch("app.adapters.inbound.api.properties.get_city_repository")
    def test_respects_limit(self, mock_repo_factory, client):
        """Should pass limit param to repository."""
        mock_repo = AsyncMock()
        mock_repo.get_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        client.get("/api/v1/catalog/destinations/featured?limit=6")
        mock_repo.get_featured.assert_called_once_with(limit=6)

    @patch("app.adapters.inbound.api.properties.get_city_repository")
    def test_default_limit_4(self, mock_repo_factory, client):
        """Should default to limit=4."""
        mock_repo = AsyncMock()
        mock_repo.get_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        client.get("/api/v1/catalog/destinations/featured")
        mock_repo.get_featured.assert_called_once_with(limit=4)

    @patch("app.adapters.inbound.api.properties.get_city_repository")
    def test_empty_results(self, mock_repo_factory, client):
        """Should return empty list when no featured destinations."""
        mock_repo = AsyncMock()
        mock_repo.get_featured.return_value = []
        mock_repo_factory.return_value = mock_repo

        resp = client.get("/api/v1/catalog/destinations/featured")
        assert resp.status_code == 200
        assert resp.json() == []
