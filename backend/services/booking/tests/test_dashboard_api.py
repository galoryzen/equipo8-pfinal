from unittest.mock import AsyncMock

from app.adapters.inbound.api.dependencies import get_hotel_dashboard_metrics_use_case
from app.main import app


def test_metrics_forbidden_for_traveler(client_authenticated):
    resp = client_authenticated.get(
        "/api/v1/dashboard/metrics",
        params={"from": "2026-01-01", "to": "2026-01-31"},
    )
    assert resp.status_code == 403


def test_metrics_ok_for_hotel_partner():
    from fastapi.testclient import TestClient

    from app.adapters.inbound.api.dependencies import get_current_user_info

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = {
        "metrics": {
            "totalBookings": {"value": 1, "variation": 0.0},
            "revenue": {"value": 10.0, "variation": 0.0},
            "occupancyRate": {"value": 25.0, "variation": 0.0},
            "averageRating": {"value": None, "variation": 0.0},
        },
        "activeCancellations": 2,
        "availableRooms": 12.5,
        "bookingTrends": [{"date": "2026-04-01", "bookings": 1}],
        "recentActivity": [
            {
                "type": "BOOKING_CONFIRMED",
                "description": "Reserva confirmada",
                "timestamp": "2026-04-01T10:00:00",
            }
        ],
        "upcomingCheckins": [
            {
                "guest": "Maria",
                "roomType": "Suite",
                "checkIn": "2026-04-05",
                "checkOut": "2026-04-07",
                "status": "CONFIRMED",
                "amount": 250.0,
            }
        ],
    }

    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "HOTEL",
        "user_id": "b0000000-0000-0000-0000-000000000001",
    }
    app.dependency_overrides[get_hotel_dashboard_metrics_use_case] = lambda: mock_uc
    try:
        with TestClient(app) as client:
            r = client.get(
                "/api/v1/dashboard/metrics",
                params={"from": "2026-04-01", "to": "2026-04-30"},
            )
        assert r.status_code == 200
        body = r.json()
        assert body["metrics"]["totalBookings"]["value"] == 1
        assert "variation" in body["metrics"]["revenue"]
        assert body["activeCancellations"] == 2
        assert body["bookingTrends"][0]["bookings"] == 1
        assert body["recentActivity"][0]["type"] == "BOOKING_CONFIRMED"
        assert body["upcomingCheckins"][0]["roomType"] == "Suite"
    finally:
        app.dependency_overrides.clear()
