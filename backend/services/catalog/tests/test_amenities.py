"""Tests for amenities listing endpoint."""

from unittest.mock import AsyncMock, patch

from app.schemas.property import AmenitySummary


class TestListAmenities:
    @patch("app.adapters.inbound.api.properties.get_list_amenities_use_case")
    def test_returns_list(self, mock_factory, client):
        """Should return a list of AmenitySummary."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            AmenitySummary(code="breakfast", name="Desayuno incluido"),
            AmenitySummary(code="wifi", name="Wi-Fi gratuito"),
        ]
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/amenities")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["code"] == "breakfast"
        assert data[1]["code"] == "wifi"

    @patch("app.adapters.inbound.api.properties.get_list_amenities_use_case")
    def test_empty_results(self, mock_factory, client):
        """Should return empty list when no amenities exist."""
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        mock_factory.return_value = mock_uc

        resp = client.get("/api/v1/catalog/amenities")
        assert resp.status_code == 200
        assert resp.json() == []
