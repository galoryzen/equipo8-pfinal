"""GET /api/v1/booking/dashboard/bookings-metrics — hotel Bookings tab aggregates."""

from unittest.mock import AsyncMock
from uuid import UUID

from app.adapters.inbound.api.dependencies import (
    get_current_user_info,
    get_hotel_bookings_metrics_use_case,
)
from app.main import app
from fastapi.testclient import TestClient

HOTEL_ID = UUID("e0000000-0000-0000-0000-000000000099")


def test_hotel_role_returns_json_with_expected_keys():
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "confirmed_count": 5,
        "pending_count": 2,
        "check_ins_today_count": 1,
        "cancelled_count": 3,
    }
    app.dependency_overrides[get_hotel_bookings_metrics_use_case] = lambda: mock_uc
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "a0000000-0000-0000-0000-000000000001",
        "hotel_id": str(HOTEL_ID),
    }
    try:
        with TestClient(app) as client:
            resp = client.get("/api/v1/booking/dashboard/bookings-metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data == {
            "confirmedCount": 5,
            "pendingCount": 2,
            "checkInsTodayCount": 1,
            "cancelledCount": 3,
        }
        mock_uc.execute.assert_awaited_once_with(hotel_id=HOTEL_ID)
    finally:
        app.dependency_overrides.clear()


def test_traveler_forbidden():
    mock_uc = AsyncMock()
    app.dependency_overrides[get_hotel_bookings_metrics_use_case] = lambda: mock_uc
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "TRAVELER",
        "user_id": "a0000000-0000-0000-0000-000000000001",
        "hotel_id": None,
    }
    try:
        with TestClient(app) as client:
            resp = client.get("/api/v1/booking/dashboard/bookings-metrics")
        assert resp.status_code == 403
        mock_uc.execute.assert_not_called()
    finally:
        app.dependency_overrides.clear()
