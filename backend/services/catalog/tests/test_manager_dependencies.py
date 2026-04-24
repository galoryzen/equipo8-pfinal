"""Tests for manager-related FastAPI dependencies (booking client integration)."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.adapters.inbound.api.dependencies import get_booking_property_stats


class TestGetBookingPropertyStats:
    @pytest.mark.asyncio
    async def test_returns_json_on_200(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {"active_bookings": 4, "monthly_revenue": 1500.25}
        client = AsyncMock()
        client.get = AsyncMock(return_value=resp)

        with patch("app.adapters.inbound.api.dependencies._get_booking_http_client", return_value=client):
            out = await get_booking_property_stats(uuid4())

        assert out == {"active_bookings": 4, "monthly_revenue": 1500.25}

    @pytest.mark.asyncio
    async def test_returns_zeros_on_non_200(self):
        resp = MagicMock()
        resp.status_code = 404
        client = AsyncMock()
        client.get = AsyncMock(return_value=resp)

        with patch("app.adapters.inbound.api.dependencies._get_booking_http_client", return_value=client):
            out = await get_booking_property_stats(uuid4())

        assert out == {"active_bookings": 0, "monthly_revenue": 0.0}

    @pytest.mark.asyncio
    async def test_returns_zeros_when_request_raises(self):
        client = AsyncMock()
        client.get = AsyncMock(side_effect=OSError("network"))

        with patch("app.adapters.inbound.api.dependencies._get_booking_http_client", return_value=client):
            out = await get_booking_property_stats(uuid4())

        assert out == {"active_bookings": 0, "monthly_revenue": 0.0}
